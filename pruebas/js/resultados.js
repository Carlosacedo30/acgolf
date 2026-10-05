/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // Cuántos hoyos lleva realmente rellenados cada jugador del grupo activo (para avisar antes de
  // "Finalizar ronda" si a alguien le falta alguno, en vez de dejar que pase sin más)
  function getPlayerHolesFilled(){
    return players.map((name, pIndex)=>{
      let filled = 0;
      document.querySelectorAll('.golpes-row[data-player-index="' + pIndex + '"] .golpes-input').forEach(input=>{
        if(input.value && parseInt(input.value, 10) > 0) filled++;
      });
      return { name: name, filled: filled };
    });
  }

  // Frases de la ronda: se calculan siempre a partir de lo escrito, así que "quedan grabadas"
  // mientras el golpe siga anotado en esa celda
  const PAR_MESSAGE = '¡Qué bueno eres!';
  const BIRDIE_MESSAGE = 'Te como los huevos';
  const WINNER_MESSAGE = 'Hoy te hacen el chivito';

  // Aviso emergente (~4s) cuando aparece un mensaje NUEVO (no al restaurar golpes ya guardados)
  const shownMessageKeys = new Set();
  let toastQueue = [];
  let toastShowing = false;
  function toastKey(m){ return activeGroup + '|' + m.hole + '|' + m.player + '|' + m.text; }
  function showMessageToast(m){
    toastQueue.push(m);
    processToastQueue();
  }
  function processToastQueue(){
    if(typeof current !== 'undefined' && current !== 3){ toastQueue = []; return; } // solo en la pantalla de anotar
    if(toastShowing || !toastQueue.length) return;
    const m = toastQueue.shift();
    const el = document.getElementById('messageToast');
    const holeEl = document.getElementById('messageToastHole');
    const textEl = document.getElementById('messageToastText');
    if(!el || !holeEl || !textEl) return;
    toastShowing = true;
    holeEl.textContent = 'Hoyo ' + m.hole;
    textEl.textContent = m.player + ' — ' + m.text;
    el.classList.add('show');
    setTimeout(()=>{
      el.classList.remove('show');
      setTimeout(()=>{ toastShowing = false; processToastQueue(); }, 300);
    }, 4000);
  }

  // Cálculo automático de resultados (Introducir resultados): un total por cada jugador,
  // más los mensajes de par/birdie de cada hoyo y el mensaje final para quien va ganando
  function recalcResultados(){
    const summaries = players.map(()=> ({ total: 0, net: 0, holesFilled: 0 }));
    const roundMessages = [];
    document.querySelectorAll('.nine-block[id^="resultGrid"]').forEach(block=>{
      players.forEach((name, pIndex)=>{
        const row = block.querySelector('.golpes-row[data-player-index="' + pIndex + '"]');
        if(!row) return;
        let nineGolpes = 0;
        row.querySelectorAll('.golpes-input').forEach(input=>{
          const par = parseInt(input.dataset.par, 10);
          const golpes = parseInt(input.value, 10);
          const cell = input.parentElement;
          cell.classList.remove('result-par', 'result-over');
          const oldBadge = cell.querySelector('.msg-badge');
          if(oldBadge) oldBadge.remove();
          if(!isNaN(golpes) && golpes > 0){
            nineGolpes += golpes;
            summaries[pIndex].total += golpes;
            const strokeIndex = parseInt(input.dataset.strokeIndex, 10);
            const recibidos = strokesForHole(hcpJuego(pIndex), strokeIndex);
            summaries[pIndex].net += golpes - recibidos;
            summaries[pIndex].holesFilled++;
            const diff = golpes - par; // en bruto: para los mensajes de par/birdie "de verdad"
            const netDiff = (golpes - recibidos) - par; // ajustado a su hándicap: para el color de la celda
            cell.classList.add(netDiff > 0 ? 'result-over' : 'result-par');
            let msg = null, icon = null;
            if(diff === 0){ msg = PAR_MESSAGE; icon = '👍'; }
            else if(diff === -1){ msg = BIRDIE_MESSAGE; icon = '🥚'; }
            if(msg){
              const badge = document.createElement('span');
              badge.className = 'msg-badge';
              badge.title = name + ' — ' + msg;
              badge.textContent = icon;
              cell.appendChild(badge);
              roundMessages.push({ hole: input.dataset.hole, player: name, text: msg });
            }
            // Hoyo malo (neto doble bogey o peor): consejo rápido de Consejos de Golf
            if(netDiff >= 2){
              const tip = BAD_HOLE_TIPS[(parseInt(input.dataset.hole, 10) + pIndex) % BAD_HOLE_TIPS.length];
              const tipMsg = { hole: input.dataset.hole, player: name, text: '💡 ' + tip };
              const tipKey = toastKey(tipMsg) + '-tip';
              if(!shownMessageKeys.has(tipKey)){
                shownMessageKeys.add(tipKey);
                if(!restoringScores) showMessageToast(tipMsg);
              }
            }
          }
        });
        const nineTotalCell = row.querySelector('.nine-total');
        if(nineTotalCell) nineTotalCell.textContent = nineGolpes;
      });
    });

    const playerTotals = document.getElementById('playerTotals');
    if(playerTotals){
      playerTotals.innerHTML = players.map((name, pIndex)=>{
        const s = summaries[pIndex];
        const netDiff = s.net - currentCoursePar;
        const netDiffStr = s.total > 0 ? (netDiff >= 0 ? '+' + netDiff : netDiff) : '—';
        const hcp = Math.round(hcpJuego(pIndex));
        const cls = s.total > 0 ? (netDiff > 0 ? 'over' : netDiff < 0 ? 'under' : 'par') : '';
        return '<div class="sum-player"><div class="sum-head"><div class="club">' + name + '</div><div class="date">' + s.holesFilled + '/18 hoyos · Recibe ' + hcp + ' golpes</div></div>'
          + '<div class="sum-tiles">'
          + '<div class="sum-tile main"><div class="v">' + (s.total > 0 ? s.total : '—') + '</div><div class="k">Golpes</div></div>'
          + '<div class="sum-tile"><div class="v">' + (s.total > 0 ? s.net : '—') + '</div><div class="k">Neto</div></div>'
          + '<div class="sum-tile ' + cls + '"><div class="v">' + netDiffStr + '</div><div class="k">Neto vs par</div></div>'
          + '</div></div>';
      }).join('');
    }

    // Registro de mensajes de la ronda (par y birdie), ordenados por hoyo
    const messagesSection = document.getElementById('roundMessagesSection');
    const messagesList = document.getElementById('roundMessages');
    if(messagesList){
      roundMessages.sort((a, b) => (+a.hole) - (+b.hole));
      messagesList.innerHTML = roundMessages.map(m =>
        '<div class="plan-item"><div class="dot2"></div><div><strong>Hoyo ' + m.hole + '</strong> · ' + m.player + ' — ' + m.text + '</div></div>'
      ).join('');
      if(messagesSection) messagesSection.style.display = roundMessages.length ? '' : 'none';
    }
    // Solo mostrar el aviso emergente para mensajes de verdad nuevos (no al restaurar/sincronizar)
    roundMessages.forEach(m=>{
      const key = toastKey(m);
      if(!shownMessageKeys.has(key)){
        shownMessageKeys.add(key);
        if(!restoringScores) showMessageToast(m);
      }
    });

    // Mensaje final: cuando todos los jugadores completaron sus 18 hoyos, para quien va ganando
    const winnerSection = document.getElementById('roundWinnerSection');
    const winnerBox = document.getElementById('roundWinner');
    if(winnerSection && winnerBox){
      const roundDone = players.length > 0 && summaries.every(s => s.holesFilled >= 18);
      if(roundDone && esParejas()){
        // Por parejas: gana la pareja que va primera en la clasificación de su modalidad
        const st = computeStandings().filter(x => x.holesFilled > 0);
        const top = st[0];
        const empatan = top ? st.filter(x => formatStandingScore(x) === formatStandingScore(top)) : [];
        winnerSection.style.display = '';
        winnerBox.innerHTML = top ? '<div class="pct">🏆</div><p><strong>' + empatan.map(x => x.name.replace(' / ', ' y ')).join(' y ') + '</strong> — ' + WINNER_MESSAGE
          + ' <span style="color:var(--ink-3, #B9C4D7); font-weight:400;">(' + (empatan.length > 1 ? 'empate, ' : '') + formatStandingScore(top) + ')</span>.</p>' : '';
      } else if(roundDone){
        const minNet = Math.min(...summaries.map(s => s.net));
        const empatadosNeto = summaries.filter(s => s.net === minNet).length;
        const winners = desempateHcp(players.filter((name, i) => summaries[i].net === minNet));
        winnerSection.style.display = '';
        winnerBox.innerHTML = '<div class="pct">🏆</div><p><strong>' + winners.join(' y ') + '</strong> — ' + WINNER_MESSAGE + ' <span style="color:var(--ink-3, #B9C4D7); font-weight:400;">' + (empatadosNeto > winners.length ? '(empate a ' + minNet + ' netos: gana el hándicap más bajo)' : '(' + (winners.length > 1 ? 'ganan' : 'gana') + ' en neto, ' + minNet + ')') + '</span>.</p>';
        const mentalNote = document.getElementById('roundMentalNote');
        if(mentalNote){
          mentalNote.textContent = minNet < currentCoursePar ? CONSEJOS_GOLF.mentalidad.cuandoSiSalga : CONSEJOS_GOLF.mentalidad.cuandoNadaSalga;
        }
        // Ronda completa en Hato Verde: recalcular el hándicap real de la liga con este resultado ya guardado
        // (solo una vez por ronda, no en cada pulsación mientras siga completa) y enseñarlo en pantalla
        if(selectedCourse && HANDICAP_COURSE_IDS.includes(selectedCourse.id) && !leagueHandicapUpdateScheduled){
          leagueHandicapUpdateScheduled = true;
          setTimeout(()=> runLeagueHandicapUpdate(players.slice()), 1200);
          // y avisar si alguien de la partida ha ganado una medalla nueva (ver js/medallas.js)
          if(typeof mostrarMedallasRonda === 'function') setTimeout(()=> mostrarMedallasRonda(players.slice()), 2500);
        }
      } else {
        winnerSection.style.display = 'none';
      }
    }
    // Texto para compartir por WhatsApp (el botón solo aparece cuando la partida se ha dado por terminada)
    const shareResultLink = document.getElementById('shareResultWhatsapp');
    if(shareResultLink && players.length){
      const nets = summaries.map(s => s.net);
      const minNet = Math.min(...nets);
      const stP = esParejas() ? computeStandings().filter(x => x.holesFilled > 0) : [];
      const winners = esParejas()
        ? stP.filter(x => formatStandingScore(x) === formatStandingScore(stP[0])).map(x => x.name.replace(' / ', ' y '))
        : desempateHcp(players.filter((name, i) => summaries[i].holesFilled > 0 && summaries[i].net === minNet));
      const lines = esParejas()
        ? computeStandings().map((x, i) => (i + 1) + 'º ' + x.name.replace(' / ', ' y ') + ': ' + formatStandingScore(x))
        : players.map((name, i) => name + ': ' + summaries[i].total + ' golpes (neto ' + summaries[i].net + ')' + (summaries[i].holesFilled < 18 ? ' · ' + summaries[i].holesFilled + '/18 hoyos' : ''));
      const text = '⛳ ' + (roundName ? roundName + ' · ' : '') + 'Ronda terminada en ' + (selectedCourse ? selectedCourse.name : 'el campo') + '\n'
        + lines.join('\n') + (winners.length ? '\n🏆 ' + winners.join(' y ') + ' — ' + WINNER_MESSAGE : '');
      shareResultLink.href = 'https://wa.me/?text=' + encodeURIComponent(text);
    }
    renderHoleView();
    saveRoundState();
  }

  // Regla de la liga: si hay empate en neto, gana el de hándicap más bajo
  function desempateHcp(empatados){
    if(empatados.length < 2) return empatados;
    const hcpDe = name => Number(playerHandicaps[players.indexOf(name)]) || 0;
    const minHcp = Math.min(...empatados.map(hcpDe));
    return empatados.filter(n => hcpDe(n) === minHcp);
  }
