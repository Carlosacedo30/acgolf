/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Greens en el mapa (solo administrador) ---
  // Coloca el centro de cada green desde casa, sin ir al campo:
  //  1) "Traer del mapa libre": busca en OpenStreetMap los hoyos y greens dibujados del campo y los asigna solos.
  //  2) Corregir a mano: eliges el hoyo y tocas el mapa (vista satélite), o arrastras el número.
  //  3) "Guardar": se guarda para todos con la misma función que usa "Guardar green aquí" (set_green).
  const GM_CAMPOS = {
    'hato-verde': { nombre: 'Hato Verde', busca: 'Hato Verde', centro: [37.565, -6.035] },
    'zaudin':     { nombre: 'Zaudín',     busca: 'Zaud',       centro: [37.378, -6.045] },
  };
  const GM_OVERPASS = 'https://overpass-api.de/api/interpreter';
  let gmMapa = null, gmCapa = null, gmCampo = 'hato-verde', gmHoyo = 1;
  let gmPuntos = {};    // hoyo -> { lat, lng, origen: 'guardado'|'mapa'|'mano' }
  let gmCambiados = new Set();

  function gmCargarLeaflet(){
    if(window.L) return Promise.resolve();
    return new Promise((ok, mal) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(css);
      const js = document.createElement('script');
      js.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      js.onload = () => ok(); js.onerror = () => mal(new Error('leaflet'));
      document.head.appendChild(js);
    });
  }

  function gmEstado(t){ const el = document.getElementById('gmEstado'); if(el) el.innerHTML = t; }

  function gmPintarHoyos(){
    const box = document.getElementById('gmHoyos'); if(!box) return;
    let h = '';
    for(let i = 1; i <= 18; i++){
      const p = gmPuntos[i];
      const cls = !p ? '' : (gmCambiados.has(i) ? ' nuevo' : ' ok');
      h += '<button type="button" class="gm-hoyo' + cls + (i === gmHoyo ? ' sel' : '') + '" data-h="' + i + '" aria-label="Hoyo ' + i + '">' + i + '</button>';
    }
    box.innerHTML = h;
    box.querySelectorAll('.gm-hoyo').forEach(b => b.addEventListener('click', ()=>{
      gmHoyo = +b.dataset.h; gmPintarHoyos();
      const p = gmPuntos[gmHoyo];
      if(p && gmMapa) gmMapa.setView([p.lat, p.lng], Math.max(gmMapa.getZoom(), 17));
      gmEstado('Hoyo <b>' + gmHoyo + '</b>: toca en el mapa el centro de su green' + (p ? ' (o arrastra el número)' : '') + '.');
    }));
    const n = Object.keys(gmPuntos).length;
    const g = document.getElementById('gmGuardar');
    if(g){ g.disabled = !gmCambiados.size; g.textContent = gmCambiados.size ? 'Guardar ' + gmCambiados.size + (gmCambiados.size === 1 ? ' green' : ' greens') : 'Nada que guardar'; }
    const r = document.getElementById('gmResumen'); if(r) r.textContent = n + ' de 18 greens colocados';
  }

  function gmPintarMarcas(){
    if(!gmMapa) return;
    if(gmCapa) gmCapa.remove();
    gmCapa = L.layerGroup().addTo(gmMapa);
    Object.keys(gmPuntos).forEach(k => {
      const h = +k, p = gmPuntos[h];
      const icon = L.divIcon({ className: 'gm-pin' + (gmCambiados.has(h) ? ' nuevo' : ''), html: '<span>' + h + '</span>', iconSize: [34, 34], iconAnchor: [17, 17] });
      const m = L.marker([p.lat, p.lng], { icon, draggable: true }).addTo(gmCapa);
      m.on('dragend', () => { const ll = m.getLatLng(); gmPuntos[h] = { lat: ll.lat, lng: ll.lng, origen: 'mano' }; gmCambiados.add(h); gmHoyo = h; gmPintarHoyos(); gmPintarMarcas(); });
      m.on('click', () => { gmHoyo = h; gmPintarHoyos(); });
    });
  }

  async function gmIrAlCampo(){
    const c = GM_CAMPOS[gmCampo];
    gmPuntos = {}; gmCambiados = new Set();
    // greens ya guardados en la app
    try {
      if(typeof loadHoleGreens === 'function'){ holeGreensLoadedFor = null; await loadHoleGreens(gmCampo); }
      for(let i = 1; i <= 18; i++){ const g = (typeof holeGreens !== 'undefined') && holeGreens[gmCampo + '|' + i]; if(g) gmPuntos[i] = { lat: g.lat, lng: g.lng, origen: 'guardado' }; }
    } catch(e){}
    const pts = Object.values(gmPuntos);
    if(pts.length){ gmMapa.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])).pad(0.25)); }
    else { gmMapa.setView(c.centro, 15); }
    gmHoyo = 1;
    gmPintarHoyos(); gmPintarMarcas();
    gmEstado(pts.length ? 'Ya hay ' + pts.length + ' greens guardados. Puedes traer los del mapa libre o corregirlos a mano.' : 'Pulsa «Traer del mapa libre» o elige un hoyo y toca su green en el mapa.');
    document.querySelectorAll('.gm-campo').forEach(b => b.classList.toggle('on', b.dataset.c === gmCampo));
  }

  // OpenStreetMap: busca el campo por nombre y sus hoyos (con número) y greens dibujados
  async function gmTraerDelMapa(btn){
    const c = GM_CAMPOS[gmCampo];
    btn.disabled = true; const txt = btn.textContent; btn.textContent = 'Buscando en el mapa…';
    try {
      const pide = async q => {
        const r = await fetch(GM_OVERPASS, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        if(!r.ok) throw new Error('overpass ' + r.status);
        return (await r.json()).elements || [];
      };
      const campos = await pide('[out:json][timeout:25];(way["leisure"="golf_course"]["name"~"' + c.busca + '",i](36.8,-6.6,38.2,-5.0);relation["leisure"="golf_course"]["name"~"' + c.busca + '",i](36.8,-6.6,38.2,-5.0););out center;');
      const cc = campos.find(e => e.center) ;
      const centro = cc ? [cc.center.lat, cc.center.lon] : c.centro;
      const els = await pide('[out:json][timeout:25];(way["golf"="hole"](around:1800,' + centro[0] + ',' + centro[1] + ');way["golf"="green"](around:1800,' + centro[0] + ',' + centro[1] + '););out geom tags;');
      const greens = els.filter(e => e.tags && e.tags.golf === 'green' && e.geometry).map(e => {
        const n = e.geometry.length; const s = e.geometry.reduce((a, p) => [a[0] + p.lat, a[1] + p.lon], [0, 0]);
        return { lat: s[0] / n, lng: s[1] / n };
      });
      const hoyos = els.filter(e => e.tags && e.tags.golf === 'hole' && e.geometry && /^\d+$/.test(e.tags.ref || ''));
      const dist = (a, b) => (typeof metersBetween === 'function') ? metersBetween(a, b) : Math.hypot(a.lat - b.lat, a.lng - b.lng) * 111000;
      let puestos = 0;
      hoyos.forEach(h => {
        const n = +h.tags.ref; if(n < 1 || n > 18) return;
        const fin = h.geometry[h.geometry.length - 1]; const punto = { lat: fin.lat, lng: fin.lon };
        let mejor = null, md = 1e9;
        greens.forEach(g => { const d = dist(punto, g); if(d < md){ md = d; mejor = g; } });
        const p = (mejor && md < 90) ? mejor : punto;
        gmPuntos[n] = { lat: p.lat, lng: p.lng, origen: 'mapa' }; gmCambiados.add(n); puestos++;
      });
      if(!puestos && greens.length){
        gmEstado('El mapa libre tiene <b>' + greens.length + ' greens</b> dibujados pero sin número de hoyo. Elige cada hoyo y toca su green: verás los greens marcados en verde.');
        greens.forEach(g => L.circleMarker([g.lat, g.lng], { radius: 9, color: '#C6F24E', weight: 2, fillOpacity: 0.15 }).addTo(gmCapa || gmMapa));
      } else if(!puestos){
        gmEstado('El mapa libre todavía no tiene los hoyos de ' + c.nombre + ' dibujados. Colócalos a mano: elige el hoyo y toca su green en la vista satélite.');
      } else {
        gmEstado('Traídos <b>' + puestos + ' greens</b> del mapa libre. Repásalos (puedes arrastrar los números) y pulsa <b>Guardar</b>.');
      }
      if(cc && !puestos) gmMapa.setView(centro, 16);
      const pts = Object.values(gmPuntos);
      if(puestos && pts.length) gmMapa.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])).pad(0.2));
      gmPintarHoyos(); gmPintarMarcas();
      if(!puestos && greens.length) greens.forEach(g => L.circleMarker([g.lat, g.lng], { radius: 9, color: '#C6F24E', weight: 2, fillOpacity: 0.15 }).addTo(gmCapa));
    } catch(e){
      console.error(e);
      gmEstado('No se pudo consultar el mapa libre ahora mismo. Inténtalo más tarde o coloca los greens a mano.');
    }
    btn.disabled = false; btn.textContent = txt;
  }

  async function gmGuardar(btn){
    if(!gmCambiados.size) return;
    const client = initSupabase(); if(!client) return;
    btn.disabled = true; btn.textContent = 'Guardando…';
    let ok = 0, fallos = 0;
    for(const h of [...gmCambiados].sort((a, b) => a - b)){
      const p = gmPuntos[h];
      try {
        const { data, error } = await client.rpc('set_green', { p_key: getAdminKey(), p_course: gmCampo, p_hole: h, p_lat: p.lat, p_lng: p.lng });
        if(error || !data) throw error || new Error('sin permiso');
        if(typeof holeGreens !== 'undefined') holeGreens[gmCampo + '|' + h] = { lat: p.lat, lng: p.lng };
        gmCambiados.delete(h); p.origen = 'guardado'; ok++;
      } catch(e){ fallos++; }
    }
    gmEstado(fallos ? 'Guardados ' + ok + '; ' + fallos + ' no se pudieron guardar (revisa la conexión o la clave de administrador).' : '¡Listo! ' + ok + (ok === 1 ? ' green guardado' : ' greens guardados') + ' para todos los jugadores.');
    gmPintarHoyos(); gmPintarMarcas();
    if(typeof renderHoleMap === 'function') renderHoleMap();
  }

  async function gmAbrir(){
    const ov = document.getElementById('greensMapaOverlay'); if(!ov) return;
    ov.hidden = false;
    gmEstado('Cargando el mapa…');
    try { await gmCargarLeaflet(); } catch(e){ gmEstado('No se pudo cargar el mapa. Revisa la conexión.'); return; }
    if(!gmMapa){
      gmMapa = L.map('gmMapa', { zoomControl: true, attributionControl: true });
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics · Datos © OpenStreetMap',
      }).addTo(gmMapa);
      gmMapa.on('click', e => {
        gmPuntos[gmHoyo] = { lat: e.latlng.lat, lng: e.latlng.lng, origen: 'mano' };
        gmCambiados.add(gmHoyo);
        if(gmHoyo < 18) gmHoyo++;
        gmPintarHoyos(); gmPintarMarcas();
        gmEstado('Colocado. Ahora el hoyo <b>' + gmHoyo + '</b>: toca su green.');
      });
    }
    setTimeout(()=> gmMapa.invalidateSize(), 60);
    await gmIrAlCampo();
  }
  function gmCerrar(){
    if(gmCambiados.size && !confirm('Hay ' + gmCambiados.size + ' greens sin guardar. ¿Salir sin guardar?')) return;
    const ov = document.getElementById('greensMapaOverlay'); if(ov) ov.hidden = true;
  }

  (function(){
    const b = document.getElementById('greensMapaBtn'); if(b) b.addEventListener('click', gmAbrir);
    const c = document.getElementById('gmCerrar'); if(c) c.addEventListener('click', gmCerrar);
    const t = document.getElementById('gmTraer'); if(t) t.addEventListener('click', ()=> gmTraerDelMapa(t));
    const g = document.getElementById('gmGuardar'); if(g) g.addEventListener('click', ()=> gmGuardar(g));
    document.querySelectorAll('.gm-campo').forEach(x => x.addEventListener('click', ()=>{
      if(x.dataset.c === gmCampo) return;
      if(gmCambiados.size && !confirm('Hay greens sin guardar en ' + GM_CAMPOS[gmCampo].nombre + '. ¿Cambiar de campo sin guardar?')) return;
      gmCampo = x.dataset.c; gmIrAlCampo();
    }));
  })();
