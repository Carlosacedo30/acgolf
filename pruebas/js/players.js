/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  let playerHandicaps = [0];
  // Golpes de regalo que le tocan a un hándicap en un hoyo de un índice de dificultad dado (1-18)
  function strokesForHole(handicap, strokeIndex){
    if(isNaN(handicap) || Math.round(handicap) === 0) return 0;
    const h = Math.round(handicap);
    const base = (typeof hoyosPartida === 'function') ? hoyosPartida() : 18; // 9 hoyos: los golpes se reparten en 9
    if(h < 0){ const a = -h; return -(Math.floor(a / base) + ((a % base) >= (base + 1 - strokeIndex) ? 1 : 0)); } // plus: devuelve golpes en los hoyos más fáciles
    return Math.floor(h / base) + ((h % base) >= strokeIndex ? 1 : 0);
  }

  // Define quiénes juegan esta ronda (1 a 4 jugadores) y sus hándicaps
  function setPlayers(names, handicaps){
    players = names && names.length ? names.slice(0, 4) : ['Jugador 1'];
    playerHandicaps = players.map((n, i) => (handicaps && !isNaN(handicaps[i])) ? handicaps[i] : 0);
  }

  // --- Modalidad de juego: Individual, Mejor bola (Fourball) o Parejas (Foursome) ---
  // Se guarda en cada grupo (g.modo). Parejas por posición: jugadores 1 y 2 = Pareja A; 3 y 4 = Pareja B.
  //  · Fourball: cada uno juega su bola y en cada hoyo cuenta la mejor de la pareja.
  //    Hándicap de juego: 85 % (Stroke Play y Stableford) o 90 % (Match Play), como recomienda la RFEG.
  //  · Foursome: una sola bola por pareja (golpes alternos). Se anota un resultado por pareja
  //    con el 50 % de la suma de los dos hándicaps.
  const MODOS = { individual:'Individual', fourball:'Mejor bola (Fourball)', foursome:'Parejas (Foursome)' };
  function modoDesdeTexto(t){
    t = String(t || '').toLowerCase();
    return t.includes('fourball') ? 'fourball' : t.includes('foursome') ? 'foursome' : 'individual';
  }
  function modoPartida(){
    const g = (matchGroups || []).find(x => x && x.players && x.players.length);
    return (g && g.modo) || 'individual';
  }
  function esParejas(){ return modoPartida() !== 'individual'; }
  function factorHcpModo(){
    if(modoPartida() !== 'fourball') return 1;
    return (typeof scoringType !== 'undefined' && scoringType === 'matchplay') ? 0.9 : 0.85;
  }
  // Barras de salida. Cada grupo puede guardar "barras" (una por jugador, en el orden de "players").
  // Sin barra guardada se juega desde amarillas (la de siempre de la liga).
  // Debe coincidir con las funciones campo_rating / campo_slope / hcp_campo de la base de datos.
  const BARRAS_SALIDA = ['blancas', 'amarillas', 'azules', 'rojas'];
  const BARRA_DEFECTO = 'amarillas';
  function barraDe(g, i){
    if(!g || (g.modo && g.modo !== 'individual')) return BARRA_DEFECTO; // por parejas: amarillas
    const b = Array.isArray(g.barras) ? g.barras[i] : null;
    return BARRAS_SALIDA.includes(b) ? b : BARRA_DEFECTO;
  }
  // Rating y slope oficiales de un campo y una barra (de "tees" en data.js). null si el campo no los tiene.
  function dificultadCampo(curso, barra){
    const real = curso && (typeof COURSES !== 'undefined' ? COURSES.find(x => x.id === curso.id) : null);
    const tees = (real && real.tees) || (curso && curso.tees);
    return tees ? (tees[barra] || tees[BARRA_DEFECTO] || null) : null;
  }
  // Hándicap de campo (regla oficial): hándicap × slope ÷ 113 + (rating − par), con el rating y slope
  // de la barra desde la que sale el jugador. Sin datos del campo, el hándicap tal cual.
  function hcpCampo(h, curso, barra, pct){ // pct: porcentaje (0.95 en 9 hoyos individual); se redondea una sola vez al final
    const v = Number(h) || 0;
    const c = curso || (typeof selectedCourse !== 'undefined' ? selectedCourse : null);
    const d = c && dificultadCampo(c, barra || BARRA_DEFECTO);
    if(!d || !Array.isArray(c.par)) return v * (c && c.nueve ? 0.5 : 1) * (pct || 1); // sin datos del campo: el hándicap tal cual (en 9 hoyos, la mitad)
    const vueltas = c.holes9 && c.par.length === 9 && !c.nueve ? 2 : 1; // 9 hoyos: se juegan dos vueltas
    const mitad = c.nueve ? 0.5 : 1; // partida de 9 hoyos: medio hándicap (regla de la Federación para 9 hoyos)
    const par = c.par.reduce((a, b) => a + (Number(b) || 0), 0) * vueltas;
    return Math.round((v * mitad * d.slope / 113 + (d.rating * vueltas - par)) * (pct || 1) + 1e-9); // +1e-9: el medio golpe exacto sube, como en la base de datos
  }
  // Hándicap con el que se juega de verdad: el del campo (según su barra) y, encima, el porcentaje de la modalidad
  // Porcentaje del hándicap de campo (sin redondear) según la Federación: individual 95 % (stroke play y Stableford),
  // mejor bola 85 % (90 % en Match Play), Match Play individual 100 %. Parejas y Scramble traen ya sus golpes calculados.
  // En 18 hoyos el 95 % vale para las partidas desde el 13-nov-2026 (las anteriores se quedan como se jugaron).
  const DESDE_95_18 = '2026-11-13T00:00:00+01:00';
  function pctJuego(modo, scoring, nueve, fecha){
    modo = modo || 'individual';
    if(modo === 'fourball') return scoring === 'matchplay' ? 0.9 : 0.85;
    if(modo !== 'individual' || scoring === 'matchplay') return undefined;
    if(nueve) return 0.95;
    const t = fecha ? Date.parse(fecha) : NaN;
    return (isNaN(t) || t >= Date.parse(DESDE_95_18)) ? 0.95 : undefined;
  }
  function ajusteHcp(h, barra){
    const c9 = (typeof selectedCourse !== 'undefined' ? selectedCourse : null);
    return hcpCampo(h, null, barra, pctJuego(modoPartida(), typeof scoringType !== 'undefined' ? scoringType : undefined, !!(c9 && c9.nueve), window.acgolfRondaCreada));
  }
  function hcpJuego(pIndex){
    const g = (typeof matchGroups !== 'undefined' && typeof activeGroup !== 'undefined') ? matchGroups[activeGroup] : null;
    let v = ajusteHcp(playerHandicaps[pIndex], barraDe(g, pIndex));
    // Match Play: el de menos golpes juega con cero y los demás reciben la diferencia (en los hoyos más difíciles)
    if(g && typeof scoringType !== 'undefined' && scoringType === 'matchplay'){
      const todos = (playerHandicaps || []).map((hh, i) => (g.players && g.players[i]) ? ajusteHcp(hh, barraDe(g, i)) : null).filter(x => x != null);
      if(todos.length > 1) v -= Math.min.apply(null, todos);
    }
    return v;
  }
  // Parejas de un grupo en Fourball: [[0,1],[2,3]] (solo las posiciones con jugador)
  function parejasFourball(lista){
    const n = (lista || []).filter(Boolean).length;
    const out = [];
    for(let i = 0; i < n; i += 2) out.push([i, i + 1].filter(k => k < n));
    return out;
  }
  function nombreCorto(n){ return String(n || '').trim().split(/\s+/)[0] || ''; }
  function nombrePareja(nombres){ return nombres.filter(Boolean).map(nombreCorto).join(' y '); }
  const LETRA_PAREJA = ['A', 'B'];
  // Deja los grupos listos para la modalidad elegida (se llama justo al empezar la partida)
  function prepararModalidad(modo){
    matchGroups.forEach(g => {
      if(!g.players || !g.players.length){ delete g.modo; delete g.parejas; return; }
      if(g.modo === 'foursome' && g.parejas) return; // ya preparado
      g.modo = modo;
      delete g.parejas;
      if(modo !== 'foursome') return;
      const parejas = [];
      for(let i = 0; i < g.players.length; i += 2){
        const nombres = g.players.slice(i, i + 2);
        const hcps = nombres.map((n, k) => Number(g.handicaps[i + k]) || 0);
        parejas.push({ nombres, hcps });
      }
      g.parejas = parejas;
      g.players = parejas.map(p => p.nombres.join(' / '));
      g.handicaps = parejas.map(p => Math.round(p.hcps.reduce((a, b) => a + b, 0) * 0.5 * 10) / 10);
      g.scores = {};
    });
  }
  // ¿Hay algún grupo con número impar de jugadores? (en parejas tienen que ser 2 o 4)
  function gruposImpares(grupos){
    return grupos.map((g, i) => ({ i, n: (g.players || []).filter(Boolean).length })).filter(x => x.n % 2 === 1);
  }

  // Hasta 4 grupos de 4 jugadores jugando la misma ronda, cada uno con su propia tarjeta
  // (la versión de pruebas sube a 8 grupos: 32 jugadores)
  const MAX_GROUPS = 8;
  const GRUPOS_EN_PESTANAS = 4; // con más grupos, en vez de pestañas sale «‹ Grupo 3 de 7 ›»
  let matchGroups = Array.from({ length: MAX_GROUPS }, () => ({ players: [], handicaps: [], scores: {} }));
  let configGroup = 0; // qué grupo se está rellenando en "Configurar partida"
  let activeGroup = 0; // qué grupo se está viendo en "Introducir resultados" / Diagnóstico
  let roundName = ''; // nombre de la partida, obligatorio

  function readConfigFields(){
    const slots = ['player1', 'player2', 'player3', 'player4'].map(id => ({
      name: ((document.getElementById(id + 'Input') || {}).value || '').trim(),
      hcp: parseFloat((document.getElementById(id + 'Hcp') || {}).value),
    })).filter(s => s.name.length > 0);
    return { players: slots.map(s => s.name), handicaps: slots.map(s => isNaN(s.hcp) ? 0 : s.hcp) };
  }
  function writeConfigFields(group){
    const g = matchGroups[group];
    for(let i = 0; i < 4; i++){
      const nameInput = document.getElementById('player' + (i + 1) + 'Input');
      const hcpInput = document.getElementById('player' + (i + 1) + 'Hcp');
      if(nameInput) nameInput.value = g.players[i] || '';
      if(hcpInput) hcpInput.value = g.handicaps[i] ? g.handicaps[i] : '';
    }
    if(typeof lockLeagueHcpInputs === 'function') lockLeagueHcpInputs();
  }
  function saveConfigGroupFields(){
    const data = readConfigFields();
    matchGroups[configGroup].players = data.players;
    matchGroups[configGroup].handicaps = data.handicaps;
    delete matchGroups[configGroup].modo; delete matchGroups[configGroup].parejas;
  }

  // Recoge/aplica los golpes ya escritos en la tarjeta, por jugador y hoyo (para cambiar de grupo sin perderlos)
  function collectGroupScores(){
    const scores = {};
    document.querySelectorAll('.golpes-row').forEach(row=>{
      const pIndex = row.dataset.playerIndex;
      scores[pIndex] = scores[pIndex] || {};
      row.querySelectorAll('.golpes-input').forEach(input=>{
        scores[pIndex][input.dataset.hole] = input.value;
      });
    });
    return scores;
  }
  function applyGroupScores(scores){
    document.querySelectorAll('.golpes-row').forEach(row=>{
      const pIndex = row.dataset.playerIndex;
      row.querySelectorAll('.golpes-input').forEach(input=>{
        const v = scores[pIndex] && scores[pIndex][input.dataset.hole];
        input.value = v !== undefined ? v : '';
      });
    });
  }
  function renderGroupSwitcher(){
    const section = document.getElementById('groupSwitchSection');
    const wrap = document.getElementById('groupSwitchToggle');
    if(!section || !wrap) return;
    const groupsWithPlayers = matchGroups.filter(g => g.players.length).length;
    if(groupsWithPlayers <= 1){ section.style.display = 'none'; return; }
    section.style.display = '';
    if(groupsWithPlayers > GRUPOS_EN_PESTANAS){ renderGroupStepper(wrap); return; }
    wrap.classList.remove('grp-paso');
    wrap.innerHTML = matchGroups.map((g, i) => g.players.length ?
      '<div class="tab' + (i === activeGroup ? ' active' : '') + '" data-g="' + i + '">Grupo ' + (i + 1) + ' (' + g.players.length + ')</div>' : ''
    ).join('');
    wrap.querySelectorAll('.tab').forEach(tab=>{
      tab.addEventListener('click', ()=> switchGroup(parseInt(tab.dataset.g, 10)));
    });
  }
  // Muchos grupos: solo se ve el grupo abierto, con flechas para pasar al anterior o al siguiente
  function renderGroupStepper(wrap){
    const con = matchGroups.map((g, i) => g.players.length ? i : -1).filter(i => i >= 0);
    let pos = con.indexOf(activeGroup); if(pos < 0) pos = 0;
    const g = matchGroups[con[pos]] || { players: [] };
    const yo = (()=>{ try { return localStorage.getItem('golfAppConvMe') || ''; } catch(e){ return ''; } })();
    const miG = yo ? con.find(i => matchGroups[i].players.includes(yo)) : undefined;
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    wrap.classList.add('grp-paso');
    wrap.innerHTML = '<button type="button" class="grp-flecha" data-d="-1" aria-label="Grupo anterior"' + (pos ? '' : ' disabled') + '>‹</button>'
      + '<div class="grp-centro"><b>Grupo ' + (con[pos] + 1) + ' <small>de ' + con.length + '</small>' + (miG === con[pos] ? ' <em>· el tuyo</em>' : '') + '</b>'
      + '<span>' + g.players.map(n => esc(String(n).split(/\s+/)[0])).join(', ') + '</span></div>'
      + '<button type="button" class="grp-flecha" data-d="1" aria-label="Grupo siguiente"' + (pos < con.length - 1 ? '' : ' disabled') + '>›</button>'
      + (miG !== undefined && miG !== con[pos] ? '<button type="button" class="grp-mio">Ir a mi grupo</button>' : '');
    wrap.querySelectorAll('.grp-flecha').forEach(b => b.addEventListener('click', ()=>{
      const n = con[pos + Number(b.dataset.d)]; if(n !== undefined) switchGroup(n);
    }));
    const mio = wrap.querySelector('.grp-mio'); if(mio) mio.addEventListener('click', ()=> switchGroup(miG));
  }
  function switchGroup(newGroup){
    if(newGroup === activeGroup) return;
    matchGroups[activeGroup].scores = collectGroupScores();
    activeGroup = newGroup;
    const g = matchGroups[activeGroup];
    players = g.players.length ? g.players : ['Jugador 1'];
    playerHandicaps = g.handicaps.length ? g.handicaps : [0];
    if(selectedCourse){
      restoringScores = true;
      applyCourseToScoreGrids(selectedCourse);
      applyGroupScores(g.scores);
      restoringScores = false;
      recalcResultados();
    }
    renderGroupSwitcher();
    if(typeof grupoEmpiezaEnSuHoyo === 'function' && grupoEmpiezaEnSuHoyo() && typeof renderHoleView === 'function') renderHoleView();
    diagActivePlayer = 0;
    saveRoundState();
  }
