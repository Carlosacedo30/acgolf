/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Partidas compartidas en vivo (Supabase): código, guardado y tiempo real ---
  const SUPABASE_URL = 'https://svnkgmbfanwftncopqjg.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_7ZPtF55SSEJhiP91H14Dpw_pGqEQ3-X';
  let sb = null;
  let currentRoundId = null;
  let currentRoundCode = null;
  let realtimeChannel = null;
  let suppressRemoteEcho = false;
  let saveTimer = null;

  function initSupabase(){
    if(!sb && window.supabase && window.supabase.createClient){
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return sb;
  }

  function genRoundCode(){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos (0/O, 1/I)
    let code = '';
    for(let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  // Asegura que siempre haya exactamente MAX_GROUPS grupos con forma válida, venga lo que venga de la base de datos
  function normalizeMatchGroups(mg){
    const blank = () => ({ players: [], handicaps: [], scores: {} });
    const arr = Array.isArray(mg) ? mg.slice(0, MAX_GROUPS) : [];
    while(arr.length < MAX_GROUPS) arr.push(blank());
    return arr.map(g => {
      const out = {
        players: Array.isArray(g && g.players) ? g.players : [],
        handicaps: Array.isArray(g && g.handicaps) ? g.handicaps : [],
        scores: (g && typeof g.scores === 'object' && g.scores) ? g.scores : {},
      };
      if(g && g.modo && g.modo !== 'individual') out.modo = g.modo; // modalidad por parejas
      if(g && Array.isArray(g.parejas)) out.parejas = g.parejas;   // foursome: quién forma cada pareja
      if(g && Number(g.hoyoSalida) > 1 && Number(g.hoyoSalida) <= 18) out.hoyoSalida = Number(g.hoyoSalida); // salida al tiro
      return out;
    });
  }

  function getLocalRoundHistory(){
    try {
      const raw = localStorage.getItem('golfAppRoundHistory');
      return raw ? JSON.parse(raw) : [];
    } catch(e){ return []; }
  }
  // --- Borrar partidas: solo desde el móvil que tenga la clave de administrador ---
  // La clave se guarda una vez abriendo la app con el enlace #admin=CLAVE (el enlace se limpia solo).
  // Supabase comprueba la clave en la función delete_round antes de borrar.
  (function captureAdminKey(){
    const m = location.hash.match(/admin=([A-Za-z0-9_-]+)/);
    if(!m) return;
    try { localStorage.setItem('golfAppAdminKey', m[1]); } catch(e){}
    history.replaceState(null, '', location.pathname + location.search);
  })();
  // Activar este móvil desde dentro de la app: tocar 5 veces seguidas el título "Últimas partidas"
  async function promptAdminKey(){
    if(getAdminKey()){
      if(confirm('Este móvil ya puede borrar partidas.\n¿Quitarle el permiso?')){
        try { localStorage.removeItem('golfAppAdminKey'); } catch(e){}
        renderRecentRounds();
      }
      return;
    }
    const key = (prompt('Clave de administrador para borrar partidas:') || '').trim();
    if(!key) return;
    const client = initSupabase();
    if(!client){ alert('Sin conexión. Inténtalo de nuevo.'); return; }
    try {
      const { data, error } = await client.rpc('is_admin', { p_key: key });
      if(error) throw error;
      if(!data){ alert('Clave incorrecta.'); return; }
      try { localStorage.setItem('golfAppAdminKey', key); } catch(e){}
      alert('Listo: este móvil ya puede borrar partidas y convocatorias.');
      renderRecentRounds();
    } catch(e){ alert('No se pudo comprobar la clave. Revisa la conexión.'); }
  }
  (function setupAdminButton(){
    const btn = document.getElementById('adminModeBtn');
    if(btn) btn.addEventListener('click', promptAdminKey);
  })();
  (function setupAdminTaps(){
    const el = document.getElementById('recentRoundsTitle');
    if(!el) return;
    el.style.cursor = 'pointer'; el.style.touchAction = 'manipulation';
    let taps = 0, timer = null;
    el.addEventListener('click', ()=>{
      taps++; clearTimeout(timer);
      timer = setTimeout(()=>{ taps = 0; }, 1500);
      if(taps >= 5){ taps = 0; promptAdminKey(); }
    });
  })();

  function getAdminKey(){
    try { return localStorage.getItem('golfAppAdminKey') || ''; } catch(e){ return ''; }
  }
  async function deleteSharedRound(code){
    const client = initSupabase();
    if(!client) return { ok:false, msg:'Sin conexión' };
    try {
      const { data, error } = await client.rpc('delete_round', { p_code: code, p_key: getAdminKey() });
      if(error) throw error;
      if(!data) return { ok:false, msg:'No tienes permiso para borrar partidas' };
      try {
        localStorage.setItem('golfAppRoundHistory', JSON.stringify(getLocalRoundHistory().filter(r => r.code !== code)));
        if(currentRoundCode === code){ clearLocalBackup(); }
      } catch(e){}
      return { ok:true };
    } catch(e){
      console.error('No se pudo borrar la partida', e);
      return { ok:false, msg:'No se pudo borrar la partida. Revisa la conexión.' };
    }
  }

  function rememberRoundCode(code, courseName, roundNameVal){
    try {
      const history = getLocalRoundHistory().filter(r => r.code !== code);
      history.unshift({ code: code, courseName: courseName || '', roundName: roundNameVal || '', date: new Date().toISOString() });
      localStorage.setItem('golfAppRoundHistory', JSON.stringify(history.slice(0, 15)));
    } catch(e){ /* almacenamiento no disponible */ }
  }

  // Título de "Introducir resultados": el nombre que le puso el jugador, o un texto genérico si no lo hay
  function updateS3Title(){
    const titleEl = document.getElementById('s3Title');
    if(titleEl) titleEl.textContent = roundName || 'Nueva ronda';
  }

  function setSyncStatus(state){
    const el = document.getElementById('syncStatus');
    if(!el) return;
    el.classList.toggle('live', state === 'live');
    el.querySelector('span').textContent = state === 'live' ? 'Guardado en vivo · todos los móviles ven lo mismo'
      : state === 'error' ? 'Sin conexión — se guarda solo en este móvil'
      : 'Conectando…';
  }

  // Salir de la partida: deja de seguirla en vivo y vuelve al inicio. La partida queda guardada
  // y se puede retomar desde "Últimas partidas".
  function leaveCurrentRound(){
    const client = initSupabase();
    if(realtimeChannel && client){ try { client.removeChannel(realtimeChannel); } catch(e){} }
    realtimeChannel = null;
    currentRoundId = null;
    currentRoundCode = null;
    roundMarkedFinished = false;
    const rc = document.getElementById('roundCodeSection'); if(rc) rc.style.display = 'none';
    goTo(0);
  }
  (function setupBackButtons(){
    const s3 = document.getElementById('s3Back');
    if(s3) s3.addEventListener('click', ()=>{
      if(currentRoundId && !confirm('¿Salir de esta partida?\nQueda guardada y la puedes retomar desde "Últimas partidas".')) return;
      leaveCurrentRound();
    });
    const s4 = document.getElementById('s4Back');
    if(s4) s4.addEventListener('click', ()=> goTo(3));
    document.querySelectorAll('.back-home').forEach(b => b.addEventListener('click', ()=> goTo(0)));
  })();
  let roundMarkedFinished = false; // true solo tras pulsar "Finalizar ronda": entonces se puede compartir el resultado
  function showRoundCode(code){
    currentRoundCode = code;
    const section = document.getElementById('roundCodeSection');
    const value = document.getElementById('roundCodeValue');
    if(section) section.style.display = '';
    if(value) value.textContent = code;
  }

  async function createSharedRound(){
    const client = initSupabase();
    if(!client){ setSyncStatus('error'); return; }
    matchGroups[activeGroup].scores = collectGroupScores(); // por si ya hay golpes escritos en pantalla
    const code = genRoundCode();
    setSyncStatus('connecting');
    try {
      const { data, error } = await client.from('rounds').insert({
        code: code,
        course_id: selectedCourse ? selectedCourse.id : null,
        course_name: selectedCourse ? selectedCourse.name : null,
        course_par: selectedCourse ? selectedCourse.par : null,
        course_hcp: selectedCourse ? (selectedCourse.hcp || null) : null,
        scoring_type: scoringType,
        match_groups: matchGroups,
        round_name: roundName || null,
      }).select().single();
      if(error) throw error;
      currentRoundId = data.id;
      showRoundCode(data.code);
      rememberRoundCode(data.code, data.course_name, data.round_name);
      updateS3Title();
      subscribeToRound(data.id);
      setSyncStatus('live');
    } catch(e){
      console.error('No se pudo crear la partida compartida', e);
      setSyncStatus('error');
    }
  }

  async function joinSharedRound(codeRaw){
    roundMarkedFinished = false;
    const client = initSupabase();
    if(!client) return { ok: false, msg: 'Sin conexión a la base de datos.' };
    const code = (codeRaw || '').trim().toUpperCase();
    if(code.length < 4) return { ok: false, msg: 'Escribe el código completo.' };
    try {
      const { data, error } = await client.from('rounds').select('*').eq('code', code).single();
      if(error || !data) return { ok: false, msg: 'No encontramos ninguna partida con ese código.' };
      currentRoundId = data.id;
      leagueHandicapUpdateScheduled = false; // ronda distinta: permitir recalcular la liga cuando esta termine
      roundName = data.round_name || '';
      matchGroups = (data.match_groups && data.match_groups.length) ? normalizeMatchGroups(data.match_groups) : matchGroups;
      const course = COURSES.find(c => c.id === data.course_id);
      selectedCourse = course || (data.course_name ? {
        id: data.course_id || 'custom',
        name: data.course_name,
        par: (data.course_par && data.course_par.length) ? data.course_par : Array(18).fill(4),
        hcp: data.course_hcp || null,
        holes9: false,
      } : selectedCourse);
      activeGroup = 0;
      diagAnswers = {};
      scoringType = data.scoring_type || 'stableford';
      currentHole = 1;
      const g0 = matchGroups[0];
      players = g0.players.length ? g0.players : ['Jugador 1'];
      playerHandicaps = g0.handicaps.length ? g0.handicaps : [0];
      rememberRoundCode(data.code, data.course_name, data.round_name);
      updateS3Title();
      if(selectedCourse){
        restoringScores = true;
        applyCourseToScoreGrids(selectedCourse);
        applyGroupScores(g0.scores || {});
        restoringScores = false;
        recalcResultados();
      }
      renderGroupSwitcher();
      // Con muchos grupos, o saliendo al tiro, se abre directamente el grupo del dueño del móvil
      if(matchGroups.filter(g => g.players.length).length > GRUPOS_EN_PESTANAS || matchGroups.some(g => g.hoyoSalida)){
        let yo = ''; try { yo = localStorage.getItem('golfAppConvMe') || ''; } catch(e){}
        const mi = yo ? matchGroups.findIndex(g => g.players.includes(yo)) : -1;
        if(mi > 0) switchGroup(mi);
      }
      // Salida al tiro: si el grupo aún no ha apuntado nada, se empieza en su hoyo de salida
      if(typeof grupoEmpiezaEnSuHoyo === 'function' && grupoEmpiezaEnSuHoyo()) renderHoleView();
      showRoundCode(data.code);
      subscribeToRound(data.id);
      setSyncStatus('live');
      // Jugadores que aún no han apuntado golpes: con el hándicap vigente, no con el de cuando se creó la partida
      if(typeof fetchCurrentHandicaps === 'function'){
        fetchCurrentHandicaps().then(map => { if(map && currentRoundId === data.id) applyHandicapsToOpenRound(map); });
      }
      return { ok: true };
    } catch(e){
      console.error('No se pudo unir a la partida', e);
      return { ok: false, msg: 'No se pudo conectar. Revisa tu internet e inténtalo de nuevo.' };
    }
  }

  function subscribeToRound(id){
    const client = initSupabase();
    if(!client) return;
    if(realtimeChannel){ client.removeChannel(realtimeChannel); realtimeChannel = null; }
    realtimeChannel = client.channel('round-' + id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rounds', filter: 'id=eq.' + id }, payload => {
        if(suppressRemoteEcho) return;
        const row = payload.new;
        if(!row || !row.match_groups) return;
        matchGroups = normalizeMatchGroups(row.match_groups);
        if(row.scoring_type) scoringType = row.scoring_type;
        if(row.round_name) { roundName = row.round_name; updateS3Title(); }
        const g = matchGroups[activeGroup] || matchGroups[0];
        players = g.players.length ? g.players : ['Jugador 1'];
        playerHandicaps = g.handicaps.length ? g.handicaps : [0];
        if(selectedCourse){
          restoringScores = true;
          applyCourseToScoreGrids(selectedCourse);
          applyGroupScores(g.scores || {});
          restoringScores = false;
          recalcResultados();
        }
        renderGroupSwitcher();
        if(current === 4) renderDiagnostico();
      })
      .subscribe(status => { setSyncStatus(status === 'SUBSCRIBED' ? 'live' : 'connecting'); });
  }

  // Guarda en Supabase el estado actual de la partida (con un pequeño retraso para no saturar)
  let restoringScores = false; // true mientras se reconstruye la tarjeta antes de repoblarla (evita guardar una tarjeta vacía a medio camino)
  // Copia de seguridad local: no depende de la conexión ni de que exista partida en vivo
  function saveLocalBackup(){
    try {
      localStorage.setItem('golfAppLocalBackup', JSON.stringify({
        matchGroups, scoringType, currentHole, activeGroup, players, playerHandicaps,
        courseId: selectedCourse ? selectedCourse.id : null,
        roundCode: currentRoundCode || null,
        savedAt: new Date().toISOString(),
      }));
    } catch(e){}
  }
  function loadLocalBackup(){
    try { const raw = localStorage.getItem('golfAppLocalBackup'); return raw ? JSON.parse(raw) : null; } catch(e){ return null; }
  }
  function clearLocalBackup(){
    try { localStorage.removeItem('golfAppLocalBackup'); } catch(e){}
  }

  function saveRoundState(){
    if(restoringScores) return;
    matchGroups[activeGroup].scores = collectGroupScores();
    saveLocalBackup(); // siempre, haya o no conexión
    if(!currentRoundId) return;
    const client = initSupabase();
    if(!client) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async ()=>{
      suppressRemoteEcho = true;
      try {
        await client.from('rounds').update({
          match_groups: matchGroups,
          updated_at: new Date().toISOString(),
        }).eq('id', currentRoundId);
      } catch(e){
        console.error('No se pudo guardar la partida', e);
      }
      setTimeout(()=>{ suppressRemoteEcho = false; }, 400);
    }, 600);
  }

  // Historial real: partidas jugadas con esta app en este móvil
  // ¿Tiene esta ronda a todos sus jugadores con los 18 hoyos rellenos?
  function isRoundFinished(matchGroups){
    let hasAnyPlayer = false;
    return (matchGroups || []).every(group => (group.players || []).every((name, pIndex) => {
      if(!name) return true;
      hasAnyPlayer = true;
      const scores = group.scores && group.scores[pIndex];
      if(!scores) return false;
      const filled = Object.keys(scores).filter(h => scores[h] !== '' && scores[h] != null).length;
      return filled >= 18;
    })) && hasAnyPlayer;
  }

  // Busca, entre las partidas recordadas en este móvil, una sin terminar en este mismo campo
  // (para avisar antes de crear otra por error, en vez de dejar que pase sin más)
  async function findUnfinishedRoundForCourse(courseId){
    const client = initSupabase();
    if(!client || !courseId) return null;
    const history = getLocalRoundHistory();
    if(!history.length) return null;
    try {
      const { data } = await client.from('rounds').select('code, course_id, match_groups, updated_at').in('code', history.map(r => r.code));
      if(!data) return null;
      const candidates = data.filter(r => r.course_id === courseId && !isRoundFinished(r.match_groups));
      candidates.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      return candidates[0] || null;
    } catch(e){ return null; }
  }

  // Escapa texto que escriben los usuarios (nombres, títulos) antes de meterlo en el HTML
  function escapeHtml(str){
    return String(str == null ? '' : str).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }

  // Partidas recientes de todos los jugadores (no solo las de este móvil), las más recientes primero;
  // si no hay conexión, se usa el historial guardado en este móvil
  async function fetchRecentRounds(){
    const client = initSupabase();
    if(client){
      try {
        const { data, error } = await client.from('rounds')
          .select('code, course_name, round_name, match_groups, updated_at')
          .not('course_id', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(15);
        if(!error && data){
          return data
            .map(r => ({
              code: r.code,
              courseName: r.course_name || '',
              roundName: r.round_name || '',
              date: r.updated_at,
              players: (r.match_groups || []).flatMap(g => (g.players || []).filter(Boolean)),
              finished: isRoundFinished(r.match_groups),
            }))
            .filter(r => r.players.length) // fuera las partidas creadas y abandonadas sin jugadores
            .slice(0, 10);
        }
      } catch(e){ /* sin conexión: se tira del historial local */ }
    }
    return getLocalRoundHistory().slice(0, 5).map(r => ({ ...r, players: [], finished: null }));
  }

  async function renderRecentRounds(){
    if(typeof refreshAdminUI === 'function') refreshAdminUI();
    const list = document.getElementById('recentRoundsList');
    const empty = document.getElementById('recentRoundsEmpty');
    if(!list) return;
    const recent = await fetchRecentRounds();
    if(typeof renderHomeEnMarcha === 'function') renderHomeEnMarcha(recent);
    if(!recent.length){
      list.innerHTML = '';
      if(empty) empty.style.display = '';
      return;
    }
    if(empty) empty.style.display = 'none';
    // Las que están sin terminar, arriba
    const isAdmin = !!getAdminKey();
    const sorted = recent.slice().sort((a, b) => (a.finished === false ? 0 : 1) - (b.finished === false ? 0 : 1));
    list.innerHTML = sorted.map(r => {
      const unfinished = r.finished === false;
      const title = escapeHtml(r.roundName || r.courseName || 'Partida');
      const who = r.players.length ? escapeHtml(r.players.map(n => n.split(' ')[0]).join(', ')) + ' · ' : '';
      return '<div class="recent-row"' + (unfinished ? ' style="background:var(--gold-soft-bg); margin:4px -8px; padding:12px; border-top:none; border-radius:14px;"' : '') + '>'
        + '<div><div class="club">' + title + (unfinished ? ' · <span style="color:var(--gold-ink, var(--gold-fg)); font-weight:700;">sin terminar</span>' : '') + '</div><div class="date">' + who + escapeHtml(r.courseName || 'Campo') + ' · ' + formatShortDate(r.date.slice(0, 10)) + '</div></div>'
        + '<div style="display:flex; gap:8px; align-items:center; flex:none;">'
        + (isAdmin ? '<div class="delete-btn" data-delete-code="' + escapeHtml(r.code) + '" data-title="' + title + '" data-terminada="' + (unfinished ? '' : '1') + '" title="Borrar partida" aria-label="Borrar partida">Borrar</div>' : '')
        + '<div class="play-btn" data-code="' + escapeHtml(r.code) + '" style="cursor:pointer;">' + (unfinished ? 'Continuar' : 'Ver') + '</div>'
        + '</div></div>';
    }).join('');
    list.querySelectorAll('.delete-btn[data-delete-code]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        if(btn.dataset.busy) return;
        const aviso = btn.dataset.terminada ? '\nOjo: está terminada. Sus golpes saldrán de la liga y los hándicaps se recalcularán.' : '';
        if(!confirm('¿Borrar la partida "' + btn.dataset.title + '"?\nSe borrará para todos los jugadores y no se puede deshacer.' + aviso)) return;
        btn.dataset.busy = '1'; btn.textContent = 'Borrando…';
        const res = await deleteSharedRound(btn.dataset.deleteCode);
        if(res.ok){ renderRecentRounds(); }
        else { alert(res.msg); delete btn.dataset.busy; btn.textContent = 'Borrar'; }
      });
    });
    list.querySelectorAll('.play-btn[data-code]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const res = await joinSharedRound(btn.dataset.code);
        if(res.ok) goTo(3);
      });
    });
  }


  // --- "Últimas partidas" se refresca sola: al instante cuando alguien crea o apunta en una partida,
  // cada 20 s mientras estás en el inicio (por si falla el tiempo real) y al volver a la app ---
  (function setupLiveRecentRounds(){
    let homeTimer = null, pending = false;
    const refresh = ()=>{
      if(typeof current === 'undefined' || current !== 0) return;
      if(document.hidden) return;
      if(pending) return;
      pending = true;
      setTimeout(async ()=>{ pending = false; try { await renderRecentRounds(); } catch(e){} }, 800); // agrupa varios cambios seguidos
    };
    const client = initSupabase();
    if(client){
      try {
        client.channel('rounds-home')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rounds' }, refresh)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rounds' }, refresh)
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rounds' }, refresh)
          .subscribe();
      } catch(e){ /* sin tiempo real: queda el refresco periódico */ }
    }
    homeTimer = setInterval(refresh, 20000);
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) refresh(); });
    window.addEventListener('focus', refresh);
  })();
