/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. */
// Pantalla «Hoyo N» (dibujo aprobado por Carlos, 23-nov-2026): foto aérea del campo, salida (T), green, punto dorado
// que se arrastra y dos distancias en metros. Foto: IGN España (PNOA), licencia CC BY 4.0, con su mención a pie de mapa.
// Salidas y greens: tablas hole_tees y hole_greens. Solo un administrador puede colocar salidas.
(function(){
  'use strict';
  const IGN = 'https://www.ign.es/wmts/pnoa-ma?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=OI.OrthoimageCoverage&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg';
  // PRUEBA PILOTO (Carlos, 24-nov): el mapa del hoyo solo sale en estos campos. Para abrirlo a otros, se añade su código aquí.
  const PILOTO = ['hato-verde'];
  const CRED = 'Ortofoto © IGN España (PNOA) · CC BY 4.0 scne.es';
  let gpsPos = null, gpsId = null, ajustado = null, obstAviso = '', mapaVacio = false, ov = null, mapa = null, capa = null, hoyo = 1, campo = null, pts = {}, colocando = false, punto = null, obst = {};
  const TIPOS = { bunker: ['🏖', 'Bunker'], agua: ['💧', 'Agua'], arbol: ['🌳', 'Árbol'], fuera: ['⛔', 'Fuera de límites'] };
  const $ = id => document.getElementById(id);
  const dist = (a, b) => (typeof metersBetween === 'function') ? metersBetween(a, b) : Math.hypot(a.lat - b.lat, a.lng - b.lng) * 111000;
  const cliente = () => { try { return typeof initSupabase === 'function' ? initSupabase() : null; } catch(e){ return null; } };

  function cargarLeaflet(){
    if(window.L) return Promise.resolve();
    return new Promise((ok, mal) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
      const js = document.createElement('script'); js.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; js.onload = () => ok(); js.onerror = () => mal(new Error('leaflet')); document.head.appendChild(js);
    });
  }

  async function cargarPuntos(){
    pts = {}; const c = cliente(); if(!c || !campo) return;
    try {
      const [g, t] = await Promise.all([
        c.from('hole_greens').select('hole, lat, lng').eq('course_id', campo.id),
        c.from('hole_tees').select('hole, lat, lng').eq('course_id', campo.id)]);
      (g.data || []).forEach(r => { (pts[r.hole] = pts[r.hole] || {}).green = { lat: r.lat, lng: r.lng }; });
      (t.data || []).forEach(r => { (pts[r.hole] = pts[r.hole] || {}).tee = { lat: r.lat, lng: r.lng }; });
    } catch(e){ /* sin conexión */ }
    obst = {};
    try {
      const o = await c.from('hole_obstacles').select('id, hole, tipo, lat, lng').eq('course_id', campo.id);
      (o.data || []).forEach(r => { (obst[r.hole] = obst[r.hole] || []).push(r); });
    } catch(e){ /* sin obstáculos */ }
  }

  function construir(){
    ov = document.createElement('div'); ov.id = 'mhOv'; ov.className = 'mh-ov'; ov.hidden = true;
    ov.innerHTML = '<div id="mhMapa" class="mh-mapa"></div>'
      + '<button type="button" class="mh-atras" id="mhAtras" aria-label="Volver">‹</button>'
      + '<div class="mh-adms"><button type="button" class="mh-adm" id="mhObst" hidden>+ Obstáculo</button><button type="button" class="mh-adm" id="mhSalida" hidden>Colocar la salida</button>'
      + '<button type="button" class="mh-adm" id="mhGreen" hidden>Colocar el green</button></div>'
      + '<div class="mh-aviso" id="mhAviso" hidden></div>'
      + '<div class="mh-hoja"><button type="button" class="mh-flecha" id="mhAnt" aria-label="Hoyo anterior">‹</button>'
      + '<div class="mh-tit"><h1 id="mhH">Hoyo 1</h1><p id="mhP"></p><p class="mh-ol" id="mhOL" hidden></p><div class="mh-tipos" id="mhTipos" hidden></div><button type="button" class="mh-gps" id="mhGps">📍 Activar mi posición</button></div>'
      + '<button type="button" class="mh-flecha" id="mhSig" aria-label="Hoyo siguiente">›</button></div>';
    document.body.appendChild(ov);
    $('mhAtras').onclick = cerrar;
    $('mhGps').onclick = activarGps;
    $('mhAnt').onclick = () => ir(hoyo - 1); $('mhSig').onclick = () => ir(hoyo + 1);
    $('mhObst').onclick = elegirObst;
    $('mhSalida').onclick = () => { colocando = colocando === 'tee' ? false : 'tee'; aviso(colocando ? 'Toca en el mapa donde está la salida' : ''); };
    $('mhGreen').onclick = () => { colocando = colocando === 'green' ? false : 'green'; aviso(colocando ? 'Toca en el mapa donde está el centro del green' : ''); };
  }
  function aviso(t){ const a = $('mhAviso'); if(!a) return; a.textContent = t || ''; a.hidden = !t; }
  const par = h => (campo && campo.par && campo.par[h - 1]) || '';
  const hayHoyos = () => (campo && campo.par ? campo.par.length : 18);

  function etiqueta(m){ return L.divIcon({ className: 'mh-dist', html: '<span>' + Math.round(m) + ' m</span>', iconSize: [0, 0] }); }
  function mitad(a, b){ return [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2]; }

  function pintar(){
    if(!mapa) return;
    if(capa) capa.remove(); capa = L.layerGroup().addTo(mapa);
    const p = pts[hoyo] || {}; const g = p.green, t = p.tee;
    $('mhH').textContent = 'Hoyo ' + hoyo;
    $('mhP').textContent = 'Par ' + par(hoyo) + (g && t ? ' · ' + Math.round(dist(t, g)) + ' m' : '');
    $('mhAnt').disabled = hoyo <= 1; $('mhSig').disabled = hoyo >= hayHoyos();
    const adm = !!(window.miPerfil && window.miPerfil.es_admin); $('mhSalida').hidden = !adm; $('mhObst').hidden = !adm; $('mhGreen').hidden = !(window.miPerfil && window.miPerfil.es_super);
    if(!g){ aviso(colocando ? 'Toca en el mapa donde está el centro del green' : 'Este hoyo todavía no tiene el green colocado'); return; }
    if(!colocando) aviso(t || adm ? '' : 'Este hoyo todavía no tiene la salida colocada');
    const verde = L.divIcon({ className: 'mh-pin mh-green', html: '⚑', iconSize: [34, 34], iconAnchor: [17, 17] });
    L.marker([g.lat, g.lng], { icon: verde, interactive: false }).addTo(capa);
    pintarObst(g);
    $('mhOL').textContent = obstAviso; $('mhOL').hidden = !obstAviso;
    // Con el GPS activo y cerca del campo: tu posición, una sola línea al green y la distancia grande
    const cerca = gpsPos && dist(gpsPos, g) <= 2000;
    $('mhGps').hidden = gpsId !== null;
    if(gpsPos && !cerca){ aviso('Estás lejos del campo'); }
    if(cerca){
      const me = L.latLng(gpsPos.lat, gpsPos.lng), m = Math.round(dist(gpsPos, g));
      if(t) L.marker([t.lat, t.lng], { icon: L.divIcon({ className: 'mh-pin mh-t', html: 'T', iconSize: [34, 34], iconAnchor: [17, 17] }), interactive: false }).addTo(capa);
      L.polyline([me, [g.lat, g.lng]], { color: '#fff', weight: 3 }).addTo(capa);
      L.marker(me, { icon: L.divIcon({ className: 'mh-pin mh-yo', html: '', iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false }).addTo(capa);
      L.marker(mitad(gpsPos, g), { icon: L.divIcon({ className: 'mh-dist mh-grande', html: '<span>' + m + ' m</span>', iconSize: [0, 0] }), interactive: false }).addTo(capa);
      $('mhP').textContent = 'Par ' + par(hoyo) + ' · ' + m + ' m al green';
      const clave = campo.id + '|' + hoyo;
      if(ajustado !== clave){ ajustado = clave; mapa.fitBounds(L.latLngBounds([me, [g.lat, g.lng]]).pad(0.5), { animate: false, paddingBottomRight: [0, 140] }); }
      return;
    }
    const ini = t || { lat: g.lat - 0.0012, lng: g.lng };   // sin salida: el punto dorado parte de abajo para medir al green
    if(t) L.marker([t.lat, t.lng], { icon: L.divIcon({ className: 'mh-pin mh-t', html: 'T', iconSize: [34, 34], iconAnchor: [17, 17] }), interactive: false }).addTo(capa);
    const medio = { lat: (ini.lat + g.lat) / 2, lng: (ini.lng + g.lng) / 2 };
    const l1 = L.polyline([[ini.lat, ini.lng], [medio.lat, medio.lng]], { color: '#fff', weight: 3 }).addTo(capa);
    const l2 = L.polyline([[medio.lat, medio.lng], [g.lat, g.lng]], { color: '#fff', weight: 3 }).addTo(capa);
    const e1 = L.marker(mitad(ini, medio), { icon: etiqueta(dist(ini, medio)), interactive: false }).addTo(capa);
    const e2 = L.marker(mitad(medio, g), { icon: etiqueta(dist(medio, g)), interactive: false }).addTo(capa);
    punto = L.marker([medio.lat, medio.lng], { draggable: true, icon: L.divIcon({ className: 'mh-pin mh-oro', html: '', iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(capa);
    const mover = () => { const q = punto.getLatLng(), Q = { lat: q.lat, lng: q.lng };
      l1.setLatLngs([[ini.lat, ini.lng], [q.lat, q.lng]]); l2.setLatLngs([[q.lat, q.lng], [g.lat, g.lng]]);
      e1.setLatLng(mitad(ini, Q)).setIcon(etiqueta(dist(ini, Q))); e2.setLatLng(mitad(Q, g)).setIcon(etiqueta(dist(Q, g))); };
    punto.on('drag', mover);
    mapa.fitBounds(L.latLngBounds([[ini.lat, ini.lng], [g.lat, g.lng]]).pad(0.5), { animate: false, paddingBottomRight: [0, 140] });
  }


  // Obstáculos (dibujo aprobado por Carlos, 24-nov): bunker, agua, árbol, fuera de límites. Distancia desde tu posición (GPS) o, si no, desde la salida.
  function pintarObst(g){
    const lista = obst[hoyo] || [], t = (pts[hoyo] || {}).tee;
    const desde = (gpsPos && dist(gpsPos, g) <= 2000) ? gpsPos : t;
    const adm = !!(window.miPerfil && window.miPerfil.es_admin);
    const avisos = [];
    lista.forEach(o => {
      const tp = TIPOS[o.tipo] || TIPOS.bunker, m = desde ? Math.round(dist(desde, o)) : null;
      if(m !== null) avisos.push({ m, txt: tp[1] + ' a ' + m + ' m' });
      const ic = L.divIcon({ className: 'mh-ob', html: '<span><i>' + tp[0] + '</i>' + (m !== null ? tp[1] + ' ' + m + ' m' : tp[1]) + '</span>', iconSize: [0, 0] });
      const mk = L.marker([o.lat, o.lng], { icon: ic, interactive: adm }).addTo(capa);
      if(adm) mk.on('click', () => { if(window.confirm('¿Borrar este obstáculo (' + tp[1] + ')?')) borrarObst(o); });
    });
    avisos.sort((a, b) => a.m - b.m);
    obstAviso = avisos.length ? '⚠ ' + avisos.map(a => a.txt).join(' · ') : '';
  }
  function elegirObst(){
    if(typeof colocando === 'string' && colocando.indexOf('ob:') === 0){ colocando = false; aviso(''); return; }
    const d = $('mhTipos'); if(!d.hidden){ d.hidden = true; return; }
    d.innerHTML = Object.keys(TIPOS).map(k => '<button type="button" data-t="' + k + '">' + TIPOS[k][0] + ' ' + TIPOS[k][1] + '</button>').join('');
    d.hidden = false;
    d.onclick = e => { const b = e.target.closest('button'); if(!b) return; d.hidden = true; colocando = 'ob:' + b.dataset.t; aviso('Toca en el mapa donde está el obstáculo'); };
  }
  async function guardarObst(tipo, ll){
    const c = cliente(); if(!c) return;
    aviso('Guardando…');
    const r = await c.rpc('add_obstaculo', { p_course: campo.id, p_hole: hoyo, p_tipo: tipo, p_lat: ll.lat, p_lng: ll.lng });
    colocando = false;
    if(r.error || !r.data){ aviso('No se pudo guardar: solo lo puede hacer un administrador'); return; }
    (obst[hoyo] = obst[hoyo] || []).push({ id: r.data, hole: hoyo, tipo, lat: ll.lat, lng: ll.lng });
    pintar(); aviso('Obstáculo guardado'); setTimeout(() => pintar(), 1500);
  }
  async function borrarObst(o){
    const c = cliente(); if(!c) return;
    const r = await c.rpc('del_obstaculo', { p_id: o.id });
    if(r.error || r.data !== true){ aviso('No se pudo borrar'); return; }
    obst[hoyo] = (obst[hoyo] || []).filter(x => x.id !== o.id); pintar();
  }

  async function guardarSalida(ll){
    const c = cliente(); if(!c) return;
    aviso('Guardando la salida…');
    const r = await c.rpc('set_tee', { p_course: campo.id, p_hole: hoyo, p_lat: ll.lat, p_lng: ll.lng });
    colocando = false;
    if(r.error || r.data !== true){ aviso('No se pudo guardar: solo lo puede hacer un administrador'); return; }
    (pts[hoyo] = pts[hoyo] || {}).tee = { lat: ll.lat, lng: ll.lng }; aviso('Salida guardada'); setTimeout(() => aviso(''), 1800); pintar();
  }

  async function guardarGreen(ll){
    const c = cliente(); if(!c) return;
    aviso('Guardando el green…');
    const clave = (typeof getAdminKey === 'function') ? getAdminKey() : null;
    const r = await c.rpc('set_green', { p_key: clave, p_course: campo.id, p_hole: hoyo, p_lat: ll.lat, p_lng: ll.lng });
    colocando = false;
    if(r.error || r.data !== true){ aviso('No se pudo guardar: solo lo puede hacer el super administrador'); return; }
    (pts[hoyo] = pts[hoyo] || {}).green = { lat: ll.lat, lng: ll.lng }; aviso('Green guardado'); setTimeout(() => aviso(''), 1800); pintar();
  }

  function activarGps(){
    if(gpsId !== null) return;
    if(!navigator.geolocation){ aviso('Este móvil no deja usar el GPS'); return; }
    aviso('Buscando tu posición…');
    // Ahorro de batería (Carlos, 26-nov): se lee la posición una vez cada 30 segundos; entre lecturas el GPS descansa.
    const leer = () => navigator.geolocation.getCurrentPosition(
      pos => { gpsPos = { lat: pos.coords.latitude, lng: pos.coords.longitude }; if(ov && !ov.hidden){ if($('mhAviso').textContent === 'Buscando tu posición…') aviso(''); pintar(); } },
      () => { if(gpsPos) return; if(gpsId !== null) clearInterval(gpsId); gpsId = null; aviso('No pude ver tu posición. Revisa que el GPS esté activado y que la app tenga permiso.'); $('mhGps').hidden = false; },
      { enableHighAccuracy: true, maximumAge: 20000, timeout: 20000 });
    gpsId = setInterval(leer, 30000); leer();
    $('mhGps').hidden = true;
  }
  function paraGps(){ if(gpsId !== null) clearInterval(gpsId); gpsId = null; gpsPos = null; ajustado = null; }

  function ir(h){ if(h < 1 || h > hayHoyos()) return; hoyo = h; colocando = false; ajustado = null; pintar(); }

  // El campo de la partida, sea cual sea (norma de Carlos, 24-nov: todo vale para TODOS los campos).
  // Los códigos de 9 hoyos (-9 ida, -9v vuelta) se reducen al campo de 18 hoyos, que es donde se guardan los greens y las salidas.
  function campoActual(){
    const c = (typeof selectedCourse !== 'undefined') ? selectedCourse : null; if(!c || !c.id) return null;
    const id = String(c.id).replace(/-9v?$/, '');
    const base = (typeof COURSES !== 'undefined' ? COURSES.find(x => x.id === id) : null) || c;
    return { id, par: base.par || c.par || null, nombre: base.name || c.name || '' };
  }

  async function abrir(){
    campo = campoActual(); if(!campo) return;
    hoyo = (typeof currentHole !== 'undefined' && currentHole) ? currentHole : 1;
    if(typeof window.etqHoyo === 'function') hoyo = window.etqHoyo(hoyo);   // 9 hoyos por la vuelta: el hoyo 1 es el 10
    if(!ov) construir();
    ov.hidden = false; document.documentElement.classList.add('mh-abierto'); aviso('Cargando el mapa…');
    try { await cargarLeaflet(); } catch(e){ aviso('No se pudo cargar el mapa. Revisa la conexión.'); return; }
    await cargarPuntos();
    if(!Object.keys(pts).length){ aviso('Este campo todavía no tiene su mapa. En cuanto se coloquen los greens, aparecerá aquí.'); mapaVacio = true; $('mhAnt').disabled = true; $('mhSig').disabled = true; $('mhH').textContent = campo.nombre || 'Campo'; $('mhP').textContent = ''; return; }
    mapaVacio = false;
    if(!mapa){
      mapa = L.map('mhMapa', { zoomControl: false, attributionControl: true, maxZoom: 20 }).setView([37.565, -6.095], 17);
      L.tileLayer(IGN, { maxNativeZoom: 19, maxZoom: 20, attribution: CRED }).addTo(mapa);
      mapa.on('click', e => { if(colocando === 'tee') guardarSalida(e.latlng); else if(colocando === 'green') guardarGreen(e.latlng); else if(colocando && colocando.indexOf('ob:') === 0) guardarObst(colocando.slice(3), e.latlng); });
    }
    setTimeout(() => { mapa.invalidateSize(); pintar(); if(window.acgolfGpsOk && gpsId === null) activarGps(); }, 60);
  }
  function cerrar(){ paraGps(); if(ov) ov.hidden = true; document.documentElement.classList.remove('mh-abierto'); colocando = false; }

  // Botón de entrada propio, junto a la tarjeta del hoyo (no depende de que se vea la tarjeta de la distancia al green)
  function botones(){
    const ref = $('greenArriba') || $('holeViewSection'); if(!ref) return;
    let b = $('mhEntrada');
    if(!b){ b = document.createElement('div'); b.id = 'mhEntrada'; b.className = 'mh-entrada';
      b.innerHTML = '<button type="button" class="mh-abrir" id="mhAbrir"><i><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#E9CF8C" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></svg></i>Mapa del hoyo</button>'; b.firstChild.onclick = abrir; }
    if(!(b.parentNode && b.parentNode.id === 'cdFila') && b.nextElementSibling !== ref) ref.before(b);
    const k = campoActual();
    b.hidden = !(k && PILOTO.indexOf(k.id) >= 0) || (!!b.parentNode && b.parentNode.id === 'cdFila' && !window.acgolfGpsOk);
  }
  setInterval(botones, 1000);
  window.acgolfMapaHoyo = { abrir, cerrar, campoActual, piloto: PILOTO };
})();
