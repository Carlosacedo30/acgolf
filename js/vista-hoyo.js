  // --- Vista "un hoyo a la vez" (estilo golfdirecto): navegación, resultado grande y clasificación ---
  let currentHole = 1;
  let scoringType = 'stableford'; // 'stableford' | 'strokeplay' | 'matchplay' — se elige en "Configurar partida"

  // Avisos de golpe(s) extra en un hoyo (según el hándicap), para animar un poco la partida
  const EXTRA_STROKE_MESSAGES = [
    '🎯 Golpe extra aquí, no hay excusa',
    '🎁 Golpe de regalo — no lo desperdicies',
    '💪 Aquí te dan uno gratis, aprovéchalo',
    '⚡ Golpe extra: tu oportunidad de oro',
    '🔑 En este hoyo juegas con ventaja',
    '🧉 Golpe extra, así que sin agobios',
  ];
  function extraStrokeMessage(hole, pIndex){
    return EXTRA_STROKE_MESSAGES[(hole + pIndex) % EXTRA_STROKE_MESSAGES.length];
  }

  // Puntos Stableford para un hoyo: 2 - (diferencia del neto sobre par), sin bajar de 0
  // (par=2, bogey=1, birdie=3, doble bogey neto o peor=0 — tabla oficial de Stableford)
  function stablefordPoints(netDiff){
    return Math.max(0, 2 - netDiff);
  }

  // Clasificación en Stableford (puntos, más alto mejor) y Stroke Play (acumulado neto vs. par jugado, más bajo mejor)
  // Junta a TODOS los jugadores de los 4 grupos de la partida, no solo el grupo activo
  function computeStrokeStandings(){
    const par = selectedCourse ? selectedCourse.par : [];
    const strokeIndexArr = selectedCourse ? selectedCourse.hcp : [];
    const combined = [];
    matchGroups.forEach((group, gIndex)=>{
      if(!group.players || !group.players.length) return;
      const scores = gIndex === activeGroup ? collectGroupScores() : (group.scores || {});
      group.players.forEach((name, pIndex)=>{
        if(!name) return;
        const playerScores = scores[pIndex] || {};
        const hcp = (group.handicaps && group.handicaps[pIndex]) || 0;
        let total = 0, net = 0, parSoFar = 0, points = 0, holesFilled = 0;
        for(let h = 1; h <= 18; h++){
          const golpes = parseInt(playerScores[h], 10);
          if(isNaN(golpes) || golpes <= 0) continue;
          const holePar = par[h - 1];
          const si = strokeIndexArr[h - 1];
          const netHole = golpes - strokesForHole(hcp, si);
          total += golpes; net += netHole; parSoFar += holePar;
          points += stablefordPoints(netHole - holePar);
          holesFilled++;
        }
        combined.push({
          name: name, group: gIndex, pIndex: pIndex,
          total: total, net: net, scoreDiff: net - parSoFar, points: points, holesFilled: holesFilled,
        });
      });
    });
    return scoringType === 'stableford'
      ? combined.sort((a, b) => (a.holesFilled === 0) - (b.holesFilled === 0) || b.points - a.points)
      : combined.sort((a, b) => (a.holesFilled === 0) - (b.holesFilled === 0) || a.scoreDiff - b.scoreDiff);
  }

  // Clasificación en Match Play: gana el hoyo quien tenga menos golpes neto (empate = hoyo empatado, sin punto)
  function computeMatchPlayStandings(){
    const wins = players.map(()=> 0);
    const halved = players.map(()=> 0);
    let holesTogether = 0;
    for(let hole = 1; hole <= 18; hole++){
      const netScores = players.map((name, pIndex)=>{
        const input = document.querySelector('.golpes-input[data-hole="' + hole + '"][data-player-index="' + pIndex + '"]');
        const golpes = input ? parseInt(input.value, 10) : NaN;
        if(!input || isNaN(golpes) || golpes <= 0) return null;
        const si = parseInt(input.dataset.strokeIndex, 10);
        return golpes - strokesForHole(playerHandicaps[pIndex], si);
      });
      if(netScores.some(v => v === null)) continue; // solo cuenta si todos anotaron ese hoyo
      holesTogether++;
      const minNet = Math.min(...netScores);
      const winners = netScores.reduce((acc, v, i) => { if(v === minNet) acc.push(i); return acc; }, []);
      if(winners.length === 1) wins[winners[0]]++;
      else winners.forEach(i => halved[i]++);
    }
    return players
      .map((name, pIndex) => ({ name: name, group: activeGroup, pIndex: pIndex, holesWon: wins[pIndex], holesHalved: halved[pIndex], holesFilled: holesTogether }))
      .sort((a, b) => (a.holesFilled === 0) - (b.holesFilled === 0) || b.holesWon - a.holesWon);
  }

  function computeStandings(){
    return scoringType === 'matchplay' ? computeMatchPlayStandings() : computeStrokeStandings();
  }

  // Texto a mostrar para el resultado acumulado de un jugador, según la modalidad elegida
  function formatStandingScore(s){
    if(s.holesFilled === 0) return 'sin golpes';
    if(scoringType === 'stableford') return s.points + ' pts';
    if(scoringType === 'matchplay') return s.holesWon + (s.holesWon === 1 ? ' hoyo' : ' hoyos') + (s.holesHalved ? ' · ' + s.holesHalved + ' empatados' : '');
    return s.scoreDiff >= 0 ? '+' + s.scoreDiff : String(s.scoreDiff); // stroke play
  }

  function renderHoleView(){
    const holeNumEl = document.getElementById('hvHoleNum');
    if(!holeNumEl) return; // la pantalla 3 todavía no está en el DOM montado
    const scoringMetaEl = document.getElementById('s3ScoringMeta');
    if(scoringMetaEl) scoringMetaEl.textContent = 'Hoy · ' + (scoringType === 'stableford' ? 'Stableford' : scoringType === 'matchplay' ? 'Match Play' : 'Stroke Play');
    if(currentHole < 1) currentHole = 1;
    if(currentHole > 18) currentHole = 18;
    const input0 = document.querySelector('.golpes-input[data-hole="' + currentHole + '"]');
    const par = input0 ? parseInt(input0.dataset.par, 10) : null;
    const strokeIndex = input0 ? parseInt(input0.dataset.strokeIndex, 10) : null;
    holeNumEl.textContent = currentHole;
    const parEl = document.getElementById('hvPar'); if(parEl) parEl.textContent = par != null ? par : '—';
    const hcpEl = document.getElementById('hvHcp'); if(hcpEl) hcpEl.textContent = strokeIndex != null ? strokeIndex : '—';
    const prevBtn = document.getElementById('holePrevBtn');
    const nextBtn = document.getElementById('holeNextBtn');
    if(prevBtn) prevBtn.classList.toggle('disabled', currentHole <= 1);
    if(nextBtn) nextBtn.classList.toggle('disabled', currentHole >= 18);

    const standings = computeStandings();
    const leader = standings.find(s => s.holesFilled > 0);

    const wrap = document.getElementById('hvPlayers');
    if(wrap){
      wrap.innerHTML = players.map((name, pIndex)=>{
        const input = document.querySelector('.golpes-input[data-hole="' + currentHole + '"][data-player-index="' + pIndex + '"]');
        const val = input ? input.value : '';
        const rank = standings.findIndex(s => s.group === activeGroup && s.pIndex === pIndex);
        const s = standings[rank];
        const posBadge = (s && s.holesFilled > 0) ? '<span class="medal-badge' + (rank === 0 ? ' gold' : '') + '">🏆 ' + (rank + 1) + '</span>' : '';
        const scoreBadge = (s && s.holesFilled > 0) ? '<span class="medal-badge">' + formatStandingScore(s) + '</span>' : '';
        const hcpBadge = playerHandicaps[pIndex] ? '<span class="medal-badge">Hcp ' + playerHandicaps[pIndex] + '</span>' : '';
        const recibidos = strokeIndex != null ? strokesForHole(playerHandicaps[pIndex], strokeIndex) : 0; // golpes de regalo de ESTE jugador en ESTE hoyo
        let resultClass = '', resultText = '—';
        if(val && par != null){
          const diff = (parseInt(val, 10) - recibidos) - par; // resultado ya ajustado a su hándicap, como en golfdirecto
          resultText = diff === 0 ? 'PAR' : (diff > 0 ? '+' + diff : diff);
          resultClass = diff === 0 ? 'par' : (diff > 0 ? 'over' : 'under');
        }
        const extraStrokeNote = recibidos > 0
          ? '<div class="extra-stroke-note">' + extraStrokeMessage(currentHole, pIndex) + (recibidos > 1 ? ' (×' + recibidos + ')' : '') + '</div>'
          : '';
        return '<div class="player-hole-card">'
          + '<div class="php-name">' + name + '</div>'
          + '<div class="player-hole-badges">' + posBadge + scoreBadge + hcpBadge + '</div>'
          + extraStrokeNote
          + '<div class="php-controls">'
          + '<input class="stroke-box' + (val ? ' filled' : '') + '" type="text" inputmode="numeric" placeholder="+" value="' + val + '" data-hole-input-for="' + pIndex + '">'
          + '<div class="result-box ' + resultClass + '">' + resultText + '</div>'
          + '</div>'
          + '</div>';
      }).join('');
      wrap.querySelectorAll('.stroke-box').forEach(box=>{
        box.addEventListener('input', ()=>{
          const pIndex = box.dataset.holeInputFor;
          const realInput = document.querySelector('.golpes-input[data-hole="' + currentHole + '"][data-player-index="' + pIndex + '"]');
          if(realInput){
            realInput.value = box.value;
            realInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
      });
    }

    const leaderboardSection = document.getElementById('leaderboardSection');
    if(leaderboardSection && leaderboardSection.style.display !== 'none'){
      const modeLbl = scoringType === 'stableford' ? 'Stableford' : scoringType === 'matchplay' ? 'Match Play' : 'Stroke Play';
      const showGroupTag = matchGroups.filter(g => g.players && g.players.length).length > 1;
      leaderboardSection.innerHTML = '<div class="section-sub" style="margin-bottom:8px;">Modalidad: ' + modeLbl + (showGroupTag ? ' · todos los grupos' : '') + '</div>'
        + standings.map((s, i)=>
            '<div class="leaderboard-row' + (i === 0 && s.holesFilled > 0 ? ' p1' : '') + '"><div class="leaderboard-pos">' + (i + 1) + '</div><div class="leaderboard-name">' + s.name + (showGroupTag ? ' <span style="color:#7A8A99; font-weight:400;">· G' + (s.group + 1) + '</span>' : '') + '</div><div class="leaderboard-score">' + formatStandingScore(s) + '</div></div>'
          ).join('');
    }
  }

  const holePrevBtn = document.getElementById('holePrevBtn');
  if(holePrevBtn) holePrevBtn.addEventListener('click', ()=>{ currentHole--; renderHoleView(); });
  const holeNextBtn = document.getElementById('holeNextBtn');
  if(holeNextBtn) holeNextBtn.addEventListener('click', ()=>{ currentHole++; renderHoleView(); });
  const clasificacionBtn = document.getElementById('clasificacionBtn');
  if(clasificacionBtn) clasificacionBtn.addEventListener('click', ()=>{
    const el = document.getElementById('leaderboardSection');
    if(!el) return;
    el.style.display = el.style.display === 'none' ? '' : 'none';
    renderHoleView();
  });
  const toggleGridLbl = document.getElementById('toggleGridLbl');
  if(toggleGridLbl) toggleGridLbl.addEventListener('click', ()=>{
    const el = document.getElementById('gridWrap');
    if(!el) return;
    const open = el.style.display !== 'none';
    el.style.display = open ? 'none' : '';
    toggleGridLbl.textContent = open ? 'Ver tabla completa ▾' : 'Ocultar tabla completa ▴';
  });
