  // --- Informe semanal: informe real de Carlos ("Hoyo 19") o ficha de un compañero, con buscador ---
  let reportPlayerName = 'Carlos Acedo Domínguez';

  function buildHcpChartSvg(points){
    // points: [{label, hcp}], de más antiguo a más reciente
    const xs = points.map((p, i) => 10 + i * (280 / Math.max(1, points.length - 1)));
    const hcps = points.map(p => p.hcp);
    const maxHcp = Math.max(...hcps), minHcp = Math.min(...hcps);
    const range = Math.max(1, maxHcp - minHcp);
    const ys = hcps.map(h => 75 - ((h - minHcp) / range) * 60);
    const coords = xs.map((x, i) => x.toFixed(1) + ',' + ys[i].toFixed(1));
    const dots = xs.map((x, i) =>
      '<circle cx="' + x.toFixed(1) + '" cy="' + ys[i].toFixed(1) + '" r="' + (i === xs.length - 1 ? 5 : 3.5) + '" fill="' + (i === xs.length - 1 ? '#9C7A2E' : '#1B3A2F') + '"/>'
    ).join('');
    return '<svg viewBox="0 0 320 90" preserveAspectRatio="none">'
      + '<polyline points="' + coords.join(' ') + '" fill="none" stroke="#C9C3AE" stroke-width="1.5" stroke-dasharray="3,3"/>'
      + '<polyline points="' + coords.join(' ') + '" fill="none" stroke="#1B3A2F" stroke-width="2.5"/>'
      + dots
      + '</svg>';
  }

  function renderInforme(name){
    reportPlayerName = name;
    const input = document.getElementById('reportPlayerInput');
    if(input) input.value = name;
    const content = document.getElementById('s6Content');
    const meta = document.getElementById('s6Meta');
    if(!content) return;

    if(name === 'Carlos Acedo Domínguez'){
      const r = CARLOS_REPORT;
      if(meta) meta.textContent = 'Datos reales de "Hoyo 19" (golfdirecto) · ' + r.totalRounds + ' rondas registradas';
      const chartPoints = r.monthly.map(m => ({ label: m.month.slice(5), hcp: m.hcpEnd }));
      const delta = +(r.monthly[0].hcpEnd - r.currentHcp).toFixed(1);
      const bestMonth = r.monthly.reduce((best, m) => m.rounds > best.rounds ? m : best, r.monthly[0]);
      content.innerHTML =
        '<section><div class="eyebrow">Evolución de hándicap</div>'
        + '<div class="hcp-hero"><span class="num">' + r.currentHcp + '</span><span class="delta">' + (delta >= 0 ? '↓ ' + delta : '↑ ' + Math.abs(delta)) + '</span><span class="lbl">desde ' + MONTH_NAMES[parseInt(r.monthly[0].month.slice(5, 7), 10) - 1] + '</span></div>'
        + '<div class="chart">' + buildHcpChartSvg(chartPoints) + '<div class="chart-labels">' + r.monthly.map(m => '<span>' + MONTH_NAMES[parseInt(m.month.slice(5, 7), 10) - 1] + '</span>').join('') + '</div></div>'
        + '</section>'
        + '<section><div class="eyebrow">Evolución de tus rondas</div>'
        + '<div class="section-sub">Golpes totales en cada una de tus últimas ' + r.recentRounds.length + ' rondas registradas</div>'
        + '<div class="chart" style="margin-top:10px;">' + buildHcpChartSvg(r.recentRounds.map(round => ({ hcp: round.strokes }))) + '<div class="chart-labels"><span>' + formatShortDate(r.recentRounds[0].date) + '</span><span>' + formatShortDate(r.recentRounds[r.recentRounds.length - 1].date) + '</span></div></div>'
        + '</section>'
        + '<section><div class="eyebrow">Mejores marcas</div>'
        + '<div class="stats-grid" style="margin-top:10px;">'
        + '<div class="stat-cell"><div class="val">' + r.bestStableford.points + ' pts</div><div class="lbl">Mejor Stableford</div></div>'
        + '<div class="stat-cell"><div class="val">' + (r.bestStrokeplay.net >= 0 ? '+' + r.bestStrokeplay.net : r.bestStrokeplay.net) + '</div><div class="lbl">Mejor Stroke Play (neto)</div></div>'
        + '<div class="stat-cell"><div class="val">' + r.totalRounds + '</div><div class="lbl">Rondas registradas</div></div>'
        + '<div class="stat-cell"><div class="val">' + bestMonth.rounds + '</div><div class="lbl">Rondas en ' + MONTH_NAMES[parseInt(bestMonth.month.slice(5, 7), 10) - 1] + ' (mejor mes)</div></div>'
        + '</div>'
        + '</section>'
        + '<section><div class="eyebrow">Rondas recientes</div><div>'
        + r.recentRounds.slice().reverse().slice(0, 8).map(round =>
            '<div class="round-row"><div><div class="club">' + round.name + ' · ' + round.club + ' <span class="' + (round.mode === 'stableford' ? 'mode-badge stableford' : 'mode-badge strokeplay') + '">' + (round.mode === 'stableford' ? 'stableford' : 'stroke play') + '</span></div><div class="date">' + formatShortDate(round.date) + '</div></div><div class="score">' + round.strokes + ' <small>' + (round.mode === 'stableford' ? round.net + ' pts' : (round.net >= 0 ? '+' + round.net : round.net)) + '</small></div></div>'
          ).join('')
        + '</div></section>';
    } else {
      const stats = COMPANION_STATS[name];
      const hcp = FAVORITE_HANDICAPS[name];
      const last = FAVORITE_LAST_PLAYED[name];
      if(meta) meta.textContent = 'Ficha del compañero (de "Hoyo 19")';
      if(!stats){
        content.innerHTML = '<section><div class="helper-note">No tenemos datos de este jugador todavía.</div></section>';
        return;
      }
      content.innerHTML =
        '<section><div class="eyebrow">Ficha del jugador</div>'
        + '<h2>' + name + '</h2>'
        + '<div class="stats-grid" style="margin-top:10px;">'
        + '<div class="stat-cell"><div class="val">' + (hcp !== undefined ? hcp : '—') + '</div><div class="lbl">Hándicap actual</div></div>'
        + '<div class="stat-cell"><div class="val">' + stats.roundsTogether + '</div><div class="lbl">Rondas jugadas con Carlos</div></div>'
        + '<div class="stat-cell"><div class="val">' + (stats.avgNet !== null ? stats.avgNet : '—') + '</div><div class="lbl">Resultado medio (neto)</div></div>'
        + '<div class="stat-cell"><div class="val">' + (stats.bestNet !== null ? (stats.bestNet >= 0 ? '+' + stats.bestNet : stats.bestNet) : '—') + '</div><div class="lbl">Mejor resultado (neto)</div></div>'
        + '</div>'
        + '</section>'
        + '<section><div class="helper-note">Última vez jugado con Carlos: ' + (last ? formatShortDate(last) : '—') + '. Todavía no tenemos su historial de rondas completo — solo lo que sabemos de las partidas jugadas junto a Carlos.</div></section>';
    }
  }

  // Buscador de jugador en "Informe semanal" (reutiliza el mismo historial de favoritos)
  (function setupReportPlayerSearch(){
    const input = document.getElementById('reportPlayerInput');
    const dropdown = document.getElementById('reportPlayerDropdown');
    if(!input || !dropdown) return;
    function renderOptions(query){
      const q = (query || '').trim().toLowerCase();
      const matches = getPlayerHistory().filter(name => !q || name.toLowerCase().includes(q));
      if(!matches.length){ dropdown.innerHTML = ''; dropdown.classList.remove('open'); return; }
      dropdown.innerHTML = matches.map(name => {
        const bits = [];
        if(FAVORITE_HANDICAPS[name] !== undefined) bits.push('Hcp ' + FAVORITE_HANDICAPS[name]);
        if(FAVORITE_LAST_PLAYED[name]) bits.push('Última vez ' + formatShortDate(FAVORITE_LAST_PLAYED[name]));
        const sub = bits.length ? '<div class="loc">' + bits.join(' · ') + '</div>' : '';
        return '<div class="dropdown-item"><div><div class="name">' + name + '</div>' + sub + '</div></div>';
      }).join('');
      dropdown.classList.add('open');
      dropdown.querySelectorAll('.dropdown-item').forEach((item, i)=>{
        item.addEventListener('click', ()=>{
          dropdown.classList.remove('open');
          renderInforme(matches[i]);
        });
      });
    }
    input.addEventListener('focus', ()=> renderOptions(input.value));
    input.addEventListener('input', ()=> renderOptions(input.value));
    document.addEventListener('click', (e)=>{
      if(input.contains(e.target) || dropdown.contains(e.target)) return;
      dropdown.classList.remove('open');
    });
  })();
  const s6VolverBtn = document.getElementById('s6VolverBtn');
  if(s6VolverBtn) s6VolverBtn.addEventListener('click', ()=> goTo(0));
