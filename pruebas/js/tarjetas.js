/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Tarjetas de la partida (estilo tarjeta de golfdirecto con el diseño de acgolf) ---
  // Una tarjeta por jugador: 9 + 9 casillas grandes con los golpes, coloreadas según el resultado neto (* = golpe de hándicap).
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
  // Para subtotales y total: rojo bajo par, PAR con borde, azul sobre par (el dorado y el negro son solo de un hoyo)
  function tjClaseTotal(diff){ return diff < 0 ? 'r-birdie' : (diff === 0 ? 'r-par' : 'r-bogey'); }
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

  function tjHcpTxt(h){ return String(Math.round(Number(h) * 10) / 10).replace('.', ','); }

  // Una mitad de la tarjeta (ida o vuelta): 9 casillas grandes. Arriba el hoyo y su par; abajo los golpes,
  // con el fondo del color del resultado neto y un * por cada golpe de hándicap.
  function tjMitad(pIndex, lista, etiqueta, stableford){
    const hay = tjHayAlguno(lista);
    const bruto = tjSuma(lista, 'golpes');
    const diff = tjSuma(lista, 'diff');
    const casillas = lista.map(x => {
      if(!x) return '<div class="tj-col"></div>';
      const cls = x.golpes != null ? tjClase(x.diff) : 'tj-sin';
      return '<div class="tj-col">'
        + '<div class="tj-h">' + x.h + '<small>' + x.par + '</small></div>'
        + '<button type="button" class="tj-g ' + cls + '" data-tj-player="' + pIndex + '" data-tj-hole="' + x.h + '" aria-label="Hoyo ' + x.h + ', par ' + x.par + (x.golpes != null ? ', ' + x.golpes + ' golpes' : ', sin anotar') + '">'
        + (x.rec ? '<i class="tj-ast">' + tjAsteriscos(x.rec) + '</i>' : '')
        + (x.golpes != null ? x.golpes : '+') + '</button>'
        + '</div>';
    }).join('');
    return '<div class="tj-mitad">'
      + '<div class="tj-fila">' + casillas + '</div>'
      + '<div class="tj-sub"><span>' + etiqueta + '</span>'
      + (hay ? '<b>' + bruto + ' golpes</b>' + (stableford ? '<b>' + tjSuma(lista, 'pts') + ' pts</b>' : '<b class="tj-res ' + tjClaseTotal(diff) + '">' + tjTexto(diff) + '</b>') : '<b class="tj-nada">sin empezar</b>')
      + '</div></div>';
  }

  function renderTarjetas(){
    const wrap = document.getElementById('tarjetasWrap');
    if(!wrap || typeof players === 'undefined') return;
    const stableford = typeof scoringType !== 'undefined' && scoringType === 'stableford';
    let todosCompletos = true, alguno = false;
    const html = players.map((name, pIndex) => {
      if(!name) return '';
      const d = tjDatosJugador(pIndex);
      const ida = d.hoyos.slice(0, 9), vuelta = d.hoyos.slice(9, 18);
      const jugadosL = d.hoyos.filter(x => x && x.golpes != null);
      const jugados = jugadosL.length;
      if(jugados < 18) todosCompletos = false;
      if(jugados) alguno = true;
      const bruto = tjSuma(jugadosL, 'golpes');
      const neto = bruto - tjSuma(jugadosL, 'rec');
      const diff = tjSuma(jugadosL, 'diff');
      return '<div class="tj-card">'
        + '<div class="tj-head"><div class="tj-nombre">' + tjEsc(name) + '</div><div class="tj-hcp">Hcp ' + tjHcpTxt(d.hcp) + '</div></div>'
        + tjMitad(pIndex, ida, 'Ida', stableford)
        + tjMitad(pIndex, vuelta, 'Vuelta', stableford)
        + '<div class="tj-total">'
        + '<div><span>Golpes</span><b>' + (jugados ? bruto : '—') + '</b></div>'
        + '<div><span>Neto</span><b>' + (jugados ? neto : '—') + '</b></div>'
        + (stableford ? '<div><span>Puntos</span><b>' + (jugados ? tjSuma(jugadosL, 'pts') : '—') + '</b></div>'
                      : '<div><span>Al par</span><b class="' + (jugados ? 'tj-res ' + tjClaseTotal(diff) : '') + '">' + (jugados ? tjTexto(diff) : '—') + '</b></div>')
        + '</div>'
        + (jugados && jugados < 18 ? '<div class="tj-llevan">' + jugados + ' de 18 hoyos</div>' : '')
        + '</div>';
    }).join('');
    wrap.innerHTML = html
      + '<div class="tj-leyenda"><span><i class="tj-res r-eagle">3</i> Eagle</span><span><i class="tj-res r-birdie">4</i> Birdie</span><span><i class="tj-res r-par">5</i> Par</span><span><i class="tj-res r-bogey">6</i> Bogey</span><span><i class="tj-res r-doble">7</i> Doble o más</span></div>'
      + '<div class="tj-nota">Número pequeño: el par del hoyo · * golpe de hándicap · Toca una casilla para corregirla</div>';

    // Corregir golpes desde la tarjeta con el teclado grande
    wrap.querySelectorAll('.tj-g').forEach(btn => btn.addEventListener('click', ()=>{
      const pIndex = +btn.dataset.tjPlayer, hole = +btn.dataset.tjHole;
      const inp = document.querySelector('.golpes-input[data-hole="' + hole + '"][data-player-index="' + pIndex + '"]');
      if(!inp || typeof openNumPad !== 'function') return;
      const par = parseInt(inp.dataset.par, 10);
      const rec = Math.max(0, strokesForHole(playerHandicaps[pIndex], parseInt(inp.dataset.strokeIndex, 10)));
      openNumPad({ name: players[pIndex], hole: hole, par: par, tuPar: par + rec, value: inp.value,
        onPick: v => { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); } });
    }));

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
