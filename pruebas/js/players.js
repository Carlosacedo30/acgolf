/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  let playerHandicaps = [0];
  // Golpes de regalo que le tocan a un hándicap en un hoyo de un índice de dificultad dado (1-18)
  function strokesForHole(handicap, strokeIndex){
    if(isNaN(handicap) || handicap <= 0) return 0;
    const h = Math.round(handicap);
    return Math.floor(h / 18) + ((h % 18) >= strokeIndex ? 1 : 0);
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
  // Dificultad oficial de cada campo de la liga (barras amarillas). Hato Verde ya con el hoyo 6 de par 3.
  // Debe coincidir con la función hcp_campo de la base de datos.
  const CAMPO_DIFICULTAD = { 'hato-verde': { cr: 68.3, sl: 122 }, 'zaudin': { cr: 70.5, sl: 133 } };
  // Hándicap de campo (regla oficial): hándicap × slope ÷ 113 + (rating − par). Sin datos del campo, el hándicap tal cual.
  function hcpCampo(h, curso){
    const v = Number(h) || 0;
    const c = curso || (typeof selectedCourse !== 'undefined' ? selectedCourse : null);
    const d = c && CAMPO_DIFICULTAD[c.id];
    if(!d || !Array.isArray(c.par)) return v;
    const par = c.par.reduce((a, b) => a + (Number(b) || 0), 0);
    return Math.round(v * d.sl / 113 + (d.cr - par));
  }
  // Hándicap con el que se juega de verdad: el del campo y, encima, el porcentaje de la modalidad
  function ajusteHcp(h){
    const v = hcpCampo(h);
    const f = factorHcpModo();
    return f === 1 ? v : Math.round(v * f * 10) / 10;
  }
  function hcpJuego(pIndex){ return ajusteHcp(playerHandicaps[pIndex]); }
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
