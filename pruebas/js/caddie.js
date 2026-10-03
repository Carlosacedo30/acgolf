/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Caddie personal: en cada hoyo, cómo lo juega CADA jugador según su historial (golfdirecto + app) ---
  // Datos: vista "caddie_hoyo" en Supabase (media, mejor, % par, % desastre y media de sus 8 últimas veces por hoyo)
  const caddieCache = {};      // { 'hato-verde': { 'CARLOS ACEDO DOMINGUEZ': { 1:{...}, 2:{...} } } }
  const caddieLoading = {};

  function caddieKey(name){
    return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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

  // Elige el consejo más útil para ese jugador en ese hoyo (tag = palabra corta para la etiqueta)
  function caddieTip(r, holes){
    const n = +r.n, media = +r.media, rec = r.media_reciente != null ? +r.media_reciente : null;
    if(n < 3) return { icon:'🆕', cls:'', tag:'Nuevo', text:'Pocas partidas aquí: juega al centro.' };
    // Ranking de sus 18 hoyos por golpes perdidos sobre el par
    const ordered = Object.values(holes).filter(h => +h.n >= 3).sort((a, b) => b.sobre_par - a.sobre_par);
    const pos = ordered.findIndex(h => h.hole === r.hole);
    if(pos > -1 && pos < 4) return { icon:'⚠️', cls:'trampa', tag:'Hoyo trampa', text:'El bogey es buen resultado.' };
    if(+r.pct_desastre >= 25) return { icon:'🧯', cls:'trampa', tag:'Ojo', text:'Aquí se te escapa: si te lías, saca a calle.' };
    if(pos > -1 && pos >= ordered.length - 3) return { icon:'💪', cls:'fuerte', tag:'Ataca', text:'De tus mejores hoyos: ¡a por el par!' };
    if(rec != null && rec <= media - 0.4) return { icon:'📈', cls:'fuerte', tag:'En racha', text:'Lo juegas cada vez mejor.' };
    if(rec != null && rec >= media + 0.4) return { icon:'🔎', cls:'', tag:'Prudencia', text:'Últimamente te cuesta: juega seguro.' };
    return { icon:'🎯', cls:'', tag:'Normal', text:'Busca el centro del green.' };
  }

  // Tarjeta del caddie dentro de la tarjeta de cada jugador en la vista de hoyo:
  // etiqueta con el veredicto, el consejo, la media frente al par y una barra con cómo le suele salir
  function caddieHtml(playerName, hole){
    const courseId = selectedCourse && selectedCourse.id;
    const course = courseId && caddieCache[courseId];
    if(!course || !playerName) return '';
    const holes = course[caddieKey(playerName)];
    const r = holes && holes[hole];
    if(!r) return '';
    const tip = caddieTip(r, holes);
    const par = selectedCourse.par ? +selectedCourse.par[hole - 1] : null;
    const media = +r.media;
    const sobre = par ? media - par : null;
    const sobreTxt = sobre == null ? '' : (sobre > 0.05 ? '+' + fmt1(sobre) : sobre < -0.05 ? '−' + fmt1(-sobre) : 'al par');
    const pPar = Math.max(0, Math.min(100, Math.round(+r.pct_par || 0)));
    const pMal = Math.max(0, Math.min(100 - pPar, Math.round(+r.pct_desastre || 0)));
    const pMedio = 100 - pPar - pMal;
    let trend = '';
    if(r.media_reciente != null && +r.n >= 3){
      const d = +r.media_reciente - media;
      trend = '<div class="cad-trend ' + (d <= -0.2 ? 'up' : d >= 0.2 ? 'down' : '') + '">'
        + (d <= -0.2 ? '▼ ' : d >= 0.2 ? '▲ ' : '') + 'Últimas 8: <b>' + fmt1(r.media_reciente) + '</b></div>';
    }
    return '<div class="cad ' + tip.cls + '">'
      + '<div class="cad-top"><span class="cad-who">🧢 Caddie</span><span class="cad-tag">' + tip.icon + ' ' + tip.tag + '</span></div>'
      + '<div class="cad-tip">' + tip.text + '</div>'
      + '<div class="cad-nums"><div><span class="cad-k">Media</span><span class="cad-v">' + fmt1(media) + '</span>'
      + (sobreTxt ? '<span class="cad-s">' + sobreTxt + '</span>' : '') + '</div>'
      + '<div><span class="cad-k">Mejor</span><span class="cad-v">' + r.mejor + '</span></div></div>'
      + '<div class="cad-bar" role="img" aria-label="Par o mejor ' + pPar + '%, triple o peor ' + pMal + '%">'
      + '<i class="b-par" style="width:' + pPar + '%"></i><i class="b-med" style="width:' + pMedio + '%"></i><i class="b-mal" style="width:' + pMal + '%"></i></div>'
      + '<div class="cad-leg"><span class="l-par">Par ' + pPar + '%</span><span class="l-mal">Triple ' + pMal + '%</span></div>'
      + (trend || '<div class="cad-trend">Jugado ' + r.n + (+r.n === 1 ? ' vez' : ' veces') + '</div>')
      + '</div>';
  }
