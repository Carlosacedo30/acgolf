/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Liga en Club Hato Verde: hándicap real (WHS) y clasificación acumulada ---
  const LEAGUE_COURSE_ID = 'hato-verde';
  const LEAGUE_TEE = 'amarillas'; // barra de salida habitual del grupo
  // Fecha de reinicio de estadísticas (la fija el administrador): lo anterior no cuenta ni para hándicap ni para la liga
  let statsSince = null;
  let statsSinceLoaded = null;
  function loadStatsSince(){
    if(statsSinceLoaded) return statsSinceLoaded;
    statsSinceLoaded = (async ()=>{
      const client = initSupabase();
      if(!client) return null;
      try {
        const { data } = await client.from('app_settings').select('value').eq('key', 'stats_since');
        statsSince = data && data[0] && data[0].value ? data[0].value : null;
      } catch(e){ statsSince = null; }
      return statsSince;
    })();
    return statsSinceLoaded;
  }
  const isoMax = (a, b) => (!a ? b : !b ? a : (new Date(a) > new Date(b) ? a : b));
  // Campos cuyas rondas cuentan para el hándicap (cada uno con su propio Course Rating / Slope)
  const HANDICAP_COURSE_IDS = ['hato-verde', 'zaudin'];
  // Evita recalcular (con su consulta a la base de datos) en cada pulsación una vez la ronda ya está completa;
  // se reinicia al empezar una ronda nueva
  let leagueHandicapUpdateScheduled = false;

  // Tope de doble bogey neto por hoyo (Equitable Stroke Control de la WHS):
  // ningún hoyo cuenta, para el cálculo del hándicap, por encima de par + 2 + golpes recibidos ahí
  function netDoubleBogeyCap(par, strokesReceived){
    return par + 2 + strokesReceived;
  }

  // Diferencial de una ronda: compara el resultado (ya topado) con la dificultad real del campo
  function scoreDifferential(adjustedGrossScore, rating, slope){
    return (113 / slope) * (adjustedGrossScore - rating);
  }

  // Tabla oficial WHS: con menos de 20 rondas, cuántos diferenciales se promedian y qué ajuste se resta
  const LEAGUE_LOW_COUNT_TABLE = {
    1:[1,-2.0], 2:[1,-2.0], 3:[1,-2.0],
    4:[1,-1.0],
    5:[1,0],
    6:[2,-1.0],
    7:[2,0], 8:[2,0],
    9:[3,0], 10:[3,0], 11:[3,0],
    12:[4,0], 13:[4,0], 14:[4,0],
    15:[5,0], 16:[5,0],
    17:[6,0], 18:[6,0],
    19:[7,0],
  };

  // Índice de hándicap: media de los mejores diferenciales de las últimas 20 rondas (más recientes primero)
  function computeHandicapIndex(differentialsMostRecentFirst){
    const last20 = differentialsMostRecentFirst.slice(0, 20);
    const n = last20.length;
    if(n === 0) return null;
    const [count, adj] = n >= 20 ? [8, 0] : (LEAGUE_LOW_COUNT_TABLE[n] || [1, -2.0]);
    const best = last20.slice().sort((a, b) => a - b).slice(0, count);
    const avg = best.reduce((s, d) => s + d, 0) / best.length;
    return Math.round((avg + adj) * 10) / 10;
  }

  // Recalcula, a partir del historial real guardado en Supabase, el hándicap de cada jugador
  // que haya jugado alguna vez en Hato Verde, y actualiza FAVORITE_HANDICAPS con el resultado
  // El hándicap de cada jugador de la liga lo guarda y lo actualiza SOLO la base de datos (nadie lo puede tocar
  // desde un móvil). Aquí solo se lee el vigente y se ponen al día las partidas que aún no han empezado.
  async function updateLeagueHandicaps(){
    const map = await fetchCurrentHandicaps();
    if(!map) return;
    Object.keys(map).forEach(name => { FAVORITE_HANDICAPS[name] = map[name]; });
    if(typeof lockLeagueHcpInputs === 'function') lockLeagueHcpInputs();
    await syncOpenRoundsHandicaps(); // las partidas pendientes cogen el hándicap vigente
  }

  // Recalcula el hándicap de la liga y, si cambia para alguno de estos jugadores, lo enseña en pantalla
  // (para que se note de verdad que ha pasado algo — antes se recalculaba pero no se veía en ningún sitio)
  async function runLeagueHandicapUpdate(playerNames){
    const before = {};
    playerNames.forEach(name => { before[name] = FAVORITE_HANDICAPS[name]; });
    await updateLeagueHandicaps();
    const noteEl = document.getElementById('leagueHandicapUpdateNote');
    if(!noteEl) return;
    const lines = playerNames.map(name => {
      const b = before[name], a = FAVORITE_HANDICAPS[name];
      if(a === undefined || a === b) return null;
      return '<strong>' + name + '</strong>: ' + b + ' → ' + a;
    }).filter(Boolean);
    if(lines.length){
      noteEl.innerHTML = '<div class="pattern"><p>' + icono('bandera') + ' Hándicap de la liga actualizado<br>' + lines.join('<br>') + '</p></div>';
      noteEl.style.display = '';
    } else {
      noteEl.style.display = 'none';
    }
  }

  // La clasificación arranca de cero: solo cuentan rondas jugadas (anotadas por última vez) a partir de esta fecha.
  // Se mira updated_at y no created_at porque una partida puede crearse la víspera y jugarse al día siguiente
  const LEAGUE_STANDINGS_START_DATE = '2026-10-03T00:00:00+02:00'; // arranque oficial de la liga

  // Clasificación de la liga POR MES: cada mes empieza de cero el día 1 y tiene su campeón.
  // Las rondas antiguas no se borran (el hándicap las sigue necesitando); solo se agrupan por mes.
  // Cada semana (lunes a domingo) puntúa el mejor neto de cada jugador: 10-8-6-5-4-3-2 y 1 al resto.
  // La semana cuenta para el mes en que cae su jueves. Campeón del mes: más puntos; empate, mejor neto.
  const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const LIGA_FIRST_MONTH = { y: 2026, m: 9 }; // octubre 2026 (mes 0 = enero)
  let ligaMonth = (()=>{ const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; })();
  let ligaRoundsCache = null;
  const monthKey = (y, m) => y * 12 + m;
  const capitalize = t => t.charAt(0).toUpperCase() + t.slice(1);

  // Datos de la liga por mes, calculados en Supabase con liga_mes(): semanas con su clasificación y puntos del mes.
  // ligaRoundsCache guarda { 'aaaa-m': datos } y se vacía al entrar en la pantalla para traer lo último.
  async function fetchLigaMes(y, m){
    const key = y + '-' + m;
    if(!ligaRoundsCache) ligaRoundsCache = {};
    if(ligaRoundsCache[key]) return ligaRoundsCache[key];
    const client = initSupabase();
    if(!client) return null;
    try {
      const { data, error } = await client.rpc('liga_mes', { p_anio: y, p_mes: m + 1 });
      if(error) throw error;
      ligaRoundsCache[key] = data;
      return data;
    } catch(e){ console.error('No se pudo cargar la liga', e); return null; }
  }

  const LIGA_PUNTOS_TXT = '10 · 8 · 6 · 5 · 4 · 3 · 2 · resto 1';
  function ligaNombreCorto(n){
    const w = String(n || '').trim().split(/\s+/);
    return w.length > 2 ? w.slice(0, -1).join(' ') : w.join(' ');
  }
  function ligaFechaCorta(iso){
    const [y, m, d] = String(iso).split('-').map(Number);
    return d + ' ' + MESES_ES[m - 1].slice(0, 3);
  }

  async function renderLigaStandings(){
    const wrap = document.getElementById('ligaStandings');
    const empty = document.getElementById('ligaEmpty');
    const semWrap = document.getElementById('ligaSemanas');
    if(!wrap) return;
    const now = new Date();
    const curKey = monthKey(now.getFullYear(), now.getMonth());
    const firstKey = monthKey(LIGA_FIRST_MONTH.y, LIGA_FIRST_MONTH.m);
    const lastKey = Math.max(curKey, firstKey);
    let k = Math.min(Math.max(monthKey(ligaMonth.y, ligaMonth.m), firstKey), lastKey);
    ligaMonth = { y: Math.floor(k / 12), m: k % 12 };
    const isCurrent = k >= curKey;
    const label = capitalize(MESES_ES[ligaMonth.m]) + ' ' + ligaMonth.y;
    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    set('ligaMonthLabel', label);
    set('ligaMonthSub', isCurrent ? 'Mes en curso · campeón por puntos' : 'Mes cerrado');
    const prev = document.getElementById('ligaPrevMonth'), next = document.getElementById('ligaNextMonth');
    if(prev) prev.disabled = k <= firstKey;
    if(next) next.disabled = k >= lastKey;

    const data = await fetchLigaMes(ligaMonth.y, ligaMonth.m);
    const standings = (data && data.clasificacion) || [];
    const semanas = (data && data.semanas) || [];
    const trophy = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10v5a5 5 0 0 1-10 0z"></path><path d="M17 5h3v2a3 3 0 0 1-3 3"></path><path d="M7 5H4v2a3 3 0 0 0 3 3"></path></svg>';

    // Clasificación del mes por puntos
    if(!standings.length){
      wrap.innerHTML = '';
      if(empty){ empty.style.display = ''; empty.textContent = isCurrent ? 'Todavía no hay tarjetas este mes. Los puntos empiezan a contar con la primera partida.' : 'No hubo tarjetas en ' + MESES_ES[ligaMonth.m] + '.'; }
    } else {
      if(empty) empty.style.display = 'none';
      wrap.innerHTML = standings.map((s, i) =>
        '<div class="leaderboard-row' + (i === 0 ? ' p1' : '') + '"><div class="leaderboard-pos">' + (i === 0 ? trophy : (i + 1)) + '</div>'
        + '<div class="leaderboard-name">' + (i === 0 ? '<div class="leader-tag">' + (isCurrent ? 'Líder del mes' : 'Campeón de ' + MESES_ES[ligaMonth.m]) + '</div>' : '')
        + escapeHtml(ligaNombreCorto(s.jugador)) + '<div class="leaderboard-holes">' + s.semanas + (s.semanas === 1 ? ' semana' : ' semanas') + ' · mejor neto ' + s.mejor_neto + '</div></div>'
        + '<div class="leaderboard-score">' + s.puntos + '<span class="liga-pts"> pts</span></div></div>'
      ).join('');
    }

    // Semanas del mes: la más reciente primero
    if(semWrap){
      semWrap.innerHTML = semanas.map(sem =>
        '<div class="liga-sem">'
        + '<div class="liga-sem-head">Semana ' + ligaFechaCorta(sem.desde) + ' – ' + ligaFechaCorta(sem.hasta) + '</div>'
        + (sem.clasificacion[0] ? '<div class="liga-sem-win">' + icono('corona') + ' Iscariote: <strong>' + escapeHtml(ligaNombreCorto(sem.clasificacion[0].jugador)) + '</strong> · ' + sem.clasificacion[0].neto + ' netos</div>' : '')
        + '<div class="liga-sem-fila liga-sem-cab"><span>#</span><span>Jugador</span><span>Golpes</span><span>Neto</span><span>Pts</span></div>'
        + sem.clasificacion.map(c =>
            '<div class="liga-sem-fila"><span>' + c.pos + '</span><span class="liga-sem-nom">' + escapeHtml(ligaNombreCorto(c.jugador)) + '</span>'
            + '<span>' + c.bruto + '</span><span>' + c.neto + '</span><span class="liga-sem-pts">+' + c.puntos + '</span></div>'
          ).join('')
        + '</div>'
      ).join('');
      const semSec = document.getElementById('ligaSemanasSection');
      if(semSec) semSec.style.display = semanas.length ? '' : 'none';
    }

    // Palmarés: campeón de cada mes ya cerrado
    const hist = document.getElementById('ligaChampions');
    const histSection = document.getElementById('ligaChampionsSection');
    if(hist){
      const rows = [];
      for(let kk = curKey - 1; kk >= firstKey; kk--){
        const y = Math.floor(kk / 12), m = kk % 12;
        const d = await fetchLigaMes(y, m);
        const st = (d && d.clasificacion) || [];
        if(st.length) rows.push('<div class="champ-row"><div class="champ-month">' + capitalize(MESES_ES[m]) + ' ' + y + '</div><div class="champ-name">' + escapeHtml(ligaNombreCorto(st[0].jugador)) + '</div><div class="leaderboard-score">' + st[0].puntos + ' pts</div></div>');
      }
      hist.innerHTML = rows.join('');
      if(histSection) histSection.style.display = rows.length ? '' : 'none';
    }
  }

  (function setupLigaMonths(){
    const move = d => { ligaMonth = { y: Math.floor((monthKey(ligaMonth.y, ligaMonth.m) + d) / 12), m: (monthKey(ligaMonth.y, ligaMonth.m) + d) % 12 }; renderLigaStandings(); };
    const prev = document.getElementById('ligaPrevMonth'), next = document.getElementById('ligaNextMonth');
    if(prev) prev.addEventListener('click', ()=> move(-1));
    if(next) next.addEventListener('click', ()=> move(1));
  })();

  const ligaLinkBtn = document.getElementById('ligaLinkBtn');
  if(ligaLinkBtn) ligaLinkBtn.addEventListener('click', ()=> goTo(6));
  const ligaVolverBtn = document.getElementById('ligaVolverBtn');
  if(ligaVolverBtn) ligaVolverBtn.addEventListener('click', ()=> goTo(0));

  // Guarda en Supabase (tabla player_handicaps) los hándicaps calculados, iguales en todos los móviles
  async function saveLeagueHandicaps(handicaps){
    return; // desactivado: los móviles ya no escriben hándicaps (lo hace la base de datos)
    const client = initSupabase();
    if(!client) return;
    const rows = Object.keys(handicaps).map(name => ({ player_name: name, handicap_index: handicaps[name], updated_at: new Date().toISOString() }));
    if(!rows.length) return;
    try {
      const { error } = await client.from('player_handicaps').upsert(rows, { onConflict: 'player_name' });
      if(error) throw error;
    } catch(e){ console.error('No se pudo guardar el hándicap de la liga', e); }
  }

  // Al abrir la app, trae el último hándicap guardado de cada jugador
  async function loadLeagueHandicaps(){
    const client = initSupabase();
    if(!client) return;
    try {
      await loadStatsSince();
      let q = client.from('player_handicaps').select('player_name, handicap_index, updated_at');
      if(statsSince) q = q.gte('updated_at', statsSince); // los calculados antes del reinicio ya no valen
      const { data, error } = await q;
      if(error || !data) return;
      data.forEach(row => { if(row.player_name && row.handicap_index !== null) FAVORITE_HANDICAPS[row.player_name] = row.handicap_index; });
    } catch(e){ console.error('No se pudo cargar el hándicap de la liga', e); }
  }

  // --- Hándicaps de las partidas al día ---
  // Una partida guarda el hándicap de cada jugador al crearla. Si luego cambia (ronda nueva, reinicio,
  // o el administrador lo corrige), las partidas en las que ese jugador todavía NO ha apuntado ningún golpe
  // se ponen al día solas. En cuanto apunta el primer golpe, su hándicap queda fijo para esa partida.

  // Hándicap vigente de cada jugador, leído siempre de Supabase (no de lo que tenga este móvil en memoria):
  // el inicial de la lista de la liga y, encima, el calculado con rondas desde el último reinicio
  async function fetchCurrentHandicaps(){
    const client = initSupabase();
    if(!client) return null;
    try {
      await loadStatsSince();
      const map = {};
      const lp = await client.from('league_players').select('name, hcp').eq('active', true);
      if(lp.error) return null;
      (lp.data || []).forEach(p => { if(p.hcp !== null && p.hcp !== undefined) map[p.name] = Number(p.hcp); });
      let q = client.from('player_handicaps').select('player_name, handicap_index, updated_at');
      if(statsSince) q = q.gte('updated_at', statsSince);
      const ph = await q;
      if(ph.error) return null;
      (ph.data || []).forEach(r => { if(r.player_name && r.handicap_index !== null) map[r.player_name] = Number(r.handicap_index); });
      return map;
    } catch(e){ return null; }
  }

  function playerHasStarted(group, pIndex){
    const sc = group && group.scores && group.scores[pIndex];
    return !!sc && Object.keys(sc).some(h => sc[h] !== '' && sc[h] != null);
  }

  // Pone el hándicap vigente a los jugadores sin golpes apuntados. Devuelve true si ha cambiado algo.
  function refreshGroupHandicaps(groups, hcpMap){
    if(!hcpMap) return false;
    let changed = false;
    (groups || []).forEach(g => {
      if(!g || !Array.isArray(g.players)) return;
      g.players.forEach((name, i) => {
        if(!name || hcpMap[name] === undefined || isNaN(hcpMap[name])) return;
        if(playerHasStarted(g, i)) return;
        if(!Array.isArray(g.handicaps)) g.handicaps = [];
        while(g.handicaps.length < i) g.handicaps.push(0);
        if(Number(g.handicaps[i]) !== hcpMap[name]){ g.handicaps[i] = hcpMap[name]; changed = true; }
      });
    });
    return changed;
  }

  // Aplica el cambio a la partida abierta en este móvil (tarjeta, neto y guardado en vivo)
  function applyHandicapsToOpenRound(hcpMap){
    if(!refreshGroupHandicaps(matchGroups, hcpMap)) return false;
    const g = matchGroups[activeGroup] || matchGroups[0];
    playerHandicaps = g.handicaps.length ? g.handicaps : [0];
    if(selectedCourse && typeof recalcResultados === 'function') recalcResultados(); // recalcula netos y guarda
    else if(typeof saveRoundState === 'function') saveRoundState();
    return true;
  }

  // Pone al día todas las partidas sin terminar de los últimos 30 días
  let syncingRoundHandicaps = false;
  async function syncOpenRoundsHandicaps(){
    if(syncingRoundHandicaps) return;
    const client = initSupabase();
    if(!client) return;
    syncingRoundHandicaps = true;
    try {
      const hcpMap = await fetchCurrentHandicaps();
      if(!hcpMap) return;
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await client.from('rounds')
        .select('id, match_groups')
        .not('course_id', 'is', null) // las convocatorias no llevan tarjeta
        .gte('updated_at', since);
      if(error || !data) return;
      for(const r of data){
        if(r.id === currentRoundId){ applyHandicapsToOpenRound(hcpMap); continue; }
        const groups = Array.isArray(r.match_groups) ? r.match_groups : [];
        if(isRoundFinished(groups)) continue;
        if(!refreshGroupHandicaps(groups, hcpMap)) continue;
        await client.from('rounds').update({ match_groups: groups }).eq('id', r.id); // sin tocar updated_at: no cambia el orden de "Últimas partidas"
      }
    } catch(e){
      console.error('No se pudieron poner al día los hándicaps de las partidas', e);
    } finally {
      syncingRoundHandicaps = false;
    }
  }

  loadLeagueHandicaps();
  syncOpenRoundsHandicaps(); // al abrir la app, por si algún hándicap cambió desde otro móvil
