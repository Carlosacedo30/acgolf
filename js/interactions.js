/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
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

  // Pantalla "Jugar": elegir campo directamente (Hato Verde o Zaudín) 
  const joinGameSection = document.getElementById('joinGameSection');
  const courseChoices = document.querySelectorAll('.course-choice[data-course-id]');
  function markStartChoice(el){
    document.querySelectorAll('.start-choice-opt').forEach(o => o.classList.toggle('active', o === el));
  }
  courseChoices.forEach(card=>{
    const start = ()=>{
      const course = COURSES.find(c => c.id === card.dataset.courseId);
      if(!course) return;
      markStartChoice(card);
      if(joinGameSection) joinGameSection.style.display = 'none';
      selectCourse(course);
      // Partida nueva de verdad: no arrastrar el nombre/fecha/hora de una anterior
      ['roundNameInput','roundDateInput','roundTimeInput'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
      goTo(1); // despliega "Configurar partida" dentro de Jugar
    };
    card.addEventListener('click', start);
    card.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); start(); } });
  });

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
  clickGoTo('guardarLuegoBtn', 0);

  // "Finalizar ronda": avisa si a algún jugador le faltan hoyos, en vez de dejar que "termine" a medias
  const incompleteRoundOverlay = document.getElementById('incompleteRoundOverlay');
  const incompleteRoundText = document.getElementById('incompleteRoundText');
  const incompleteRoundCancel = document.getElementById('incompleteRoundCancel');
  const incompleteRoundContinue = document.getElementById('incompleteRoundContinue');
  if(incompleteRoundCancel) incompleteRoundCancel.addEventListener('click', ()=>{ incompleteRoundOverlay.style.display = 'none'; });
  if(incompleteRoundContinue) incompleteRoundContinue.addEventListener('click', ()=>{ incompleteRoundOverlay.style.display = 'none'; roundMarkedFinished = true; goTo(4); });
  const finalizarRondaBtn = document.getElementById('finalizarRondaBtn');
  if(finalizarRondaBtn) finalizarRondaBtn.addEventListener('click', ()=>{
    const missing = getPlayerHolesFilled().filter(s => s.filled < 18);
    if(missing.length && incompleteRoundOverlay && incompleteRoundText){
      incompleteRoundText.textContent = 'Todavía les faltan hoyos por anotar:\n'
        + missing.map(s => '• ' + s.name + ': ' + s.filled + '/18 hoyos').join('\n');
      incompleteRoundOverlay.style.display = '';
      return;
    }
    roundMarkedFinished = true;
    goTo(4);
  });

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

  // "Configurar partida": recoge los grupos (1 a 4 jugadores cada uno, con hándicap) y pasa a la
  // confirmación final "Empezar tu partida" (campo + cuadrícula), donde se empieza de verdad
  const empezarPartidaBtn = document.getElementById('empezarPartidaBtn');
  if(empezarPartidaBtn) empezarPartidaBtn.addEventListener('click', ()=>{
    const roundNameInput = document.getElementById('roundNameInput');
    const roundNameError = document.getElementById('roundNameError');
    const typedName = roundNameInput ? roundNameInput.value.trim() : '';
    if(!typedName){
      if(roundNameError) roundNameError.style.display = '';
      if(roundNameInput) roundNameInput.focus();
      return; // nombre obligatorio: no se puede seguir sin él
    }
    if(roundNameError) roundNameError.style.display = 'none';
    roundName = typedName;
    saveConfigGroupFields();
    const scoringPill = document.querySelector('#scoringTypeRow .pill-opt.selected');
    scoringType = scoringPill ? scoringPill.dataset.scoring : 'stableford';
    if(!validarParejas(modoElegido())) return;
    if(selectedCourse) renderCampoKnown(selectedCourse);
    renderResumenPartida();
    goTo(2);
  });

  // Modalidad elegida en el formulario (Individual / Fourball / Foursome)
  function modoElegido(){
    const mod = document.querySelector('.modality-opt.selected');
    return modoDesdeTexto(mod ? mod.textContent : '');
  }
  // En parejas, cada grupo tiene que tener 2 o 4 jugadores (y 4 si es Match Play)
  function validarParejas(modo){
    if(modo === 'individual') return true;
    const usados = matchGroups.filter(g => g.players && g.players.length);
    const impares = gruposImpares(usados.map((g, i) => g));
    if(impares.length){
      alert('Para jugar por parejas cada grupo tiene que tener 2 o 4 jugadores.\nLos jugadores 1 y 2 forman la Pareja A, y los 3 y 4 la Pareja B.');
      return false;
    }
    if(scoringType === 'matchplay' && usados.some(g => g.players.length < 4)){
      alert('En Match Play por parejas hacen falta 4 jugadores en el grupo: Pareja A contra Pareja B.');
      return false;
    }
    return true;
  }
  // Aviso debajo de "Modalidad de juego" explicando cómo se forman las parejas
  function pintarAvisoModalidad(){
    const box = document.getElementById('modalidadAviso');
    if(!box) return;
    const m = modoElegido();
    box.style.display = m === 'individual' ? 'none' : '';
    box.textContent = m === 'fourball'
      ? 'Cada uno juega su bola y en cada hoyo cuenta la mejor de la pareja. Jugadores 1 y 2 = Pareja A · 3 y 4 = Pareja B. Hándicap al 85 % (90 % en Match Play).'
      : 'Una bola por pareja, golpes alternos: se anota un solo resultado por pareja. Jugadores 1 y 2 = Pareja A · 3 y 4 = Pareja B. Hándicap: la mitad de la suma de los dos.';
  }
  document.querySelectorAll('.modality-opt').forEach(o => o.addEventListener('click', pintarAvisoModalidad));
  pintarAvisoModalidad();

  // Pantalla "Resumen": campo, nombre, puntuación, modalidad y participantes con su hándicap
  function renderResumenPartida(){
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    set('resumenNombre', roundName || '—');
    set('resumenPuntuacion', scoringType === 'stableford' ? 'Stableford' : scoringType === 'matchplay' ? 'Match Play' : 'Stroke Play');
    const mod = document.querySelector('.modality-opt.selected');
    set('resumenModalidad', mod ? mod.textContent.trim() : 'Individual');
    const d = document.getElementById('roundDateInput'), t = document.getElementById('roundTimeInput');
    let fecha = 'Hoy';
    if(d && d.value){
      const dt = new Date(d.value + 'T12:00:00');
      fecha = dt.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
      fecha = fecha.charAt(0).toUpperCase() + fecha.slice(1);
    }
    if(t && t.value) fecha += ' · ' + t.value;
    set('resumenFecha', fecha);
    const box = document.getElementById('resumenJugadores');
    if(!box) return;
    const groups = matchGroups.map((g, gi) => ({ gi, rows: (g.players || []).map((n, i) => ({ n: (n || '').trim(), h: (g.handicaps || [])[i] })).filter(r => r.n) }))
      .filter(g => g.rows.length);
    const multi = groups.length > 1;
    const parejas = modoElegido() !== 'individual';
    box.innerHTML = groups.length ? groups.map(g =>
      (multi ? '<div class="resumen-group-lbl">Grupo ' + (g.gi + 1) + '</div>' : '') +
      g.rows.map((r, ri) => {
        const ini = r.n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
        const h = (r.h === '' || r.h == null || isNaN(parseFloat(r.h))) ? '—' : String(r.h).replace('.', ',');
        const cab = (parejas && ri % 2 === 0) ? '<div class="resumen-pareja-lbl">Pareja ' + LETRA_PAREJA[ri / 2] + '</div>' : '';
        return cab + '<div class="resumen-player"><div class="resumen-avatar">' + esc(ini) + '</div><div class="nm">' + esc(r.n) + '</div><div class="resumen-hcp">Hcp ' + esc(h) + '</div></div>';
      }).join('')
    ).join('') : '<div class="empty-hint">Sin jugadores — vuelve atrás para añadirlos</div>';
  }
  const resumenBack = document.getElementById('resumenBack');
  if(resumenBack) resumenBack.addEventListener('click', ()=> goTo(1));

  // "Empezar tu partida": aquí sí arranca la ronda de verdad (único botón que dice "Empezar partida")
  // Arranca la ronda de verdad (crea la partida compartida y pasa a anotar)
  function startNewRoundNow(){
    roundMarkedFinished = false;
    currentRoundId = null; // ronda nueva: cortar cualquier guardado que aún apunte a la partida anterior
    leagueHandicapUpdateScheduled = false; // ronda nueva: permitir recalcular la liga cuando esta también termine
    const rcSection = document.getElementById('roundCodeSection');
    if(rcSection) rcSection.style.display = 'none';
    const leagueNote = document.getElementById('leagueHandicapUpdateNote');
    if(leagueNote) leagueNote.style.display = 'none';
    const medallasNote = document.getElementById('medallasRondaNote');
    if(medallasNote) medallasNote.style.display = 'none';
    matchGroups.forEach(g => { g.scores = {}; }); // ronda nueva: se borran golpes guardados de los 4 grupos
    currentHole = 1;
    activeGroup = 0;
    diagAnswers = {};
    rememberPlayers(matchGroups.reduce((acc, g) => acc.concat(g.players), [])); // nombres de verdad, antes de juntar parejas
    prepararModalidad(modoElegido()); // Fourball / Foursome: deja cada grupo con su tarjeta de parejas
    const g0 = matchGroups[0];
    setPlayers(g0.players, g0.handicaps);
    if(selectedCourse) applyCourseToScoreGrids(selectedCourse);
    renderGroupSwitcher();
    createSharedRound();
    goTo(3);
  }

  // Antes de crear una partida nueva, avisa si ya hay una sin terminar en este mismo campo
  const duplicateRoundOverlay = document.getElementById('duplicateRoundOverlay');
  const duplicateRoundText = document.getElementById('duplicateRoundText');
  const duplicateRoundContinue = document.getElementById('duplicateRoundContinue');
  const duplicateRoundCreateNew = document.getElementById('duplicateRoundCreateNew');
  function hideDuplicateRoundWarning(){
    if(duplicateRoundOverlay) duplicateRoundOverlay.style.display = 'none';
  }
  function showDuplicateRoundWarning(round){
    if(!duplicateRoundOverlay || !duplicateRoundText) { startNewRoundNow(); return; }
    duplicateRoundText.textContent = 'Tienes una partida sin terminar en este campo. ¿Sigues con esa o creas una nueva?';
    duplicateRoundOverlay.style.display = '';
    duplicateRoundContinue.onclick = async ()=>{
      hideDuplicateRoundWarning();
      const res = await joinSharedRound(round.code);
      if(res.ok) goTo(3);
    };
    duplicateRoundCreateNew.onclick = ()=>{
      hideDuplicateRoundWarning();
      startNewRoundNow();
    };
  }

  const empezarPartidaDesdeCampoBtn = document.getElementById('empezarPartidaDesdeCampoBtn');
  if(empezarPartidaDesdeCampoBtn) empezarPartidaDesdeCampoBtn.addEventListener('click', async ()=>{
    const unfinished = selectedCourse ? await findUnfinishedRoundForCourse(selectedCourse.id) : null;
    if(unfinished){
      showDuplicateRoundWarning(unfinished);
      return;
    }
    startNewRoundNow();
  });

  // Buscadores de "Jugador 1..4" con sugerencias de jugadores usados antes
  ['player1', 'player2', 'player3', 'player4'].forEach(id => setupPlayerSearch(id + 'Input', id + 'Dropdown'));

