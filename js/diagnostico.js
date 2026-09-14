  // --- Diagnóstico post-ronda: hoyos flojos + una pregunta por hoyo, por jugador ---
  const DIAG_CATEGORIES = ['Drive', 'Approach', 'Juego corto', 'Putt'];
  // Consejos de "Consejos de Golf" del usuario, uno por categoría de fallo
  const DIAG_TIPS = {
    'Drive': [
      'Pegar hacia arriba, con ritmo — no se necesita fuerza, se busca un buen contacto.',
      'Si haces slice: pelota más atrás, siente el swing de adentro hacia afuera. Si sigue, fortalece la mano izquierda en el grip.',
      'Si haces hook: pelota más adelante, siente el swing más de afuera hacia adentro. Si sigue, debilita la mano izquierda en el grip.',
    ],
    'Approach': [
      'Entre palos: toma el más largo y haz un swing ¾ con compromiso.',
      'Lie de subida: un palo más, peso en pie derecho, apunta a la derecha, pega hacia arriba.',
      'Lie de bajada: un palo menos, peso en pie izquierdo, apunta a la izquierda, pega hacia abajo.',
    ],
    'Juego corto': [
      'Desde 100 yardas o menos: medio tiro, suave, con confianza — evita el hinge, ve muy abajo.',
      'Alrededor del green: usa PW o hierro 9, es más fácil y consistente.',
      'Recovery shot: pelota atrás, manos adelante, pega vertical.',
      'Corregir shank: siente la cadera izquierda yendo hacia atrás en el impacto, creando espacio.',
    ],
    'Putt': [
      'Putt largo: enfócate en la velocidad, no solo en la línea.',
      'Putt de compromiso: golpea con confianza y deja la cabeza quieta.',
      'Lee las caídas: verde oscuro = pelo en contra, verde claro = pelo a favor.',
    ],
  };
  let diagAnswers = {}; // diagAnswers["grupo-jugador"][hole] = categoría elegida
  let diagActivePlayer = 0;
  function diagKey(pIndex){ return activeGroup + '-' + pIndex; }

  function getPlayerHoles(pIndex){
    const holes = [];
    document.querySelectorAll('.golpes-row[data-player-index="' + pIndex + '"] .golpes-input').forEach(input=>{
      const golpes = parseInt(input.value, 10);
      const par = parseInt(input.dataset.par, 10);
      if(!isNaN(golpes) && golpes > 0){
        holes.push({ hole: parseInt(input.dataset.hole, 10), par: par, strokes: golpes, diff: golpes - par });
      }
    });
    return holes.sort((a, b) => a.hole - b.hole);
  }

  function renderDiagPlayerTabs(){
    const section = document.getElementById('s4PlayerTabSection');
    const wrap = document.getElementById('s4PlayerTabToggle');
    if(!section || !wrap) return;
    if(players.length <= 1){ section.style.display = 'none'; return; }
    section.style.display = '';
    wrap.innerHTML = players.map((name, i) =>
      '<div class="tab' + (i === diagActivePlayer ? ' active' : '') + '" data-i="' + i + '">' + name + '</div>'
    ).join('');
    wrap.querySelectorAll('.tab').forEach(tab=>{
      tab.addEventListener('click', ()=>{
        diagActivePlayer = parseInt(tab.dataset.i, 10);
        renderDiagnostico();
      });
    });
  }

  function renderDiagQuestionCard(pIndex, h){
    const chosen = diagAnswers[diagKey(pIndex)] && diagAnswers[diagKey(pIndex)][h.hole];
    const pills = DIAG_CATEGORIES.map(c =>
      '<div class="pill-opt' + (chosen === c ? ' selected' : '') + '" data-hole="' + h.hole + '" data-value="' + c + '">' + c + '</div>'
    ).join('');
    return '<div style="padding:12px 0; border-top:1px solid var(--line-soft);">'
      + '<div class="hole-tag">HOYO ' + h.hole + ' · +' + h.diff + ' sobre par</div>'
      + '<div class="section-sub" style="margin:6px 0 8px;">¿Dónde falló?</div>'
      + '<div class="pill-row">' + pills + '</div>'
      + '</div>';
  }

  function renderDiagPattern(pIndex, worst){
    const patternEl = document.getElementById('s4Pattern');
    const planSection = document.getElementById('s4PlanSection');
    const planEl = document.getElementById('s4Plan');
    const answered = worst.filter(h => diagAnswers[diagKey(pIndex)] && diagAnswers[diagKey(pIndex)][h.hole]);
    if(!worst.length || !answered.length){
      patternEl.innerHTML = '<p>Responde el cuestionario de arriba para ver tu patrón.</p>';
      planSection.style.display = 'none';
      return;
    }
    const counts = {};
    answered.forEach(h => {
      const cat = diagAnswers[diagKey(pIndex)][h.hole];
      counts[cat] = (counts[cat] || 0) + 1;
    });
    let topCat = null, topCount = 0;
    Object.keys(counts).forEach(c => { if(counts[c] > topCount){ topCount = counts[c]; topCat = c; } });
    const pct = Math.round((topCount / answered.length) * 100);
    patternEl.innerHTML = '<div class="pct">' + pct + '%</div><p>de los hoyos flojos respondidos vienen de fallos en <strong>' + topCat + '</strong>.</p>';
    planSection.style.display = '';
    planEl.innerHTML = (DIAG_TIPS[topCat] || []).map(tip =>
      '<div class="plan-item"><div class="dot2"></div><div>' + tip + '</div></div>'
    ).join('');
  }

  function renderDiagnostico(){
    if(diagActivePlayer >= players.length) diagActivePlayer = 0;
    renderDiagPlayerTabs();
    const pIndex = diagActivePlayer;
    const name = players[pIndex] || 'Jugador 1';
    const holes = getPlayerHoles(pIndex);
    const total = holes.reduce((a, h) => a + h.strokes, 0);
    const diff = total - currentCoursePar;

    const backEl = document.getElementById('s4Back');
    if(backEl) backEl.textContent = selectedCourse ? ('‹ ' + selectedCourse.name) : '‹ Campo';
    const metaEl = document.getElementById('s4Meta');
    const multiGroup = matchGroups.filter(g => g.players.length).length > 1;
    if(metaEl) metaEl.textContent = 'Ronda de hoy · ' + name + (multiGroup ? ' · Grupo ' + (activeGroup + 1) : '');
    const scoreLine = document.getElementById('s4ScoreLine');
    if(scoreLine){
      scoreLine.innerHTML = holes.length
        ? '<span class="total">' + total + '</span><span class="vs">golpes</span><span class="diff">' + (diff >= 0 ? '+' + diff : diff) + ' sobre par ' + currentCoursePar + '</span>'
        : '<span class="total">—</span><span class="vs">golpes</span><span class="diff">Sin datos</span>';
    }

    const worst = holes.filter(h => h.diff > 0).sort((a, b) => (b.diff - a.diff) || (a.hole - b.hole)).slice(0, 3);
    const heading = document.getElementById('s4WorstHeading');
    const worstHolesEl = document.getElementById('s4WorstHoles');
    const questionsSection = document.getElementById('s4QuestionsSection');
    const questionsEl = document.getElementById('s4Questions');

    if(!holes.length){
      heading.textContent = 'Todavía no hay golpes anotados';
      worstHolesEl.innerHTML = '<div class="helper-note">Anota los golpes de ' + name + ' en "Introducir resultados" para ver su diagnóstico.</div>';
      questionsSection.style.display = 'none';
    } else if(!worst.length){
      heading.textContent = '¡Ronda sólida!';
      worstHolesEl.innerHTML = '<div class="helper-note">' + name + ' no tuvo hoyos por encima del par. Sin fallos que analizar 🎉</div>';
      questionsSection.style.display = 'none';
    } else {
      heading.textContent = worst.length + ' hoyo' + (worst.length > 1 ? 's' : '') + ' con mayor pérdida';
      worstHolesEl.innerHTML = worst.map(h =>
        '<div class="hole-row"><div class="hole-badge">' + h.hole + '</div><div class="hole-par">Par ' + h.par + '</div><div class="hole-strokes">' + h.strokes + '</div><div class="hole-diff">+' + h.diff + '</div></div>'
      ).join('');
      questionsSection.style.display = '';
      questionsEl.innerHTML = worst.map(h => renderDiagQuestionCard(pIndex, h)).join('');
      questionsEl.querySelectorAll('.pill-opt').forEach(pill=>{
        pill.addEventListener('click', ()=>{
          const key = diagKey(pIndex);
          diagAnswers[key] = diagAnswers[key] || {};
          diagAnswers[key][pill.dataset.hole] = pill.dataset.value;
          renderDiagnostico();
        });
      });
    }
    renderDiagPattern(pIndex, worst);
  }
  const s4GuardarBtn = document.getElementById('s4GuardarBtn');
  if(s4GuardarBtn) s4GuardarBtn.addEventListener('click', ()=> goTo(0));
  render();
  renderRecentRounds();
