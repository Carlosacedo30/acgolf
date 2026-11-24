/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. */
// «Tu caddie dice…» (dibujo aprobado por Carlos, 24-nov-2026): una frase grande y limpia, leída (no hablada), con los obstáculos
// que tienes por delante en tu golpe. Con el GPS cuenta desde donde estás; sin GPS, desde la salida. Prueba piloto: Hato Verde.
(function(){
  'use strict';
  const TIPOS = { bunker: ['🏖', 'Bunker', 'el bunker'], agua: ['💧', 'Agua', 'el agua'], arbol: ['🌳', 'Árbol', 'un árbol'], fuera: ['⛔', 'Fuera de límites', 'el fuera de límites'] };
  const $ = id => document.getElementById(id);
  const dist = (a, b) => (typeof metersBetween === 'function') ? metersBetween(a, b) : Math.hypot(a.lat - b.lat, a.lng - b.lng) * 111000;
  const cliente = () => { try { return typeof initSupabase === 'function' ? initSupabase() : null; } catch(e){ return null; } };
  const mapaHoyo = () => window.acgolfMapaHoyo || null;
  let gpsOk = false, gpsMsg = '', datos = null, datosId = null, pos = null, gpsId = null, ov = null, hoyo = 1;

  async function cargar(id){
    if(datosId === id && datos) return;
    datos = { tee: {}, green: {}, obst: {} }; datosId = id;
    const c = cliente(); if(!c) return;
    try {
      const [g, t, o] = await Promise.all([
        c.from('hole_greens').select('hole, lat, lng').eq('course_id', id),
        c.from('hole_tees').select('hole, lat, lng').eq('course_id', id),
        c.from('hole_obstacles').select('id, hole, tipo, lat, lng').eq('course_id', id)]);
      (g.data || []).forEach(r => { datos.green[r.hole] = r; });
      (t.data || []).forEach(r => { datos.tee[r.hole] = r; });
      (o.data || []).forEach(r => { (datos.obst[r.hole] = datos.obst[r.hole] || []).push(r); });
    } catch(e){ /* sin conexión */ }
  }

  function frase(){
    const g = datos.green[hoyo], t = datos.tee[hoyo], lista = datos.obst[hoyo] || [];
    const cerca = pos && g && dist(pos, g) <= 2000;
    const desde = cerca ? pos : (t || null);
    let cab = '', notas = '';
    if(!g){ return { cab: '🧢 TU CADDIE · HOYO ' + hoyo, txt: 'Este hoyo todavía no tiene el green colocado.', sub: [] }; }
    if(cerca){ cab = (t && dist(pos, t) <= 60) ? 'Tu golpe de salida' : 'Tu segundo golpe'; }
    else { cab = 'Desde la salida'; if(pos && g) notas = 'Estás lejos del campo, así que cuento desde la salida.'; else if(!t) notas = 'Activa tu posición para que te cuente desde donde estás.'; }
    if(!desde){ return { cab: '🧢 TU CADDIE · HOYO ' + hoyo, txt: 'Activa tu posición para que te cuente los obstáculos.', sub: [] }; }
    const dG = dist(desde, g);
    const delante = lista.filter(o => dist(o, g) < dG + 5).map(o => ({ o, m: Math.round(dist(desde, o)) })).sort((a, b) => a.m - b.m);
    if(!delante.length){
      return { cab: cab + ' · hoyo ' + hoyo, txt: lista.length ? 'No tienes obstáculos por delante. Al green: <b>' + Math.round(dG) + ' m</b>' : 'Este hoyo no tiene obstáculos marcados. Al green: <b>' + Math.round(dG) + ' m</b>', sub: [], notas };
    }
    const p = delante[0], tp = TIPOS[p.o.tipo] || TIPOS.bunker;
    return { cab: cab + ' · hoyo ' + hoyo, txt: cab + ':<br>' + tp[2] + ' está a <b>' + p.m + ' m</b>' + (cerca ? ' de ti' : ''), sub: delante.slice(1, 4).map(x => (TIPOS[x.o.tipo] || TIPOS.bunker)[0] + ' ' + (TIPOS[x.o.tipo] || TIPOS.bunker)[1] + ' a ' + x.m + ' m'), notas };
  }

  function pintar(){
    if(!ov || ov.hidden || !datos) return;
    const f = frase();
    $('cdCab').textContent = '🧢 TU CADDIE · HOYO ' + hoyo;
    $('cdTxt').innerHTML = f.txt;
    $('cdSub').innerHTML = (f.sub || []).map(s => '<div class="cd-sub">' + s + '</div>').join('') + (f.notas ? '<div class="cd-nota">' + f.notas + '</div>' : '');
  }

  function empezarGps(){
    if(gpsId !== null || !navigator.geolocation) return;
    gpsId = navigator.geolocation.watchPosition(p => { pos = { lat: p.coords.latitude, lng: p.coords.longitude }; pintar(); }, () => { gpsId = null; pintar(); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  }
  function pararGps(){ if(gpsId !== null && navigator.geolocation) navigator.geolocation.clearWatch(gpsId); gpsId = null; }

  function construir(){
    ov = document.createElement('div'); ov.id = 'cdOv'; ov.className = 'cd-ov'; ov.hidden = true;
    ov.innerHTML = '<div class="cd-pop"><small id="cdCab"></small><p id="cdTxt" class="cd-txt"></p><div id="cdSub"></div>'
      + '<button type="button" class="cd-ok" id="cdOk">Entendido</button><button type="button" class="cd-mapa" id="cdMapa">🗺 Ver el mapa</button></div>';
    document.body.appendChild(ov);
    $('cdOk').onclick = cerrar;
    $('cdMapa').onclick = () => { cerrar(); const m = mapaHoyo(); if(m) m.abrir(); };
    ov.addEventListener('click', e => { if(e.target === ov) cerrar(); });
  }
  async function abrir(){
    const m = mapaHoyo(); const k = m && m.campoActual ? m.campoActual() : null; if(!k) return;
    hoyo = (typeof currentHole !== 'undefined' && currentHole) ? currentHole : 1;
    if(typeof window.etqHoyo === 'function') hoyo = window.etqHoyo(hoyo);
    if(!ov) construir();
    ov.hidden = false; $('cdTxt').textContent = 'Un momento…'; $('cdCab').textContent = '🧢 TU CADDIE'; $('cdSub').innerHTML = '';
    await cargar(k.id); pintar(); empezarGps();
  }
  function cerrar(){ pararGps(); if(ov) ov.hidden = true; }

  // Al empezar: un solo botón «Activar GPS para ver los obstáculos». Si aceptan, salen los dos botones (mapa y caddie).
  function activarAqui(){
    if(!navigator.geolocation){ gpsMsg = 'Este móvil no deja usar el GPS.'; boton(); return; }
    gpsMsg = 'Buscando tu posición…'; boton();
    navigator.geolocation.getCurrentPosition(
      p => { pos = { lat: p.coords.latitude, lng: p.coords.longitude }; gpsOk = true; window.acgolfGpsOk = true; gpsMsg = ''; try { sessionStorage.setItem('acgolfGpsObst', '1'); } catch(e){} boton(); },
      () => { gpsMsg = 'No pude ver tu posición. Revisa que el GPS esté activado y que la app tenga permiso.'; boton(); },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 });
  }
  try { if(sessionStorage.getItem('acgolfGpsObst') === '1'){ gpsOk = true; window.acgolfGpsOk = true; } } catch(e){}

  // Orden en pantalla (Carlos, 24-nov): al empezar, solo «Activar GPS» arriba. Ya jugando, los dos botones van al FINAL de la tarjeta.
  function alPrincipio(){
    try { const h = (typeof hoyoSalidaActual === 'function') ? hoyoSalidaActual() : 1; return !(typeof isHoleComplete === 'function' && isHoleComplete(h)); } catch(e){ return true; }
  }
  function boton(){
    const m = mapaHoyo(); const k = m && m.campoActual ? m.campoActual() : null;
    const ref = $('greenArriba') || $('holeViewSection'); if(!ref) return;
    const visible = !!(k && m.piloto && m.piloto.indexOf(k.id) >= 0);
    let b = $('cdEntrada');
    if(!b){ b = document.createElement('div'); b.id = 'cdEntrada'; b.className = 'cd-entrada';
      b.innerHTML = '<button type="button" class="cd-abrir"><i><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#E9CF8C" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15c0-5 2.800-8.500 7.200-8.500 3.200 0 5.500 1.800 6.300 4.500l.5 3"/><path d="M4 15c3.500 1.300 8.500 1.400 14 .5"/><path d="M18 13.300c2.400.5 3.800 1.600 4.200 3.200-3.200.2-6.500-.1-9.700-.8"/><path d="M11.200 6.500c-1.600 2.400-2 5.300-1.200 8.400"/></svg></i>Tu caddie dice…</button>'; b.firstChild.onclick = abrir; }
    let top = $('cdTop');
    if(!top){ top = document.createElement('div'); top.id = 'cdTop'; top.className = 'cd-fila cd-top';
      top.innerHTML = '<div class="cd-gate" id="cdGate"><button type="button" class="cd-gps"><i><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#E9CF8C" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.600-6.500-11a6.500 6.500 0 0 1 13 0c0 5.400-6.500 11-6.500 11z"/><circle cx="12" cy="10" r="2.300"/></svg></i>Activar GPS para ver los obstáculos</button><p class="cd-gmsg" id="cdGmsg"></p></div>';
      top.querySelector('.cd-gps').onclick = activarAqui; }
    let fila = $('cdFila');
    if(!fila){ fila = document.createElement('div'); fila.id = 'cdFila'; fila.className = 'cd-fila';
      fila.innerHTML = '<button type="button" class="cd-link" id="cdLink">📍 Activar GPS para ver los obstáculos</button>'; fila.querySelector('.cd-link').onclick = activarAqui; }
    const tira = $('tbTira');
    const sitioTop = tira || ref;
    if(tira ? top.nextElementSibling !== tira : top.previousElementSibling !== sitioTop){ tira ? tira.before(top) : sitioTop.after(top); }
    const fin = $('tbLeyenda') || tira || ref;
    if(fin.nextElementSibling !== fila){ fin.after(fila); }
    const me = $('mhEntrada');
    if(me && me.parentNode !== fila) fila.insertBefore(me, fila.firstChild);
    if(b.parentNode !== fila) fila.insertBefore(b, $('cdLink'));
    const inicio = alPrincipio();
    const dos = visible && gpsOk;
    top.hidden = !(visible && !gpsOk && inicio);
    b.hidden = !dos; if(me) me.hidden = !dos;
    $('cdLink').hidden = !(visible && !gpsOk && !inicio);
    fila.hidden = !visible || (!dos && inicio);
    $('cdGmsg').textContent = gpsMsg; $('cdGmsg').hidden = !gpsMsg;
  }
  setInterval(boton, 1000);
})();
