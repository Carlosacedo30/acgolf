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

  // Hasta 4 grupos de 4 jugadores jugando la misma ronda, cada uno con su propia tarjeta
  const MAX_GROUPS = 4;
  let matchGroups = Array.from({ length: MAX_GROUPS }, () => ({ players: [], handicaps: [], scores: {} }));
  let configGroup = 0; // qué grupo se está rellenando en "Configurar partida"
  let activeGroup = 0; // qué grupo se está viendo en "Introducir resultados" / Diagnóstico

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
  }
  function saveConfigGroupFields(){
    const data = readConfigFields();
    matchGroups[configGroup].players = data.players;
    matchGroups[configGroup].handicaps = data.handicaps;
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
    wrap.innerHTML = matchGroups.map((g, i) => g.players.length ?
      '<div class="tab' + (i === activeGroup ? ' active' : '') + '" data-g="' + i + '">Grupo ' + (i + 1) + ' (' + g.players.length + ')</div>' : ''
    ).join('');
    wrap.querySelectorAll('.tab').forEach(tab=>{
      tab.addEventListener('click', ()=> switchGroup(parseInt(tab.dataset.g, 10)));
    });
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
    diagActivePlayer = 0;
    saveRoundState();
  }
