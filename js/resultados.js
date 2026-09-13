  // Frases de la ronda: se calculan siempre a partir de lo escrito, así que "quedan grabadas"
  // mientras el golpe siga anotado en esa celda
  const PAR_MESSAGE = '¡Qué bueno eres!';
  const BIRDIE_MESSAGE = 'Te como los huevos';
  const WINNER_MESSAGE = 'Hoy te hacen el chivito';

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
            const recibidos = strokesForHole(playerHandicaps[pIndex], strokeIndex);
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
        const hcp = playerHandicaps[pIndex] || 0;
        return '<div class="round-row"><div><div class="club">' + name + '</div><div class="date">' + s.holesFilled + '/18 hoyos · Hcp ' + hcp + '</div></div><div class="score">' + s.total + '<small>neto ' + (s.total > 0 ? s.net : '—') + ' (' + netDiffStr + ')</small></div></div>';
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

    // Mensaje final: cuando todos los jugadores completaron sus 18 hoyos, para quien va ganando
    const winnerSection = document.getElementById('roundWinnerSection');
    const winnerBox = document.getElementById('roundWinner');
    if(winnerSection && winnerBox){
      const roundDone = players.length > 0 && summaries.every(s => s.holesFilled >= 18);
      if(roundDone){
        const minNet = Math.min(...summaries.map(s => s.net));
        const winners = players.filter((name, i) => summaries[i].net === minNet);
        winnerSection.style.display = '';
        winnerBox.innerHTML = '<div class="pct">🏆</div><p><strong>' + winners.join(' y ') + '</strong> — ' + WINNER_MESSAGE + ' <span style="color:var(--ink-3, #5B6B62); font-weight:400;">(ganan en neto, ' + minNet + ')</span>.</p>';
      } else {
        winnerSection.style.display = 'none';
      }
    }
    renderHoleView();
    saveRoundState();
  }
