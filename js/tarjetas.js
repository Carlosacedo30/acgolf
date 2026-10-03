/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Tarjetas de la partida (estilo tarjeta de golfdirecto con el diseño de acgolf) ---
  // Una tarjeta por jugador: Hoyo, Par, Hcp, Golpes (con * por cada golpe de hándicap) y Neto respecto al par, con colores.
  // Sirve al anotar (toca una casilla de golpes para corregirla con el teclado grande) y al ver una partida terminada.

  let tarjetasAutoAbierta = null; // código de la partida en la que ya se abrieron solas al terminar

  function tjEsc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

  // Clase de color según el resultado neto del hoyo respecto al par
  function tjClase(diff){
    if(diff <= -2) return 'r-eagle';
    if(diff === -1) return 'r-birdie';
    if(diff === 0) return 'r-par';
    if(diff === 1) return 'r-bogey';
    return 'r-doble';
  }
  function tjTexto(diff){ return diff === 0 ? 'PAR' : (diff > 0 ? '+' + diff : String(diff)); }
  function tjAsteriscos(n){ return n <= 0 ? '' : (n <= 3 ? '*'.repeat(n) : n + '*'); }

  function tjDatosJugador(pIndex){
    const hcp = (typeof playerHandicaps !== 'undefined' && playerHandicaps[pIndex]) || 0;
    const hoyos = [];
    for(let h = 1; h <= 18; h++){
      const inp = document.querySelector('.golpes-input[data-hole="' + h + '"][data-player-index="' + pIndex + '"]');
      if(!inp){ hoyos.push(null); continue; }
      const par = parseInt(inp.dataset.par, 10);
      const si = parseInt(inp.dataset.strokeIndex, 10);
      const rec = isNaN(si) ? 0 : Math.max(0, strokesForHole(hcp, si));
      const g = parseInt(inp.value, 10);
      const tiene = !isNaN(g) && g > 0;
      const diff = tiene ? (g - rec) - par : null;
      const pts = tiene ? Math.max(0, 2 - diff) : null; // Stableford
      hoyos.push({ h, par, si, rec, golpes: tiene ? g : null, diff, pts });
    }
    return { hcp, hoyos };
  }

  function tjSuma(lista, campo){ return lista.reduce((a, x) => a + (x && x[campo] != null ? x[campo] : 0), 0); }
  function tjHayAlguno(lista){ return lista.some(x => x && x.golpes != null); }

  // Una mitad de la tarjeta (ida o vuelta) como tabla
  function tjMitad(pIndex, lista, etiqueta, stableford){
    const celdas = (fn, cls) => lista.map(x => '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + (x ? fn(x) : '') + '</td>').join('');
    const parTot = tjSuma(lista, 'par');
    const hay = tjHayAlguno(lista);
    const brutoTot = hay ? tjSuma(lista, 'golpes') : '';
    const diffTot = tjSuma(lista, 'diff');
    const golpesFila = lista.map(x => {
      if(!x) return '<td></td>';
      return '<td class="tj-bru" data-tj-player="' + pIndex + '" data-tj-hole="' + x.h + '" role="button" tabindex="0" aria-label="Golpes hoyo ' + x.h + '">'
        + '<span class="tj-ast">' + tjAsteriscos(x.rec) + '</span>' + (x.golpes != null ? x.golpes : '<span class="tj-vacio">·</span>') + '</td>';
    }).join('');
    const netoFila = lista.map(x => x && x.diff != null ? '<td><span class="tj-res ' + tjClase(x.diff) + '">' + tjTexto(x.diff) + '</span></td>' : '<td></td>').join('');
    return '<table class="tj-tabla">'
      + '<tr class="tj-hoyos"><th></th>' + celdas(x => x.h) + '<th>' + etiqueta + '</th></tr>'
      + '<tr><th>Par</th>' + celdas(x => x.par) + '<th>' + parTot + '</th></tr>'
      + '<tr class="tj-hcp"><th>Hcp</th>' + celdas(x => isNaN(x.si) ? '' : x.si) + '<th></th></tr>'
      + '<tr><th>Golpes</th>' + golpesFila + '<th>' + brutoTot + '</th></tr>'
      + '<tr><th>Neto</th>' + netoFila + '<th>' + (hay ? '<span class="tj-res ' + (diffTot === 0 ? 'r-par' : '') + '">' + tjTexto(diffTot) + '</span>' : '') + '</th></tr>'
      + (stableford ? '<tr class="tj-pts"><th>Pts</th>' + celdas(x => x.pts != null ? x.pts : '') + '<th>' + (hay ? tjSuma(lista, 'pts') : '') + '</th></tr>' : '')
      + '</table>';
  }

  function renderTarjetas(){
    const wrap = document.getElementById('tarjetasWrap');
    if(!wrap || typeof players === 'undefined') return;
    const stableford = typeof scoringType !== 'undefined' && scoringType === 'stableford';
    const modo = typeof scoringType === 'undefined' ? '' : (scoringType === 'stableford' ? 'Stableford' : scoringType === 'matchplay' ? 'Match Play' : 'Stroke Play');
    const modEl = document.querySelector('.modality-opt.selected');
    const modalidad = modEl ? modEl.textContent.trim() : 'Individual';
    let todosCompletos = true, alguno = false;
    const html = players.map((name, pIndex) => {
      if(!name) return '';
      const d = tjDatosJugador(pIndex);
      const ida = d.hoyos.slice(0, 9), vuelta = d.hoyos.slice(9, 18);
      const jugados = d.hoyos.filter(x => x && x.golpes != null).length;
      if(jugados < 18) todosCompletos = false;
      if(jugados) alguno = true;
      const bruto = tjSuma(d.hoyos, 'golpes');
      const diff = tjSuma(d.hoyos, 'diff');
      const pts = tjSuma(d.hoyos, 'pts');
      return '<div class="tj-card">'
        + '<div class="tj-head"><div class="tj-nombre">' + tjEsc(name) + '</div>'
        + '<div class="tj-badge">' + tjEsc(modalidad) + ' · ' + tjEsc(modo) + ' · Hcp ' + d.hcp + '</div></div>'
        + tjMitad(pIndex, ida, 'Ida', stableford)
        + tjMitad(pIndex, vuelta, 'Vuelta', stableford)
        + '<div class="tj-total">'
        + '<div><span>Hoyos</span><b>' + jugados + '/18</b></div>'
        + '<div><span>Golpes</span><b>' + (jugados ? bruto : '—') + '</b></div>'
        + '<div><span>Neto</span><b>' + (jugados ? (bruto - tjSuma(d.hoyos.filter(x => x && x.golpes != null), 'rec')) : '—') + '</b></div>'
        + (stableford ? '<div><span>Puntos</span><b>' + (jugados ? pts : '—') + '</b></div>'
                      : '<div><span>Al par</span><b class="tj-res ' + (jugados ? (diff === 0 ? 'r-par' : '') : '') + '">' + (jugados ? tjTexto(diff) : '—') + '</b></div>')
        + '</div>'
        + '</div>';
    }).join('');
    wrap.innerHTML = html
      + '<div class="tj-leyenda"><span><i class="tj-res r-eagle">-2</i> Eagle</span><span><i class="tj-res r-birdie">-1</i> Birdie</span><span><i class="tj-res r-par">PAR</i> Par</span><span><i class="tj-res r-bogey">+1</i> Bogey</span><span><i class="tj-res r-doble">+2</i> Doble o más</span></div>'
      + '<div class="tj-nota">* = golpe de hándicap en ese hoyo. Toca una casilla de golpes para corregirla.</div>';

    // Corregir golpes desde la tarjeta con el teclado grande
    wrap.querySelectorAll('.tj-bru').forEach(td => {
      const abrir = ()=>{
        const pIndex = +td.dataset.tjPlayer, hole = +td.dataset.tjHole;
        const inp = document.querySelector('.golpes-input[data-hole="' + hole + '"][data-player-index="' + pIndex + '"]');
        if(!inp || typeof openNumPad !== 'function') return;
        const par = parseInt(inp.dataset.par, 10);
        const rec = Math.max(0, strokesForHole(playerHandicaps[pIndex], parseInt(inp.dataset.strokeIndex, 10)));
        openNumPad({ name: players[pIndex], hole: hole, par: par, tuPar: par + rec, value: inp.value,
          onPick: v => { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); } });
      };
      td.addEventListener('click', abrir);
      td.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); abrir(); } });
    });

    // Partida terminada: las tarjetas se abren solas (una vez por partida)
    const code = (typeof currentRoundCode !== 'undefined' && currentRoundCode) ? currentRoundCode : 'local';
    if(alguno && todosCompletos && tarjetasAutoAbierta !== code){
      tarjetasAutoAbierta = code;
      tarjetasMostrar(true);
    }
  }

  function tarjetasMostrar(abrir){
    const wrap = document.getElementById('tarjetasWrap');
    const lbl = document.getElementById('toggleGridLbl');
    if(!wrap) return;
    wrap.style.display = abrir ? '' : 'none';
    if(lbl) lbl.textContent = abrir ? 'Ocultar tarjetas ▴' : 'Ver tarjetas completas ▾';
  }
