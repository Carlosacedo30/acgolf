  // --- Vista "un hoyo a la vez" (estilo golfdirecto): navegación, resultado grande y clasificación ---
  let currentHole = 1;
  let scoringType = 'stableford'; // 'stableford' | 'strokeplay' | 'matchplay' — se elige en "Configurar partida"

  // Puntos Stableford para un hoyo: 2 - (diferencia del neto sobre par), sin bajar de 0
  // (par=2, bogey=1, birdie=3, doble bogey neto o peor=0 — tabla oficial de Stableford)
  function stablefordPoints(netDiff){
    return Math.max(0, 2 - netDiff);
  }

  // Clasificación en Stableford (puntos, más alto mejor) y Stroke Play (acumulado neto vs. par jugado, más bajo mejor)
  function computeStrokeStandings(){
    const summaries = players.map(()=> ({ total: 0, net: 0, parSoFar: 0, points: 0, holesFilled: 0 }));
    document.querySelectorAll('.nine-block[id^="resultGrid"]').forEach(block=>{
      players.forEach((name, pIndex)=>{
        const row = block.querySelector('.golpes-row[data-player-index="' + pIndex + '"]');
        if(!row) return;
        row.querySelectorAll('.golpes-input').forEach(input=>{
          const golpes = parseInt(input.value, 10);
          if(!isNaN(golpes) && golpes > 0){
            const par = parseInt(input.dataset.par, 10);
            const si = parseInt(input.dataset.strokeIndex, 10);
            const netHole = golpes - strokesForHole(playerHandicaps[pIndex], si);
            summaries[pIndex].total += golpes;
            summaries[pIndex].net += netHole;
            summaries[pIndex].parSoFar += par;
            summaries[pIndex].points += stablefordPoints(netHole - par);
            summaries[pIndex].holesFilled++;
          }
        });
      });
    });
    const list = players.map((name, pIndex) => ({
      name: name, pIndex: pIndex,
      total: summaries[pIndex].total, net: summaries[pIndex].net,
      scoreDiff: summaries[pIndex].net - summaries[pIndex].parSoFar,
      points: summaries[pIndex].points,
      holesFilled: summaries[pIndex].holesFilled,
    }));
    return scoringType === 'stableford'
      ? list.sort((a, b) => (a.holesFilled === 0) - (b.holesFilled === 0) || b.points - a.points)
      : list.sort((a, b) => (a.holesFilled === 0) - (b.holesFilled === 0) || a.scoreDiff - b.scoreDiff);
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
      .map((name, pIndex) => ({ name: name, pIndex: pIndex, holesWon: wins[pIndex], holesHalved: halved[pIndex], holesFilled: holesTogether }))
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
        const rank = standings.findIndex(s => s.pIndex === pIndex);
        const s = standings[rank];
        const posBadge = (s && s.holesFilled > 0) ? '<span class="medal-badge' + (rank === 0 ? ' gold' : '') + '">🏆 ' + (rank + 1) + '</span>' : '';
        const scoreBadge = (s && s.holesFilled > 0) ? '<span class="medal-badge">' + formatStandingScore(s) + '</span>' : '';
        const hcpBadge = playerHandicaps[pIndex] ? '<span class="medal-badge">Hcp ' + playerHandicaps[pIndex] + '</span>' : '';
        let resultClass = '', resultText = '—';
        if(val && par != null){
          const recibidos = strokesForHole(playerHandicaps[pIndex], strokeIndex); // golpes de regalo de ESTE jugador en ESTE hoyo
          const diff = (parseInt(val, 10) - recibidos) - par; // resultado ya ajustado a su hándicap, como en golfdirecto
          resultText = diff === 0 ? 'PAR' : (diff > 0 ? '+' + diff : diff);
          resultClass = diff === 0 ? 'par' : (diff > 0 ? 'over' : 'under');
        }
        return '<div class="player-hole-card">'
          + '<div class="php-name">' + name + '</div>'
          + '<div class="player-hole-badges">' + posBadge + scoreBadge + hcpBadge + '</div>'
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
      leaderboardSection.innerHTML = '<div class="section-sub" style="margin-bottom:8px;">Modalidad: ' + modeLbl + '</div>'
        + standings.map((s, i)=>
            '<div class="leaderboard-row' + (i === 0 && s.holesFilled > 0 ? ' p1' : '') + '"><div class="leaderboard-pos">' + (i + 1) + '</div><div class="leaderboard-name">' + s.name + '</div><div class="leaderboard-score">' + formatStandingScore(s) + '</div></div>'
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
