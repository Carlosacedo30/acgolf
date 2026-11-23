/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. */
// Pantalla «Hoyo N» (dibujo aprobado por Carlos, 23-nov-2026): foto aérea del campo, salida (T), green, punto dorado
// que se arrastra y dos distancias en metros. Foto: IGN España (PNOA), licencia CC BY 4.0, con su mención a pie de mapa.
// Salidas y greens: tablas hole_tees y hole_greens. Solo un administrador puede colocar salidas.
(function(){
  'use strict';
  const IGN = 'https://www.ign.es/wmts/pnoa-ma?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=OI.OrthoimageCoverage&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg';
  const CRED = 'Ortofoto © IGN España (PNOA) · CC BY 4.0 scne.es';
  let ov = null, mapa = null, capa = null, hoyo = 1, campo = null, pts = {}, colocando = false, punto = null;
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
  }

  function construir(){
    ov = document.createElement('div'); ov.id = 'mhOv'; ov.className = 'mh-ov'; ov.hidden = true;
    ov.innerHTML = '<div id="mhMapa" class="mh-mapa"></div>'
      + '<button type="button" class="mh-atras" id="mhAtras" aria-label="Volver">‹</button>'
      + '<div class="mh-adms"><button type="button" class="mh-adm" id="mhSalida" hidden>Colocar la salida</button>'
      + '<button type="button" class="mh-adm" id="mhGreen" hidden>Colocar el green</button></div>'
      + '<div class="mh-aviso" id="mhAviso" hidden></div>'
      + '<div class="mh-hoja"><button type="button" class="mh-flecha" id="mhAnt" aria-label="Hoyo anterior">‹</button>'
      + '<div class="mh-tit"><h1 id="mhH">Hoyo 1</h1><p id="mhP"></p></div>'
      + '<button type="button" class="mh-flecha" id="mhSig" aria-label="Hoyo siguiente">›</button></div>';
    document.body.appendChild(ov);
    $('mhAtras').onclick = cerrar;
    $('mhAnt').onclick = () => ir(hoyo - 1); $('mhSig').onclick = () => ir(hoyo + 1);
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
    const adm = !!(window.miPerfil && window.miPerfil.es_admin); $('mhSalida').hidden = !adm; $('mhGreen').hidden = !(window.miPerfil && window.miPerfil.es_super);
    if(!g){ aviso(colocando ? 'Toca en el mapa donde está el centro del green' : 'Este hoyo todavía no tiene el green colocado'); return; }
    if(!colocando) aviso(t || adm ? '' : 'Este hoyo todavía no tiene la salida colocada');
    const verde = L.divIcon({ className: 'mh-pin mh-green', html: '⚑', iconSize: [34, 34], iconAnchor: [17, 17] });
    L.marker([g.lat, g.lng], { icon: verde, interactive: false }).addTo(capa);
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

  function ir(h){ if(h < 1 || h > hayHoyos()) return; hoyo = h; colocando = false; pintar(); }

  // El campo de la partida: «Hato Verde» aunque la partida lo guarde con otro código o con el nombre escrito distinto
  function campoActual(){
    const c = (typeof selectedCourse !== 'undefined') ? selectedCourse : null; if(!c) return null;
    const hv = /hato\s*verde/i.test((c.name || '') + ' ' + (c.id || '')) || c.id === 'hato-verde';
    if(!hv) return { id: c.id, par: c.par || null, tieneGreens: false };
    const base = (typeof COURSES !== 'undefined' ? COURSES.find(x => x.id === 'hato-verde') : null) || {};
    return { id: 'hato-verde', par: c.par || base.par || null, tieneGreens: true };
  }
  async function abrir(){
    campo = campoActual(); if(!campo) return;
    hoyo = (typeof currentHole !== 'undefined' && currentHole) ? currentHole : 1;
    if(!ov) construir();
    ov.hidden = false; document.documentElement.classList.add('mh-abierto'); aviso('Cargando el mapa…');
    try { await cargarLeaflet(); } catch(e){ aviso('No se pudo cargar el mapa. Revisa la conexión.'); return; }
    await cargarPuntos();
    if(!mapa){
      mapa = L.map('mhMapa', { zoomControl: false, attributionControl: true, maxZoom: 20 }).setView([37.565, -6.095], 17);
      L.tileLayer(IGN, { maxNativeZoom: 19, maxZoom: 20, attribution: CRED }).addTo(mapa);
      mapa.on('click', e => { if(colocando === 'tee') guardarSalida(e.latlng); else if(colocando === 'green') guardarGreen(e.latlng); });
    }
    setTimeout(() => { mapa.invalidateSize(); pintar(); }, 60);
  }
  function cerrar(){ if(ov) ov.hidden = true; document.documentElement.classList.remove('mh-abierto'); colocando = false; }

  // Botón de entrada propio, junto a la tarjeta del hoyo (no depende de que se vea la tarjeta de la distancia al green)
  function botones(){
    const ref = $('greenArriba') || $('holeViewSection'); if(!ref) return;
    let b = $('mhEntrada');
    if(!b){ b = document.createElement('div'); b.id = 'mhEntrada'; b.className = 'mh-entrada';
      b.innerHTML = '<button type="button" class="mh-abrir" id="mhAbrir">🗺 Ver el hoyo en el mapa</button>'; b.firstChild.onclick = abrir; }
    if(b.nextElementSibling !== ref) ref.before(b);
    const k = campoActual();
    b.hidden = !(k && k.tieneGreens);
  }
  setInterval(botones, 1000);
  window.acgolfMapaHoyo = { abrir, cerrar };
})();
