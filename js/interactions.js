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

  // Pantalla "Jugar": elegir campo directamente (Hato Verde o Zaudín) o unirse con código
  const startChoiceCodigo = document.getElementById('startChoiceCodigo');
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
  if(startChoiceCodigo){
    startChoiceCodigo.addEventListener('click', ()=>{
      markStartChoice(startChoiceCodigo);
      const block = document.getElementById('configPartidaBlock');
      if(block) block.style.display = 'none';
      if(joinGameSection){ joinGameSection.style.display = ''; setTimeout(() => joinGameSection.scrollIntoView({ behavior:'smooth', block:'center' }), 50); }
      const input = document.getElementById('joinCodeInput');
      if(input) input.focus({ preventScroll:true });
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
  clickGoTo('guardarLuegoBtn', 0);

  // "Finalizar ronda": avisa si a algún jugador le faltan hoyos, en vez de dejar que "termine" a medias
  const incompleteRoundOverlay = document.getElementById('incompleteRoundOverlay');
  const incompleteRoundText = document.getElementById('incompleteRoundText');
  const incompleteRoundCancel = document.getElementById('incompleteRoundCancel');
  const incompleteRoundContinue = document.getElementById('incompleteRoundContinue');
  if(incompleteRoundCancel) incompleteRoundCancel.addEventListener('click', ()=>{ incompleteRoundOverlay.style.display = 'none'; });
  if(incompleteRoundContinue) incompleteRoundContinue.addEventListener('click', ()=>{ incompleteRoundOverlay.style.display = 'none'; goTo(4); });
  const finalizarRondaBtn = document.getElementById('finalizarRondaBtn');
  if(finalizarRondaBtn) finalizarRondaBtn.addEventListener('click', ()=>{
    const missing = getPlayerHolesFilled().filter(s => s.filled < 18);
    if(missing.length && incompleteRoundOverlay && incompleteRoundText){
      incompleteRoundText.textContent = 'Todavía les faltan hoyos por anotar:\n'
        + missing.map(s => '• ' + s.name + ': ' + s.filled + '/18 hoyos').join('\n');
      incompleteRoundOverlay.style.display = '';
      return;
    }
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
    if(selectedCourse) renderCampoKnown(selectedCourse);
    renderResumenPartida();
    goTo(2);
  });

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
    box.innerHTML = groups.length ? groups.map(g =>
      (multi ? '<div class="resumen-group-lbl">Grupo ' + (g.gi + 1) + '</div>' : '') +
      g.rows.map(r => {
        const ini = r.n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
        const h = (r.h === '' || r.h == null || isNaN(parseFloat(r.h))) ? '—' : String(r.h).replace('.', ',');
        return '<div class="resumen-player"><div class="resumen-avatar">' + esc(ini) + '</div><div class="nm">' + esc(r.n) + '</div><div class="resumen-hcp">Hcp ' + esc(h) + '</div></div>';
      }).join('')
    ).join('') : '<div class="empty-hint">Sin jugadores — vuelve atrás para añadirlos</div>';
  }
  const resumenBack = document.getElementById('resumenBack');
  if(resumenBack) resumenBack.addEventListener('click', ()=> goTo(1));

  // "Empezar tu partida": aquí sí arranca la ronda de verdad (único botón que dice "Empezar partida")
  // Arranca la ronda de verdad (crea la partida compartida y pasa a anotar)
  function startNewRoundNow(){
    currentRoundId = null; // ronda nueva: cortar cualquier guardado que aún apunte a la partida anterior
    leagueHandicapUpdateScheduled = false; // ronda nueva: permitir recalcular la liga cuando esta también termine
    const rcSection = document.getElementById('roundCodeSection');
    if(rcSection) rcSection.style.display = 'none';
    const leagueNote = document.getElementById('leagueHandicapUpdateNote');
    if(leagueNote) leagueNote.style.display = 'none';
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
    duplicateRoundText.textContent = 'Tienes la partida con código ' + round.code + ' sin terminar en este campo. ¿Sigues con esa o creas una nueva?';
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
