  // --- Partidas compartidas en vivo (Supabase): código, guardado y tiempo real ---
  const SUPABASE_URL = 'https://qjtsjcfalettgvrlwwnr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_HnUJlKmYnPGw8z-CAv87nA_EyN0l-cJ';
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
    return arr.map(g => ({
      players: Array.isArray(g && g.players) ? g.players : [],
      handicaps: Array.isArray(g && g.handicaps) ? g.handicaps : [],
      scores: (g && typeof g.scores === 'object' && g.scores) ? g.scores : {},
    }));
  }

  function getLocalRoundHistory(){
    try {
      const raw = localStorage.getItem('golfAppRoundHistory');
      return raw ? JSON.parse(raw) : [];
    } catch(e){ return []; }
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

  function showRoundCode(code){
    currentRoundCode = code;
    const section = document.getElementById('roundCodeSection');
    const value = document.getElementById('roundCodeValue');
    if(section) section.style.display = '';
    if(value) value.textContent = code;
    const shareLink = document.getElementById('shareCodeWhatsapp');
    if(shareLink){
      const courseName = selectedCourse ? selectedCourse.name : 'el campo';
      const text = '⛳ Partida en ' + courseName + ' — únete con el código ' + code + ' en ' + location.href;
      shareLink.href = 'https://wa.me/?text=' + encodeURIComponent(text);
    }
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
      showRoundCode(data.code);
      subscribeToRound(data.id);
      setSyncStatus('live');
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
  function saveRoundState(){
    if(!currentRoundId || restoringScores) return;
    const client = initSupabase();
    if(!client) return;
    matchGroups[activeGroup].scores = collectGroupScores();
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

  async function renderRecentRounds(){
    const list = document.getElementById('recentRoundsList');
    const empty = document.getElementById('recentRoundsEmpty');
    if(!list) return;
    const history = getLocalRoundHistory();
    if(!history.length){
      list.innerHTML = '';
      if(empty) empty.style.display = '';
      return;
    }
    if(empty) empty.style.display = 'none';
    const recent = history.slice(0, 5);
    let finishedByCode = {}, roundNameByCode = {};
    const client = initSupabase();
    if(client){
      try {
        const { data } = await client.from('rounds').select('code, match_groups, round_name').in('code', recent.map(r => r.code));
        (data || []).forEach(r => { finishedByCode[r.code] = isRoundFinished(r.match_groups); roundNameByCode[r.code] = r.round_name; });
      } catch(e){ /* si falla, se muestra sin la etiqueta de "sin terminar" */ }
    }
    const sorted = recent.slice().sort((a, b) => (finishedByCode[a.code] === false ? 0 : 1) - (finishedByCode[b.code] === false ? 0 : 1));
    list.innerHTML = sorted.map(r => {
      const unfinished = finishedByCode[r.code] === false;
      const title = roundNameByCode[r.code] || r.roundName || r.courseName || 'Partida';
      return '<div class="recent-row"' + (unfinished ? ' style="background:var(--gold-soft); margin:0 -20px; padding:12px 20px; border-top:none;"' : '') + '>'
        + '<div><div class="club">' + title + (unfinished ? ' · <span style="color:var(--gold-ink, var(--gold)); font-weight:700;">sin terminar</span>' : '') + '</div><div class="date">' + (r.courseName || 'Campo') + ' · Código ' + r.code + ' · ' + formatShortDate(r.date.slice(0, 10)) + '</div></div>'
        + '<div class="play-btn" data-code="' + r.code + '" style="cursor:pointer;">Continuar</div></div>';
    }).join('');
    list.querySelectorAll('.play-btn[data-code]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const res = await joinSharedRound(btn.dataset.code);
        if(res.ok) goTo(3);
      });
    });
  }
