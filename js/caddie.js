  // --- Caddie personal: en cada hoyo, cómo lo juega CADA jugador según su historial (golfdirecto + app) ---
  // Datos: vista "caddie_hoyo" en Supabase (media, mejor, % par, % desastre y media de sus 8 últimas veces por hoyo)
  const caddieCache = {};      // { 'hato-verde': { 'CARLOS ACEDO DOMINGUEZ': { 1:{...}, 2:{...} } } }
  const caddieLoading = {};

  function caddieKey(name){
    return String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function ensureCaddieLoaded(){
    const courseId = selectedCourse && selectedCourse.id;
    if(!courseId || caddieCache[courseId] || caddieLoading[courseId]) return;
    const client = (typeof initSupabase === 'function') ? initSupabase() : null;
    if(!client) return;
    caddieLoading[courseId] = true;
    client.from('caddie_hoyo').select('*').eq('course_id', courseId).then(({ data, error })=>{
      caddieLoading[courseId] = false;
      if(error || !data) return;
      const byPlayer = {};
      data.forEach(r => { (byPlayer[r.player_key] = byPlayer[r.player_key] || {})[r.hole] = r; });
      caddieCache[courseId] = byPlayer;
      if(typeof renderHoleView === 'function') renderHoleView();
    });
  }

  const fmt1 = v => String(Number(v).toFixed(1)).replace('.', ',');

  // Elige el consejo más útil para ese jugador en ese hoyo
  function caddieTip(r, holes){
    const n = +r.n, media = +r.media, rec = r.media_reciente != null ? +r.media_reciente : null;
    if(n < 3) return { icon:'🆕', cls:'', text:'Pocas partidas aquí: juega al centro.' };
    // Ranking de sus 18 hoyos por golpes perdidos sobre el par
    const ordered = Object.values(holes).filter(h => +h.n >= 3).sort((a, b) => b.sobre_par - a.sobre_par);
    const pos = ordered.findIndex(h => h.hole === r.hole);
    if(pos > -1 && pos < 4) return { icon:'⚠️', cls:'trampa', text:'Hoyo trampa: el bogey es buen resultado.' };
    if(+r.pct_desastre >= 25) return { icon:'🧯', cls:'trampa', text:'Aquí se te escapa: si te lías, saca a calle.' };
    if(pos > -1 && pos >= ordered.length - 3) return { icon:'💪', cls:'fuerte', text:'De tus mejores hoyos: ¡ataca!' };
    if(rec != null && rec <= media - 0.4) return { icon:'📈', cls:'fuerte', text:'Lo juegas cada vez mejor.' };
    if(rec != null && rec >= media + 0.4) return { icon:'🔎', cls:'', text:'Últimamente te cuesta: juega seguro.' };
    return { icon:'🎯', cls:'', text:'Hoyo normal: busca el centro del green.' };
  }

  // Bloque que se pinta dentro de la tarjeta de cada jugador en la vista de hoyo
  function caddieHtml(playerName, hole){
    const courseId = selectedCourse && selectedCourse.id;
    const course = courseId && caddieCache[courseId];
    if(!course || !playerName) return '';
    const holes = course[caddieKey(playerName)];
    const r = holes && holes[hole];
    if(!r) return '';
    const tip = caddieTip(r, holes);
    const trend = (r.media_reciente != null && +r.n >= 3)
      ? '<span>Últimas 8: <b>' + fmt1(r.media_reciente) + '</b></span>' : '';
    return '<div class="caddie-card ' + tip.cls + '">'
      + '<div class="caddie-head"><span class="caddie-ico">🧢</span>'
      + '<span class="caddie-main">Media <b>' + fmt1(r.media) + '</b> · Mejor <b>' + r.mejor + '</b></span></div>'
      + '<div class="caddie-tip">' + tip.icon + ' ' + tip.text + '</div>'
      + '<details class="caddie-details"><summary>Mis números</summary>'
      + '<div class="caddie-stats">'
      + '<span>Par o mejor: <b>' + r.pct_par + '%</b></span>'
      + '<span>Triple o peor: <b>' + r.pct_desastre + '%</b></span>'
      + trend
      + '<span>Veces jugado: <b>' + r.n + '</b></span>'
      + '</div></details></div>';
  }
