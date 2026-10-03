/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Dibujo del hoyo + distancia al green por GPS ---
  // Dibujos de cada hoyo (se irán añadiendo campo a campo)
  const HOLE_MAPS = {
    'hato-verde': Object.fromEntries(Array.from({ length: 18 }, (_, i) => [i + 1, 'hoyos/hato-verde-' + (i + 1) + '.svg?v=1'])),
  };

  let holeGreens = {};          // 'campo|hoyo' -> { lat, lng }
  let holeGreensLoadedFor = null;
  let gpsWatchId = null;
  let gpsPos = null;            // { lat, lng, acc }

  async function loadHoleGreens(courseId){
    if(!courseId || holeGreensLoadedFor === courseId) return;
    holeGreensLoadedFor = courseId;
    const client = initSupabase();
    if(!client) return;
    try {
      const { data, error } = await client.from('hole_greens').select('course_id, hole, lat, lng').eq('course_id', courseId);
      if(error || !data) return;
      data.forEach(r => { holeGreens[r.course_id + '|' + r.hole] = { lat: r.lat, lng: r.lng }; });
      renderHoleMap();
    } catch(e){ /* sin conexión: se queda sin distancias */ }
  }

  // Distancia en metros entre dos puntos (fórmula del haversine)
  function metersBetween(a, b){
    const R = 6371000, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function renderHoleMap(){
    const card = document.getElementById('holeMapCard');
    if(!card) return;
    const courseId = selectedCourse ? selectedCourse.id : null;
    const map = courseId && HOLE_MAPS[courseId] ? HOLE_MAPS[courseId][currentHole] : null;
    const green = courseId ? holeGreens[courseId + '|' + currentHole] : null;
    loadHoleGreens(courseId);
    card.style.display = (map || green || getAdminKey()) ? '' : 'none';
    const thumb = document.getElementById('holeMapThumb');
    const img = document.getElementById('holeMapImg');
    if(thumb) thumb.style.display = map ? '' : 'none';
    if(img && map && img.getAttribute('src') !== map){ img.src = map; img.alt = 'Dibujo del hoyo ' + currentHole; }

    const distEl = document.getElementById('holeGreenDist');
    const hintEl = document.getElementById('holeGpsHint');
    const gpsBtn = document.getElementById('holeGpsBtn');
    if(gpsBtn) gpsBtn.style.display = gpsWatchId === null ? '' : 'none';
    if(!green){
      if(distEl) distEl.textContent = '—';
      if(hintEl) hintEl.textContent = 'Este green aún no tiene posición guardada';
    } else if(!gpsPos){
      if(distEl) distEl.textContent = '—';
      if(hintEl) hintEl.textContent = gpsWatchId === null ? 'Activa el GPS para ver la distancia' : 'Buscando tu posición…';
    } else {
      const m = Math.round(metersBetween(gpsPos, green));
      if(distEl) distEl.textContent = m > 2000 ? '+2 km' : m + ' m';
      if(hintEl) hintEl.textContent = m > 2000 ? 'Estás lejos del campo' : 'Al centro del green' + (gpsPos.acc > 15 ? ' · precisión ±' + Math.round(gpsPos.acc) + ' m' : '');
    }
    const setBtn = document.getElementById('holeSetGreenBtn');
    if(setBtn) setBtn.hidden = !getAdminKey();
  }

  function startGps(){
    if(!('geolocation' in navigator)){ alert('Este móvil no permite usar el GPS en la app.'); return; }
    if(gpsWatchId !== null) return;
    gpsWatchId = navigator.geolocation.watchPosition(
      p => { gpsPos = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }; renderHoleMap(); },
      err => {
        if(gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
        gpsWatchId = null; gpsPos = null; renderHoleMap();
        alert(err.code === 1 ? 'No has dado permiso de ubicación. Actívalo en los ajustes del navegador para ver distancias.' : 'No se pudo obtener tu posición.');
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );
    renderHoleMap();
  }

  // Solo el móvil administrador: guarda la posición actual como centro del green de este hoyo
  async function saveGreenHere(){
    if(!selectedCourse) return;
    const hole = currentHole;
    if(!confirm('¿Estás en el centro del green del hoyo ' + hole + '?\nSe guardará tu posición actual para todos los jugadores.')) return;
    const btn = document.getElementById('holeSetGreenBtn');
    if(btn) btn.textContent = 'Guardando…';
    navigator.geolocation.getCurrentPosition(async p => {
      const client = initSupabase();
      try {
        const { data, error } = await client.rpc('set_green', { p_key: getAdminKey(), p_course: selectedCourse.id, p_hole: hole, p_lat: p.coords.latitude, p_lng: p.coords.longitude });
        if(error) throw error;
        if(!data){ alert('No tienes permiso para guardar greens.'); }
        else {
          holeGreens[selectedCourse.id + '|' + hole] = { lat: p.coords.latitude, lng: p.coords.longitude };
          alert('Green del hoyo ' + hole + ' guardado (precisión ±' + Math.round(p.coords.accuracy) + ' m).');
        }
      } catch(e){ alert('No se pudo guardar. Revisa la conexión.'); }
      if(btn) btn.textContent = 'Guardar green aquí';
      renderHoleMap();
    }, () => {
      if(btn) btn.textContent = 'Guardar green aquí';
      alert('No se pudo obtener tu posición. Da permiso de ubicación e inténtalo de nuevo.');
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  }

  (function setupHoleMap(){
    const gpsBtn = document.getElementById('holeGpsBtn');
    if(gpsBtn) gpsBtn.addEventListener('click', startGps);
    const setBtn = document.getElementById('holeSetGreenBtn');
    if(setBtn) setBtn.addEventListener('click', saveGreenHere);
    const overlay = document.getElementById('holeMapOverlay');
    const big = document.getElementById('holeMapBig');
    const thumb = document.getElementById('holeMapThumb');
    if(thumb && overlay && big) thumb.addEventListener('click', ()=>{
      const img = document.getElementById('holeMapImg');
      big.src = img ? img.src : '';
      big.alt = img ? img.alt : '';
      overlay.hidden = false;
    });
    const close = document.getElementById('holeMapClose');
    if(close && overlay) close.addEventListener('click', ()=>{ overlay.hidden = true; });
    if(overlay) overlay.addEventListener('click', e => { if(e.target === overlay) overlay.hidden = true; });
  })();
