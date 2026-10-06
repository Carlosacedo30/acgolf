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
  // Junta a TODOS los jugadores de los 4 grupos de la partida, no solo el grupo activo.
  // En Mejor bola (Fourball) compite cada pareja: en cada hoyo cuenta el mejor resultado neto de los dos.
  // En Foursome cada "jugador" ya es una pareja (una sola bola), así que funciona igual que individual.
  function netosHoyo(scoresJugador, hcp){
    const par = selectedCourse ? selectedCourse.par : [];
    const siArr = selectedCourse ? selectedCourse.hcp : [];
    const out = [];
    for(let h = 1; h <= 18; h++){
      const golpes = parseInt((scoresJugador || {})[h], 10);
      if(isNaN(golpes) || golpes <= 0){ out.push(null); continue; }
      const holePar = par[h - 1];
      const netHole = golpes - strokesForHole(ajusteHcp(hcp), siArr[h - 1]);
      out.push({ golpes, par: holePar, diff: netHole - holePar, pts: stablefordPoints(netHole - holePar) });
    }
    return out;
  }
  function computeStrokeStandings(){
    const combined = [];
    matchGroups.forEach((group, gIndex)=>{
      if(!group.players || !group.players.length) return;
      const scores = gIndex === activeGroup ? collectGroupScores() : (group.scores || {});
      const hoyosDe = pIndex => netosHoyo(scores[pIndex], (group.handicaps && group.handicaps[pIndex]) || 0);
      if(group.modo === 'fourball'){
        parejasFourball(group.players).forEach((par, k)=>{
          const lineas = par.map(hoyosDe);
          let total = 0, scoreDiff = 0, points = 0, holesFilled = 0;
          for(let h = 0; h < 18; h++){
            const vals = lineas.map(l => l[h]).filter(Boolean);
            if(!vals.length) continue;
            const mejor = vals.reduce((a, b) => (scoringType === 'stableford' ? (b.pts > a.pts ? b : a) : (b.diff < a.diff ? b : a)));
            total += mejor.golpes; scoreDiff += mejor.diff; points += mejor.pts; holesFilled++;
          }
          combined.push({
            name: 'Pareja ' + LETRA_PAREJA[k] + ' · ' + nombrePareja(par.map(i => group.players[i])),
            group: gIndex, pIndex: par[0], pIndexes: par,
            total, scoreDiff, points, holesFilled,
          });
        });
        return;
      }
      group.players.forEach((name, pIndex)=>{
        if(!name) return;
        const l = hoyosDe(pIndex).filter(Boolean);
        combined.push({
          name: name, group: gIndex, pIndex: pIndex,
          total: l.reduce((a, x) => a + x.golpes, 0), scoreDiff: l.reduce((a, x) => a + x.diff, 0),
          points: l.reduce((a, x) => a + x.pts, 0), holesFilled: l.length,
        });
      });
    });
    return scoringType === 'stableford'
      ? combined.sort((a, b) => (a.holesFilled === 0) - (b.holesFilled === 0) || b.points - a.points)
      : combined.sort((a, b) => (a.holesFilled === 0) - (b.holesFilled === 0) || a.scoreDiff - b.scoreDiff);
  }

  // Neto de un jugador del grupo activo en un hoyo (null si no está anotado)
  function netoActivo(hole, pIndex){
    const input = document.querySelector('.golpes-input[data-hole="' + hole + '"][data-player-index="' + pIndex + '"]');
    const golpes = input ? parseInt(input.value, 10) : NaN;
    if(!input || isNaN(golpes) || golpes <= 0) return null;
    return golpes - strokesForHole(hcpJuego(pIndex), parseInt(input.dataset.strokeIndex, 10));
  }

  // Clasificación en Match Play: gana el hoyo quien tenga menos golpes neto (empate = hoyo empatado, sin punto).
  // En Fourball se enfrentan las dos parejas, cada una con su mejor bola del hoyo.
  function computeMatchPlayStandings(){
    const fourball = modoPartida() === 'fourball';
    const bandos = fourball ? parejasFourball(players) : players.map((n, i) => [i]);
    const wins = bandos.map(()=> 0);
    const halved = bandos.map(()=> 0);
    let holesTogether = 0;
    for(let hole = 1; hole <= 18; hole++){
      const netScores = bandos.map(b => {
        const v = b.map(i => netoActivo(hole, i)).filter(x => x !== null);
        // en Fourball se espera a que estén anotadas las dos bolas de la pareja (si uno recoge, que apunte lo que lleve)
        if(fourball) return b.every(i => netoActivo(hole, i) !== null) ? Math.min(...v) : null;
        return v.length ? v[0] : null;
      });
      if(netScores.some(v => v === null)) continue; // solo cuenta si todos anotaron ese hoyo
      holesTogether++;
      const minNet = Math.min(...netScores);
      const winners = netScores.reduce((acc, v, i) => { if(v === minNet) acc.push(i); return acc; }, []);
      if(winners.length === 1) wins[winners[0]]++;
      else winners.forEach(i => halved[i]++);
    }
    return bandos
      .map((b, k) => ({
        name: fourball ? 'Pareja ' + LETRA_PAREJA[k] + ' · ' + nombrePareja(b.map(i => players[i])) : players[b[0]],
        group: activeGroup, pIndex: b[0], pIndexes: b, holesWon: wins[k], holesHalved: halved[k], holesFilled: holesTogether,
      }))
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

  // Salida al tiro: cada grupo sale por su hoyo (p. ej. el 7: 7, 8 … 18, 1 … 6). Sin él, del 1 al 18 como siempre.
  function hoyoSalidaActual(){
    const g = (typeof matchGroups !== 'undefined' && matchGroups[activeGroup]) || {};
    const h = Number(g.hoyoSalida);
    return h >= 1 && h <= 18 ? h : 1;
  }
  const hoyoSiguiente = h => h % 18 + 1;
  const hoyoAnterior = h => (h + 16) % 18 + 1;
  const hoyoUltimo = () => hoyoAnterior(hoyoSalidaActual());
  // Si el grupo sale al tiro y aún no ha apuntado nada, se coloca en su hoyo de salida
  function grupoEmpiezaEnSuHoyo(){
    const g = (typeof matchGroups !== 'undefined' && matchGroups[activeGroup]) || {};
    const s = hoyoSalidaActual(); if(s === 1) return false;
    const algo = Object.values(g.scores || {}).some(p => Object.values(p || {}).some(v => v !== '' && v != null));
    if(algo) return false;
    currentHole = s; return true;
  }

  function scheduleAutoAdvance(){
    clearTimeout(autoAdvanceTimer);
    if(arrivedComplete || currentHole === hoyoUltimo()) return;
    const h = currentHole;
    if(!isHoleCompleteForMe(h)) return;
    // Si todavía hay huecos vacíos y acabas de "estrenar" jugador en este hoyo, más margen por si apuntas a otro
    const delay = (!isHoleComplete(h) && learnedOnHole === h) ? 4000 : 1500; // 1,5 s: margen para escribir un 10
    autoAdvanceTimer = setTimeout(()=>{
      if(currentHole !== h || !isHoleCompleteForMe(h)) return;
      if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
      currentHole = hoyoSiguiente(h);
      renderHoleView();
      const card = document.getElementById('holeViewSection');
      if(card){ card.classList.remove('hole-advanced'); void card.offsetWidth; card.classList.add('hole-advanced'); }
    }, delay);
  }

  function renderHoleView(){
    const holeNumEl = document.getElementById('hvHoleNum');
    if(!holeNumEl) return; // la pantalla 3 todavía no está en el DOM montado
    if(typeof ensureCaddieLoaded === 'function') ensureCaddieLoaded();
    if(currentHole < 1) currentHole = hoyoSalidaActual() === 1 ? 1 : 18;
    if(currentHole > 18) currentHole = hoyoSalidaActual() === 1 ? 18 : 1;
    if(arrivedHole !== currentHole){
      arrivedHole = currentHole;
      arrivedComplete = isHoleCompleteForMe(currentHole);
      clearTimeout(autoAdvanceTimer);
    }
    const scoringMetaEl = document.getElementById('s3ScoringMeta');
    if(scoringMetaEl) scoringMetaEl.textContent = 'Hoy · ' + (scoringType === 'stableford' ? 'Stableford' : scoringType === 'matchplay' ? 'Match Play' : 'Stroke Play')
      + (modoPartida() === 'fourball' ? ' · Mejor bola' : modoPartida() === 'foursome' ? ' · Foursome' : '')
      + (hoyoSalidaActual() > 1 ? ' · Salís por el ' + hoyoSalidaActual() : '');
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
    if(prevBtn) prevBtn.classList.toggle('disabled', currentHole === hoyoSalidaActual());
    if(nextBtn) nextBtn.classList.toggle('disabled', currentHole === hoyoUltimo());

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
      // Fila de marcadores: los 4 jugadores en columnas, con la casilla de golpes SIEMPRE a la misma altura.
      // Debajo, las notas del caddie de cada uno (pueden tener distinta altura sin mover las casillas).
      const firstNames = players.map(n => String(n || '').trim().split(/\s+/)[0] || n);
      const shortNames = players.map((n, i) => {
        if(String(n || '').includes(' / ')) return nombrePareja(String(n).split(' / ')); // Foursome: "Carlos y Pepe"
        const w = String(n || '').trim().split(/\s+/);
        const dup = firstNames.filter(f => f === firstNames[i]).length > 1;
        // En filas hay sitio: nombre y primer apellido (si se repite el nombre, siempre con apellido)
        return w[1] ? w[0] + ' ' + w[1] : (dup ? w[0] : firstNames[i]);
      });
      const fourball = modoPartida() === 'fourball';
      const rankDe = pIndex => standings.findIndex(s => s.group === activeGroup && (s.pIndexes ? s.pIndexes.includes(pIndex) : s.pIndex === pIndex));
      const posDe = rank => { const s = standings[rank]; return (s && s.holesFilled > 0) ? (rank === 0 ? '🏆 ' : '') + (rank + 1) + 'º · ' + formatStandingScore(s) : ''; };
      // Fourball: en cada pareja se marca la bola que cuenta en este hoyo (la de mejor neto)
      const cuenta = new Set();
      if(fourball) parejasFourball(players).forEach(par => {
        const netos = par.map(i => netoActivo(currentHole, i));
        const vals = netos.filter(v => v !== null);
        if(!vals.length) return;
        const mejor = Math.min(...vals);
        par.forEach((i, k) => { if(netos[k] === mejor) cuenta.add(i); });
      });
      const cellHtml = (name, pIndex)=>{
        const input = document.querySelector('.golpes-input[data-hole="' + currentHole + '"][data-player-index="' + pIndex + '"]');
        const val = input ? input.value : '';
        const rank = rankDe(pIndex);
        const s = standings[rank];
        const posTxt = fourball ? (cuenta.has(pIndex) ? '✓ Cuenta' : '') : posDe(rank);
        const recibidos = strokeIndex != null ? strokesForHole(hcpJuego(pIndex), strokeIndex) : 0; // golpes de regalo de ESTE jugador en ESTE hoyo
        let resultClass = '', resultText = '—';
        if(val && par != null){
          const diff = (parseInt(val, 10) - recibidos) - par; // resultado ya ajustado a su hándicap, como en golfdirecto
          resultText = diff === 0 ? 'PAR' : (diff > 0 ? '+' + diff : diff);
          resultClass = (diff === 0 ? 'par' : (diff > 0 ? 'over' : 'under')) + ' ' + (diff <= -2 ? 'r-eagle' : diff === -1 ? 'r-birdie' : diff === 0 ? 'r-par' : diff === 1 ? 'r-bogey' : 'r-doble');
        }
        const n = Math.max(0, recibidos);
        const pips = n ? Array.from({ length: Math.min(n, 3) }, () => '<i></i>').join('') : '<i class="off"></i>';
        const hcpTxt = 'Recibe ' + Math.round(hcpJuego(pIndex)); // golpes de regalo en este campo (y con el % de la modalidad)
        return '<div class="hv-cell' + (!fourball && rank === 0 && s && s.holesFilled > 0 ? ' lead' : '') + (fourball && cuenta.has(pIndex) ? ' cuenta' : '') + '">'
          // Una fila por jugador: a la izquierda quién es y su par; a la derecha la casilla grande y el resultado
          + '<div class="hv-info">'
          + '<div class="hv-n" title="' + name + '">' + shortNames[pIndex] + '</div>'
          + '<div class="hv-h">' + hcpTxt + '</div>'
          + '<div class="hv-tp' + (n ? '' : ' cero') + '"><span class="gr-pips" aria-hidden="true">' + pips + '</span><span>Tu par <b>' + (par != null ? par + n : '—') + '</b></span></div>'
          + (posTxt ? '<div class="hv-pos">' + posTxt + '</div>' : '')
          + '</div>'
          + '<input class="stroke-box' + (val ? ' filled' : '') + '" type="text" inputmode="none" readonly placeholder="+" value="' + val + '" data-hole-input-for="' + pIndex + '" aria-label="Golpes de ' + name + ' (toca para anotar)">'
          + '<div class="result-box ' + resultClass + '">' + resultText + '</div>'
          + '</div>';
      };
      let cells;
      if(fourball){
        // Dos parejas lado a lado, cada una con su cabecera (posición y resultado de la mejor bola)
        cells = '<div class="hv-parejas">' + parejasFourball(players).map((par, k) => {
          const rank = rankDe(par[0]);
          const s = standings[rank];
          return '<div class="hv-pareja' + (rank === 0 && s && s.holesFilled > 0 ? ' lead' : '') + '">'
            + '<div class="hv-pareja-h"><span>Pareja ' + LETRA_PAREJA[k] + '</span><b>' + ((scoringType === 'matchplay' && s && s.holesFilled > 0) ? s.holesWon + ' ganados' : (posDe(rank) || '&nbsp;')) + '</b></div>'
            + '<div class="hv-scores" style="--n:' + par.length + '">' + par.map(i => cellHtml(players[i], i)).join('') + '</div>'
            + '</div>';
        }).join('') + '</div>';
      } else {
        cells = '<div class="hv-scores" style="--n:' + players.length + '">' + players.map(cellHtml).join('') + '</div>';
      }
      // Debajo de las casillas, el caddie comenta el hoyo y habla con cada jugador
      const habla = (typeof caddieHablaHtml === 'function')
        ? caddieHablaHtml(currentHole, players.map((name, pIndex) => ({ nombre: String(name).includes(' / ') ? nombrePareja(String(name).split(' / ')) : name, recibidos: strokeIndex != null ? strokesForHole(hcpJuego(pIndex), strokeIndex) : 0 })))
        : '';
      wrap.innerHTML = cells + habla;
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
        // Toca la casilla: se abre el teclado grande de golpes (sin teclado del móvil)
        box.addEventListener('click', ()=>{
          const pIndex = +box.dataset.holeInputFor;
          const recibidos = strokeIndex != null ? strokesForHole(hcpJuego(pIndex), strokeIndex) : 0;
          openNumPad({ name: players[pIndex], hole: currentHole, par: par, tuPar: par != null ? par + Math.max(0, recibidos) : null, value: box.value,
            onPick: v => { box.value = v; box.classList.toggle('filled', v !== ''); box.dispatchEvent(new Event('input', { bubbles: true })); } });
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

    renderMarcador(standings);
    renderHoleStrip();
    if(typeof renderHoleMap === 'function') renderHoleMap();
    if(typeof renderTarjetas === 'function') renderTarjetas();

    const leaderboardSection = document.getElementById('leaderboardSection');
    if(leaderboardSection){
      const modeLbl = scoringType === 'stableford' ? 'Stableford' : scoringType === 'matchplay' ? 'Match Play' : 'Stroke Play';
      const showGroupTag = matchGroups.filter(g => g.players && g.players.length).length > 1;
      const modoTxt = modoPartida() === 'individual' ? '' : ' · ' + MODOS[modoPartida()];
      leaderboardSection.innerHTML = '<div class="section-sub" style="margin-bottom:8px;">Modalidad: ' + modeLbl + modoTxt + (showGroupTag ? ' · todos los grupos' : '') + '</div>'
        + standings.map((s, i)=>{
            const isLeader = i === 0 && s.holesFilled > 0;
            const done = s.holesFilled >= 18;
            const tag = isLeader ? '<div class="leader-tag">' + (done ? 'Campeón' : 'Líder') + '</div>' : '';
            const holes = s.holesFilled > 0 ? '<div class="leaderboard-holes">' + (s.holesFilled >= 18 ? '18 hoyos' : 'Hoyo ' + s.holesFilled + ' de 18') + '</div>' : '';
            return '<div class="leaderboard-row' + (isLeader ? ' p1' : '') + '">'
              + '<div class="leaderboard-pos">' + (isLeader ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10v5a5 5 0 0 1-10 0z"></path><path d="M17 5h3v2a3 3 0 0 1-3 3"></path><path d="M7 5H4v2a3 3 0 0 0 3 3"></path></svg>' : (i + 1)) + '</div>'
              + '<div class="leaderboard-name">' + tag + s.name + (showGroupTag ? ' <span style="color:#9FACC2; font-weight:400;">· G' + (s.group + 1) + '</span>' : '') + holes + '</div>'
              + '<div class="leaderboard-score">' + formatStandingScore(s) + '</div></div>';
          }).join('');
    }
  }

  // Marcador siempre a la vista, encima del hoyo (una banda fina: no quita sitio a las casillas de anotar)
  function renderMarcador(standings){
    const box = document.getElementById('marcadorVivo');
    if(!box) return;
    const lista = standings.filter(s => s.group === activeGroup || matchGroups.filter(g => g.players && g.players.length).length > 1);
    if(!lista.length){ box.innerHTML = ''; return; }
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const corto = s => {
      if(s.pIndexes && s.pIndexes.length > 1 && /^Pareja [AB]/.test(s.name)) return s.name.split(' · ')[0];
      if(String(s.name).includes(' / ')) return nombrePareja(String(s.name).split(' / '));
      return nombreCorto(s.name);
    };
    // Match Play entre dos: "Pareja A 2 arriba" / "Igualados"
    if(scoringType === 'matchplay' && lista.length === 2){
      const [a, b] = lista;
      const dif = a.holesWon - b.holesWon;
      const txt = a.holesFilled === 0 ? 'Sin empezar' : dif === 0 ? 'Igualados' : corto(dif > 0 ? a : b) + ' ' + Math.abs(dif) + ' arriba';
      box.innerHTML = '<div class="mv-match"><span class="mv-l">' + esc(corto(a)) + '</span><b class="mv-res">' + esc(txt) + '</b><span class="mv-l">' + esc(corto(b)) + '</span></div>'
        + '<div class="mv-pie">' + a.holesFilled + ' hoyos jugados</div>';
      return;
    }
    box.innerHTML = '<div class="mv-fila" style="--n:' + Math.min(lista.length, 4) + '">' + lista.slice(0, 8).map((s, i) =>
      '<div class="mv-item' + (i === 0 && s.holesFilled > 0 ? ' lider' : '') + '">'
      + '<span class="mv-n">' + (s.holesFilled > 0 ? (i + 1) + 'º ' : '') + esc(corto(s)) + '</span>'
      + '<b class="mv-v">' + (s.holesFilled === 0 ? '—' : esc(scoringType === 'stableford' ? s.points + ' pts' : formatStandingScore(s))) + '</b>'
      + '</div>').join('') + '</div>';
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
      const sal = h === hoyoSalidaActual() && h > 1;
      html += '<button type="button" class="hole-chip' + state + (h === currentHole ? ' current' : '') + (sal ? ' salida' : '') + '" data-hole="' + h + '" aria-label="Hoyo ' + h + (sal ? ', hoyo de salida' : '') + '">' + h + '</button>';
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
  if(holePrevBtn) holePrevBtn.addEventListener('click', ()=>{ if(currentHole === hoyoSalidaActual()) return; currentHole = hoyoAnterior(currentHole); renderHoleView(); });
  const holeNextBtn = document.getElementById('holeNextBtn');
  if(holeNextBtn) holeNextBtn.addEventListener('click', ()=>{ if(currentHole === hoyoUltimo()) return; currentHole = hoyoSiguiente(currentHole); renderHoleView(); });
  const clasificacionBtn = document.getElementById('clasificacionBtn');
  if(clasificacionBtn) clasificacionBtn.addEventListener('click', ()=>{
    const el = document.getElementById('leaderboardSection');
    if(!el) return;
    el.style.display = el.style.display === 'none' ? '' : 'none';
    renderHoleView();
  });
  const toggleGridLbl = document.getElementById('toggleGridLbl');
  // "Ver tarjetas completas": la tarjeta de cada jugador (js/tarjetas.js). La tabla antigua queda oculta: guarda los golpes.
  if(toggleGridLbl){
    const toggleTarjetas = ()=>{
      const el = document.getElementById('tarjetasWrap');
      if(!el) return;
      if(typeof renderTarjetas === 'function') renderTarjetas();
      tarjetasMostrar(el.style.display === 'none');
    };
    toggleGridLbl.addEventListener('click', toggleTarjetas);
    toggleGridLbl.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggleTarjetas(); } });
  }


  // --- Teclado grande de golpes: botones enormes, sin teclado del móvil, pensado para leer sin gafas ---
  let numPadPick = null;
  function openNumPad(o){
    const ov = document.getElementById('numPadOverlay');
    const grid = document.getElementById('npGrid');
    if(!ov || !grid){ return; }
    numPadPick = o.onPick;
    document.getElementById('npTitle').textContent = o.name || 'Jugador';
    document.getElementById('npSub').innerHTML = 'Hoyo ' + o.hole + (o.par != null ? ' · Par ' + o.par : '') + (o.tuPar != null && o.tuPar !== o.par ? ' · <b>Tu par ' + o.tuPar + '</b>' : '');
    const cur = parseInt(o.value, 10);
    let html = '';
    for(let n = 1; n <= 12; n++){
      const cls = 'np-key' + (n === o.tuPar ? ' is-par' : '') + (n === cur ? ' is-cur' : '');
      html += '<button type="button" class="' + cls + '" data-v="' + n + '">' + n + (n === o.tuPar ? '<small>tu par</small>' : '') + '</button>';
    }
    grid.innerHTML = html;
    grid.querySelectorAll('.np-key').forEach(k => k.addEventListener('click', ()=> pickNumPad(k.dataset.v)));
    document.getElementById('npClear').style.display = isNaN(cur) ? 'none' : '';
    ov.hidden = false;
    requestAnimationFrame(()=> ov.classList.add('open'));
  }
  function closeNumPad(){
    const ov = document.getElementById('numPadOverlay');
    if(!ov) return;
    ov.classList.remove('open');
    ov.hidden = true;
    numPadPick = null;
  }
  function pickNumPad(v){
    const fn = numPadPick;
    closeNumPad();
    if(fn) fn(v);
  }
  (function(){
    const ov = document.getElementById('numPadOverlay');
    if(!ov) return;
    ov.addEventListener('click', e => { if(e.target === ov) closeNumPad(); });
    const c = document.getElementById('npClose'); if(c) c.addEventListener('click', closeNumPad);
    const clr = document.getElementById('npClear'); if(clr) clr.addEventListener('click', ()=> pickNumPad(''));
  })();
