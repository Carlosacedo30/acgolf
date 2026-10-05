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
    const hcp = (typeof playerHandicaps !== 'undefined') ? hcpJuego(pIndex) : 0; // ya con el % de la modalidad
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

  // Mejor bola (Fourball): en cada hoyo, el mejor resultado neto de la pareja (o más puntos en Stableford)
  function tjMejorBola(datos, stableford){
    const out = [];
    for(let h = 0; h < 18; h++){
      const vals = datos.map((d, k) => ({ x: d.hoyos[h], k })).filter(v => v.x && v.x.golpes != null);
      if(!datos[0].hoyos[h]){ out.push(null); continue; }
      if(!vals.length){ out.push(Object.assign({}, datos[0].hoyos[h], { golpes: null, diff: null, pts: null, de: [] })); continue; }
      const mejor = vals.reduce((a, b) => (stableford ? (b.x.pts > a.x.pts ? b : a) : (b.x.diff < a.x.diff ? b : a)));
      const de = vals.filter(v => (stableford ? v.x.pts === mejor.x.pts : v.x.diff === mejor.x.diff)).map(v => v.k);
      out.push(Object.assign({}, mejor.x, { rec: 0, de }));
    }
    return out;
  }
  // Media tarjeta de una pareja: una fila por jugador (tocables) y debajo la fila "Mejor bola" que es la que puntúa
  function tjMitadPareja(par, datos, mejor, desde, etiqueta, stableford){
    const cab = mejor.slice(desde, desde + 9).map(x => x ? '<div class="tj-h">' + x.h + '<small>' + x.par + '</small></div>' : '<div class="tj-h"></div>').join('');
    const filaJug = (k) => {
      const lista = datos[k].hoyos.slice(desde, desde + 9);
      return '<div class="tj-quien">' + tjEsc(nombreCorto(players[par[k]])) + '</div><div class="tj-fila tj-fila-jug">' + lista.map(x => {
        if(!x) return '<div class="tj-col"></div>';
        const cuenta = mejor[x.h - 1] && mejor[x.h - 1].de && mejor[x.h - 1].de.includes(k);
        const cls = x.golpes != null ? tjClase(x.diff) : 'tj-sin';
        return '<div class="tj-col"><button type="button" class="tj-g tj-g-peq ' + cls + (x.golpes != null && !cuenta ? ' tj-no-cuenta' : '') + '" data-tj-player="' + par[k] + '" data-tj-hole="' + x.h + '" aria-label="' + tjEsc(players[par[k]]) + ', hoyo ' + x.h + (x.golpes != null ? ', ' + x.golpes + ' golpes' : ', sin anotar') + '">'
          + (x.rec ? '<i class="tj-ast">' + tjAsteriscos(x.rec) + '</i>' : '') + (x.golpes != null ? x.golpes : '+') + '</button></div>';
      }).join('') + '</div>';
    };
    const tramo = mejor.slice(desde, desde + 9);
    const jug = tramo.filter(x => x && x.golpes != null);
    const filaMejor = '<div class="tj-quien tj-quien-mb">Mejor bola</div><div class="tj-fila">' + tramo.map(x => {
      if(!x) return '<div class="tj-col"></div>';
      const txt = x.golpes == null ? '' : (stableford ? x.pts : tjTexto(x.diff));
      return '<div class="tj-col"><div class="tj-mb ' + (x.golpes != null ? tjClase(x.diff) : 'tj-sin') + '">' + txt + '</div></div>';
    }).join('') + '</div>';
    const diff = tjSuma(jug, 'diff');
    return '<div class="tj-mitad">'
      + '<div class="tj-fila">' + cab + '</div>'
      + par.map((i, k) => filaJug(k)).join('')
      + filaMejor
      + '<div class="tj-sub"><span>' + etiqueta + '</span>'
      + (jug.length ? (stableford ? '<b>' + tjSuma(jug, 'pts') + ' pts</b>' : '<b class="tj-res ' + tjClaseTotal(diff) + '">' + tjTexto(diff) + '</b>') : '<b class="tj-nada">sin empezar</b>')
      + '</div></div>';
  }
  function tjTarjetaPareja(par, k, stableford){
    const datos = par.map(i => tjDatosJugador(i));
    const mejor = tjMejorBola(datos, stableford);
    const jug = mejor.filter(x => x && x.golpes != null);
    const diff = tjSuma(jug, 'diff');
    return '<div class="tj-card tj-card-pareja">'
      + '<div class="tj-head"><div class="tj-nombre">Pareja ' + LETRA_PAREJA[k] + ' · ' + tjEsc(nombrePareja(par.map(i => players[i]))) + '</div>'
      + '<div class="tj-hcp">' + par.map(i => tjEsc(nombreCorto(players[i])) + ' ' + tjHcpTxt(hcpJuego(i))).join(' · ') + '</div></div>'
      + tjMitadPareja(par, datos, mejor, 0, 'Ida', stableford)
      + tjMitadPareja(par, datos, mejor, 9, 'Vuelta', stableford)
      + '<div class="tj-total">'
      + '<div><span>Hoyos</span><b>' + jug.length + '/18</b></div>'
      + (stableford ? '<div><span>Puntos</span><b>' + (jug.length ? tjSuma(jug, 'pts') : '—') + '</b></div>'
                    : '<div><span>Neto al par</span><b class="' + (jug.length ? 'tj-res ' + tjClaseTotal(diff) : '') + '">' + (jug.length ? tjTexto(diff) : '—') + '</b></div>')
      + '</div></div>';
  }

  function renderTarjetas(){
    const wrap = document.getElementById('tarjetasWrap');
    if(!wrap || typeof players === 'undefined') return;
    const stableford = typeof scoringType !== 'undefined' && scoringType === 'stableford';
    let todosCompletos = true, alguno = false;
    if(modoPartida() === 'fourball'){
      players.forEach((n, i) => {
        const j = tjDatosJugador(i).hoyos.filter(x => x && x.golpes != null).length;
        if(j < 18) todosCompletos = false; if(j) alguno = true;
      });
    }
    const html = modoPartida() === 'fourball'
      ? parejasFourball(players).map((par, k) => tjTarjetaPareja(par, k, stableford)).join('')
      : players.map((name, pIndex) => {
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
        + '<div class="tj-head"><div class="tj-nombre">' + tjEsc(String(name).replace(' / ', ' y ')) + '</div><div class="tj-hcp">' + 'Recibe ' + Math.round(d.hcp) + ' golpes' + '</div></div>'
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
      + '<div class="tj-nota">Número pequeño: el par del hoyo · * golpe de hándicap · Toca una casilla para corregirla'
      + (modoPartida() === 'fourball' ? '<br>Mejor bola: en cada hoyo cuenta el mejor neto de la pareja (las casillas apagadas no cuentan) · hándicap al ' + Math.round(factorHcpModo() * 100) + ' %' : '')
      + (modoPartida() === 'foursome' ? '<br>Foursome: una bola por pareja · hándicap de pareja = mitad de la suma de los dos' : '')
      + '</div>';

    // Corregir golpes desde la tarjeta con el teclado grande
    wrap.querySelectorAll('.tj-g').forEach(btn => btn.addEventListener('click', ()=>{
      const pIndex = +btn.dataset.tjPlayer, hole = +btn.dataset.tjHole;
      const inp = document.querySelector('.golpes-input[data-hole="' + hole + '"][data-player-index="' + pIndex + '"]');
      if(!inp || typeof openNumPad !== 'function') return;
      const par = parseInt(inp.dataset.par, 10);
      const rec = Math.max(0, strokesForHole(hcpJuego(pIndex), parseInt(inp.dataset.strokeIndex, 10)));
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
