/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
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

  // Pase automático al siguiente hoyo, pensado para que cada móvil vaya a su ritmo:
  // - Cada móvil recuerda a qué jugadores apunta él ("mis jugadores").
  //   · Si solo apuntas tu golpe, en cuanto lo pones pasa al siguiente hoyo.
  //   · Si apuntas a todo el grupo, espera a que estén todos los que tú apuntas.
  // - El primer hoyo en que apuntas a alguien nuevo da algo más de margen (4 s), por si vas a apuntar a otro.
  // - Solo si el hoyo estaba sin completar al llegar (si vuelves atrás a corregir uno, no te saca de él).
  let autoAdvanceTimer = null, arrivedHole = null, arrivedComplete = false;
  let myPlayersKey = null, myPlayers = new Set(), learnedOnHole = null;

  function myPlayersStorageKey(){
    const code = (typeof currentRoundCode !== 'undefined' && currentRoundCode) ? currentRoundCode : 'local';
    return 'acgolfMisJugadores:' + code + ':' + (typeof activeGroup !== 'undefined' ? activeGroup : 0);
  }
  function syncMyPlayers(){
    const key = myPlayersStorageKey();
    if(key === myPlayersKey) return;
    myPlayersKey = key; myPlayers = new Set(); learnedOnHole = null;
    try { const raw = localStorage.getItem(key); if(raw) JSON.parse(raw).forEach(n => myPlayers.add(n)); } catch(e){}
  }
  function rememberMyPlayer(name){
    syncMyPlayers();
    if(!name || myPlayers.has(name)) return;
    myPlayers.add(name);
    learnedOnHole = currentHole;
    try { localStorage.setItem(myPlayersKey, JSON.stringify([...myPlayers])); } catch(e){}
  }

  function holeFilledFor(h, pIndexes){
    return pIndexes.length > 0 && pIndexes.every(i => {
      const inp = document.querySelector('.golpes-input[data-hole="' + h + '"][data-player-index="' + i + '"]');
      return inp && inp.value !== '';
    });
  }
  function namedIndexes(){
    return players.map((n, i) => ({ n, i })).filter(p => p.n).map(p => p.i);
  }
  function isHoleComplete(h){ // todos los jugadores del grupo
    return holeFilledFor(h, namedIndexes());
  }
  function isHoleCompleteForMe(h){ // solo los jugadores que apunta este móvil
    syncMyPlayers();
    const mine = players.map((n, i) => ({ n, i })).filter(p => p.n && myPlayers.has(p.n)).map(p => p.i);
    return mine.length ? holeFilledFor(h, mine) : isHoleComplete(h);
  }

  function scheduleAutoAdvance(){
    clearTimeout(autoAdvanceTimer);
    if(arrivedComplete || currentHole >= 18) return;
    const h = currentHole;
    if(!isHoleCompleteForMe(h)) return;
    // Si todavía hay huecos vacíos y acabas de "estrenar" jugador en este hoyo, más margen por si apuntas a otro
    const delay = (!isHoleComplete(h) && learnedOnHole === h) ? 4000 : 1500; // 1,5 s: margen para escribir un 10
    autoAdvanceTimer = setTimeout(()=>{
      if(currentHole !== h || !isHoleCompleteForMe(h)) return;
      if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
      currentHole = h + 1;
      renderHoleView();
      const card = document.getElementById('holeViewSection');
      if(card){ card.classList.remove('hole-advanced'); void card.offsetWidth; card.classList.add('hole-advanced'); }
    }, delay);
  }

  function renderHoleView(){
    const holeNumEl = document.getElementById('hvHoleNum');
    if(!holeNumEl) return; // la pantalla 3 todavía no está en el DOM montado
    if(typeof ensureCaddieLoaded === 'function') ensureCaddieLoaded();
    if(currentHole < 1) currentHole = 1;
    if(currentHole > 18) currentHole = 18;
    if(arrivedHole !== currentHole){
      arrivedHole = currentHole;
      arrivedComplete = isHoleCompleteForMe(currentHole);
      clearTimeout(autoAdvanceTimer);
    }
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
      // Guardar foco y cursor antes de repintar (si no, se pierde la 2ª cifra al escribir un 10)
      const activeEl = document.activeElement;
      let focusedPIndex = null, selStart = null, selEnd = null;
      if(activeEl && activeEl.classList && activeEl.classList.contains('stroke-box') && wrap.contains(activeEl)){
        focusedPIndex = activeEl.dataset.holeInputFor;
        selStart = activeEl.selectionStart;
        selEnd = activeEl.selectionEnd;
      }
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
        const extraStrokeNote = recibidos >= 2
          ? '<div class="extra-stroke-note">' + extraStrokeMessage(currentHole, pIndex) + ' (×' + recibidos + ')</div>'
          : '';
        return '<div class="player-hole-card">'
          + '<div class="php-name">' + name + '</div>'
          + '<div class="player-hole-badges">' + posBadge + scoreBadge + hcpBadge + '</div>'
          + extraStrokeNote
          + (typeof caddieHtml === 'function' ? caddieHtml(name, currentHole) : '')
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
          if(box.value !== '') rememberMyPlayer(players[pIndex]);
          scheduleAutoAdvance();
        });
      });
      // Devolver foco y cursor al campo que se estaba usando
      if(focusedPIndex !== null){
        const toRefocus = wrap.querySelector('.stroke-box[data-hole-input-for="' + focusedPIndex + '"]');
        if(toRefocus){
          toRefocus.focus();
          try { toRefocus.setSelectionRange(selStart, selEnd); } catch(e){}
        }
      }
    }

    renderHoleStrip();
    if(typeof renderHoleMap === 'function') renderHoleMap();

    const leaderboardSection = document.getElementById('leaderboardSection');
    if(leaderboardSection){
      const modeLbl = scoringType === 'stableford' ? 'Stableford' : scoringType === 'matchplay' ? 'Match Play' : 'Stroke Play';
      const showGroupTag = matchGroups.filter(g => g.players && g.players.length).length > 1;
      leaderboardSection.innerHTML = '<div class="section-sub" style="margin-bottom:8px;">Modalidad: ' + modeLbl + (showGroupTag ? ' · todos los grupos' : '') + '</div>'
        + standings.map((s, i)=>{
            const isLeader = i === 0 && s.holesFilled > 0;
            const done = s.holesFilled >= 18;
            const tag = isLeader ? '<div class="leader-tag">' + (done ? 'Campeón' : 'Líder') + '</div>' : '';
            const holes = s.holesFilled > 0 ? '<div class="leaderboard-holes">' + (s.holesFilled >= 18 ? '18 hoyos' : 'Hoyo ' + s.holesFilled + ' de 18') + '</div>' : '';
            return '<div class="leaderboard-row' + (isLeader ? ' p1' : '') + '">'
              + '<div class="leaderboard-pos">' + (isLeader ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10v5a5 5 0 0 1-10 0z"></path><path d="M17 5h3v2a3 3 0 0 1-3 3"></path><path d="M7 5H4v2a3 3 0 0 0 3 3"></path></svg>' : (i + 1)) + '</div>'
              + '<div class="leaderboard-name">' + tag + s.name + (showGroupTag ? ' <span style="color:#7A8A99; font-weight:400;">· G' + (s.group + 1) + '</span>' : '') + holes + '</div>'
              + '<div class="leaderboard-score">' + formatStandingScore(s) + '</div></div>';
          }).join('');
    }
  }

  // Fila de hoyos: cuáles están completos, a medias o sin jugar, y cuál es el actual (toca para saltar)
  function renderHoleStrip(){
    const strip = document.getElementById('holeStrip');
    if(!strip) return;
    const nPlayers = players.filter(Boolean).length || players.length;
    let html = '';
    for(let h = 1; h <= 18; h++){
      const inputs = [...document.querySelectorAll('.golpes-input[data-hole="' + h + '"]')];
      const filled = inputs.filter(i => i.value !== '').length;
      const state = filled === 0 ? '' : (filled >= Math.min(nPlayers, inputs.length) ? ' done' : ' partial');
      html += '<button type="button" class="hole-chip' + state + (h === currentHole ? ' current' : '') + '" data-hole="' + h + '" aria-label="Hoyo ' + h + '">' + h + '</button>';
      if(h === 9) html += '<span class="hole-strip-sep" aria-hidden="true"></span>';
    }
    strip.innerHTML = html;
    strip.querySelectorAll('.hole-chip').forEach(chip => chip.addEventListener('click', ()=>{ currentHole = +chip.dataset.hole; renderHoleView(); }));
    const cur = strip.querySelector('.hole-chip.current');
    if(cur){
      const left = cur.offsetLeft - strip.clientWidth / 2 + cur.offsetWidth / 2;
      try { strip.scrollTo({ left, behavior:'smooth' }); } catch(e){ strip.scrollLeft = left; }
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
