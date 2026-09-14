  // ---- Interacciones dentro de cada pantalla ----

  // Grupos de selección simple: solo uno activo dentro del mismo contenedor padre inmediato
  function setupExclusiveGroup(selector, activeClass){
    document.querySelectorAll(selector).forEach(el=>{
      el.addEventListener('click', ()=>{
        const siblings = el.parentElement.querySelectorAll(selector);
        siblings.forEach(s=>s.classList.remove(activeClass));
        el.classList.add(activeClass);
      });
    });
  }
  setupExclusiveGroup('.pill-opt', 'selected');
  setupExclusiveGroup('.modality-opt', 'selected');
  setupExclusiveGroup('.tee-opt', 'selected');
  setupExclusiveGroup('.gender-toggle .tab', 'active');

  // Pestañas Ida/Vuelta: alternan bloques de 9 hoyos (Añadir campo e Introducir resultados)
  document.querySelectorAll('.tab-toggle').forEach(toggle=>{
    const tabs = toggle.querySelectorAll('.tab');
    tabs.forEach(tab=>{
      tab.addEventListener('click', ()=>{
        tabs.forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        const nine = tab.dataset.nine;
        if(!nine) return;
        const container = toggle.closest('section');
        container.querySelectorAll('.nine-block').forEach(block=>{
          block.style.display = (block.dataset.nine === nine) ? '' : 'none';
        });
      });
    });
  });

  // Pantalla "Jugar": elegir entre crear partida (buscar campo) o unirse con código
  const startChoiceCrear = document.getElementById('startChoiceCrear');
  const startChoiceCodigo = document.getElementById('startChoiceCodigo');
  const createGameSection = document.getElementById('createGameSection');
  const joinGameSection = document.getElementById('joinGameSection');
  if(startChoiceCrear && startChoiceCodigo){
    startChoiceCrear.addEventListener('click', ()=>{
      startChoiceCrear.classList.add('active');
      startChoiceCodigo.classList.remove('active');
      createGameSection.style.display = '';
      joinGameSection.style.display = 'none';
      const input = document.getElementById('screen0-search');
      if(input) input.focus();
    });
    startChoiceCodigo.addEventListener('click', ()=>{
      startChoiceCodigo.classList.add('active');
      startChoiceCrear.classList.remove('active');
      joinGameSection.style.display = '';
      createGameSection.style.display = 'none';
      const input = document.getElementById('joinCodeInput');
      if(input) input.focus();
    });
  }

  // Pantalla "Jugar": desplegable de campos (poblado desde COURSES), cerrado hasta que se toque o se escriba
  renderDropdown('');
  const screen0Search = document.getElementById('screen0-search');
  if(screen0Search){
    screen0Search.addEventListener('focus', ()=>{ renderDropdown(screen0Search.value); openDropdown(); });
    screen0Search.addEventListener('input', ()=>{ renderDropdown(screen0Search.value); openDropdown(); });
  }
  document.addEventListener('click', (e)=>{
    const searchBox = screen0Search ? screen0Search.closest('.search-box') : null;
    const dropdown = document.getElementById('screen0-dropdown');
    if(!dropdown) return;
    if(searchBox && (searchBox.contains(e.target) || dropdown.contains(e.target))) return;
    closeDropdown();
  });

  // Pantalla "Jugar": botón "Jugar" en recientes pasa primero por "Configurar partida" (para poner jugadores)
  document.querySelectorAll('.recent-row .play-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const row = btn.closest('.recent-row');
      const courseName = row ? row.querySelector('.club').textContent.trim() : '';
      const match = COURSES.find(c => c.name === courseName);
      if(match) selectCourse(match);
      goTo(1);
    });
  });

  // Botones de navegación de flujo dentro de cada pantalla
  const clickGoTo = (id, n) => { const el = document.getElementById(id); if(el) el.addEventListener('click', ()=> goTo(n)); };
  clickGoTo('cancelarCampoBtn', 0);
  clickGoTo('finalizarRondaBtn', 4);
  clickGoTo('guardarLuegoBtn', 0);

  // "Configurar partida": pestañas Grupo 1 a 4 (no pierden lo escrito al cambiar)
  document.querySelectorAll('#configGroupToggle .tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      saveConfigGroupFields();
      document.querySelectorAll('#configGroupToggle .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      configGroup = parseInt(tab.dataset.group, 10);
      writeConfigFields(configGroup);
    });
  });

  // "Configurar partida": recoge ambos grupos (1 a 4 jugadores cada uno, con hándicap) antes de empezar a anotar
  const empezarPartidaBtn = document.getElementById('empezarPartidaBtn');
  if(empezarPartidaBtn) empezarPartidaBtn.addEventListener('click', ()=>{
    saveConfigGroupFields();
    const scoringPill = document.querySelector('#scoringTypeRow .pill-opt.selected');
    scoringType = scoringPill ? scoringPill.dataset.scoring : 'stableford';
    currentRoundId = null; // ronda nueva: cortar cualquier guardado que aún apunte a la partida anterior
    const rcSection = document.getElementById('roundCodeSection');
    if(rcSection) rcSection.style.display = 'none';
    matchGroups.forEach(g => { g.scores = {}; }); // ronda nueva: se borran golpes guardados de los 4 grupos
    currentHole = 1;
    activeGroup = 0;
    diagAnswers = {};
    const g0 = matchGroups[0];
    setPlayers(g0.players, g0.handicaps);
    rememberPlayers(matchGroups.reduce((acc, g) => acc.concat(g.players), []));
    if(selectedCourse) applyCourseToScoreGrids(selectedCourse);
    renderGroupSwitcher();
    createSharedRound();
    goTo(3);
  });

  // Buscadores de "Jugador 1..4" con sugerencias de jugadores usados antes
  ['player1', 'player2', 'player3', 'player4'].forEach(id => setupPlayerSearch(id + 'Input', id + 'Dropdown'));

  // "Añadir campo": guarda el campo nuevo (con los pares que se hayan escrito) y pasa a anotar resultados
  const guardarCampoBtn = document.getElementById('guardarCampoBtn');
  if(guardarCampoBtn) guardarCampoBtn.addEventListener('click', ()=>{
    const name = (document.getElementById('campoNombreInput') || {}).value || 'Campo nuevo';
    const readNineRow = (gridId, rowIndex, fallback) => {
      const grid = document.getElementById(gridId);
      if(!grid) return [fallback,fallback,fallback,fallback,fallback,fallback,fallback,fallback,fallback];
      const row = grid.querySelector('.grid-row:nth-of-type(' + rowIndex + ')');
      return Array.from(row.querySelectorAll('.grid-cell input')).map(input => parseInt(input.value, 10) || fallback);
    };
    const customCourse = {
      id: 'custom-' + Date.now(),
      name: name,
      location: (document.getElementById('campoUbicacionInput') || {}).value || '',
      par: readNineRow('campoGridIda', 2, 4).concat(readNineRow('campoGridVuelta', 2, 4)),
      hcp: readNineRow('campoGridIda', 3, 9).concat(readNineRow('campoGridVuelta', 3, 9)),
    };
    currentRoundId = null;
    const rcSection = document.getElementById('roundCodeSection');
    if(rcSection) rcSection.style.display = 'none';
    selectCourse(customCourse, { fromAddCampo: true });
    createSharedRound();
    goTo(3);
  });

  // Pantalla "Jugar": unirse a una partida ya empezada con su código
  const joinCodeBtn = document.getElementById('joinCodeBtn');
  if(joinCodeBtn) joinCodeBtn.addEventListener('click', async ()=>{
    const input = document.getElementById('joinCodeInput');
    const errorEl = document.getElementById('joinCodeError');
    joinCodeBtn.textContent = 'Uniendo…';
    const res = await joinSharedRound(input ? input.value : '');
    joinCodeBtn.textContent = 'Unirme';
    if(!res.ok){
      if(errorEl){ errorEl.textContent = res.msg; errorEl.style.display = ''; }
      return;
    }
    if(errorEl) errorEl.style.display = 'none';
    goTo(3);
  });
