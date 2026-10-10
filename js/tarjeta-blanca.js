/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Pantalla de anotar en blanco (acgolf.es) ---
// Arriba la clasificación completa; luego el hoyo con flechas grandes; los jugadores con su casilla
// pintada como en la tele (círculo rojo birdie, amarillo eagle, cuadro azul bogey, azul oscuro doble);
// debajo la media tarjeta (ida o vuelta, según el hoyo) del jugador elegido y la leyenda de colores.
(function(){
  if(typeof renderHoleView !== 'function') return;
  document.documentElement.classList.add('tb-on');
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let tbDe = null;          // jugador (índice en el grupo activo) cuya tarjeta se ve abajo
  let tbEntera = false;     // ver la tarjeta entera (ida y vuelta)
  let tbCompleta = false;   // con 5 o más jugadores: ver la clasificación de todos (si no, solo tu grupo)

  const inp = (h, i) => document.querySelector('.golpes-input[data-hole="' + h + '"][data-player-index="' + i + '"]');
  const golpesDe = (h, i) => { const x = inp(h, i); const v = x ? parseInt(x.value, 10) : NaN; return isNaN(v) || v <= 0 ? null : v; };
  const parDe = h => { const x = document.querySelector('.golpes-input[data-hole="' + h + '"]'); const v = x ? parseInt(x.dataset.par, 10) : NaN; return isNaN(v) ? null : v; };
  const siDe = h => { const x = document.querySelector('.golpes-input[data-hole="' + h + '"]'); const v = x ? parseInt(x.dataset.strokeIndex, 10) : NaN; return isNaN(v) ? null : v; };
  const clase = (v, par) => {
    if(v == null || par == null) return '';
    const d = v - par;
    return d <= -2 ? 'tb-eagle' : d === -1 ? 'tb-birdie' : d === 0 ? 'tb-par' : d === 1 ? 'tb-bogey' : 'tb-doble';
  };
  const yoIdx = () => {
    let yo = window.miPerfil && window.miPerfil.player_name;
    if(!yo){ try { yo = localStorage.getItem('golfAppConvMe'); } catch(e){} } // app sin cuentas: «quién soy»
    const i = players.indexOf(yo); return i >= 0 ? i : 0;
  };

  // Colocar las piezas: la clasificación arriba del todo; la media tarjeta y la leyenda debajo del hoyo
  function colocar(){
    const hv = document.getElementById('holeViewSection');
    if(!hv) return false;
    const sc = hv.closest('.screen-content');
    const bar = sc && sc.querySelector('.app-bar');
    const m = document.getElementById('marcadorSection');
    if(bar && m && bar.nextElementSibling !== m) bar.after(m);
    if(!document.getElementById('tbTira')){
      const t = document.createElement('section'); t.id = 'tbTira'; t.className = 'tb-tira-sec';
      hv.after(t);
      const l = document.createElement('div'); l.id = 'tbLeyenda'; l.className = 'tb-leyenda';
      l.innerHTML = '<span><i class="tb-eagle"></i>Eagle</span><span><i class="tb-birdie"></i>Birdie</span><span><i class="tb-par"></i>Par</span><span><i class="tb-bogey"></i>Bogey</span><span><i class="tb-doble"></i>Doble o más</span>';
      t.after(l);
      const mapa = document.getElementById('greenArriba');
      if(mapa) l.after(mapa); // la distancia al green, debajo de la tarjeta
    }
    return true;
  }

  // ---------- Clasificación arriba ----------
  const marcadorOrig = typeof renderMarcador === 'function' ? renderMarcador : null;
  window.renderMarcador = function(standings){
    const box = document.getElementById('marcadorVivo');
    if(!box) return;
    const variosGrupos = matchGroups.filter(g => g.players && g.players.length).length > 1;
    const lista = standings.filter(s => s.group === activeGroup || variosGrupos);
    if(scoringType === 'matchplay' || !lista.length){ if(marcadorOrig) marcadorOrig(standings); return; }
    const sf = scoringType === 'stableford';
    const valor = s => sf ? s.points : s.scoreDiff;
    const nombre = s => {
      if(s.pIndexes && s.pIndexes.length > 1 && /^Pareja [AB]/.test(s.name)) return s.name;
      if(String(s.name).includes(' / ')) return nombrePareja(String(s.name).split(' / '));
      const w = String(s.name || '').trim().split(/\s+/);
      return w.length > 2 ? w.slice(0, 2).join(' ') : w.join(' ');
    };
    const alPar = s => s.holesFilled === 0 ? '—' : sf ? s.points : (s.scoreDiff === 0 ? 'PAR' : (s.scoreDiff > 0 ? '+' : '') + s.scoreDiff);
    // Las cervezas: paga la mitad de abajo (si son impares, el del medio se libra)
    const jugados = lista.filter(s => s.holesFilled > 0);
    const pagan = jugados.length >= 2 ? Math.floor(jugados.length / 2) : 0;
    const pagaCerveza = s => pagan > 0 && jugados.indexOf(s) >= jugados.length - pagan;
    window.tbPaganCervezas = jugados.slice(jugados.length - pagan).map(s => s.name);
    // Con 5 o más jugadores, de entrada solo se ven los de tu grupo (con su puesto entre todos)
    const recortar = lista.length >= 5 && variosGrupos && !tbCompleta;
    const ver = recortar ? lista.filter(s => s.group === activeGroup) : lista;
    const filas = ver.slice(0, 16).map((s) => {
      const k = lista.indexOf(s);
      const jugado = s.holesFilled > 0;
      const birra = pagaCerveza(s);
      const pos = jugado ? String(k + 1) : ''; // sin empates: a igual resultado, gana el hándicap más bajo (ya viene ordenado así)
      const g = matchGroups[s.group] || {};
      const hcp = s.pIndexes && s.pIndexes.length > 1 ? '' : (g.handicaps && g.handicaps[s.pIndex] != null ? 'HCP ' + Math.round(g.handicaps[s.pIndex]) : '');
      const elegible = s.group === activeGroup;
      const on = elegible && (s.pIndexes ? s.pIndexes.includes(tbDe) : s.pIndex === tbDe);
      const color = !jugado ? '' : sf ? '' : (s.scoreDiff < 0 ? ' bajo' : s.scoreDiff === 0 ? ' par' : '');
      return '<button type="button" class="tb-cl-fila' + (on ? ' on' : '') + (birra ? ' paga' : '') + (k === 0 && jugado ? ' lider' : '') + '"' + (elegible ? ' data-p="' + s.pIndex + '"' : ' disabled') + '>'
        + '<span class="tb-cl-pos">' + pos + '</span>'
        + '<span class="tb-cl-n"><b>' + (birra ? '<em class="tb-birra" aria-label="Paga cerveza">🍺</em>' : '') + esc(nombre(s)) + (hcp ? ' <small class="tb-cl-hcp">' + hcp.replace('HCP ', '') + '</small>' : '') + (variosGrupos ? ' <small>G' + (s.group + 1) + '</small>' : '') + '</b></span>'
        + '<span class="tb-cl-g">' + (jugado ? s.total : '—') + '</span>'
        + '<span class="tb-cl-p' + color + '">' + alPar(s) + '</span>'
        + '<span class="tb-cl-h">' + s.holesFilled + '</span></button>';
    }).join('');
    box.innerHTML = '<div class="tb-cl"><div class="tb-cl-cab"><span>#</span><span>JUGADOR · HCP</span><span>GOLPES</span><span>' + (sf ? 'PUNTOS' : 'AL PAR') + '</span><span>HOYOS</span></div>' + filas
      + (lista.length >= 5 && variosGrupos ? '<button type="button" class="tb-cl-todos" id="tbClTodos">' + (tbCompleta ? 'Ver solo mi grupo ▴' : 'Ver clasificación completa (' + lista.length + ') ▾') + '</button>' : '')
      + '</div>';
    const todos = document.getElementById('tbClTodos');
    if(todos) todos.addEventListener('click', () => { tbCompleta = !tbCompleta; renderHoleView(); });
    box.querySelectorAll('.tb-cl-fila[data-p]').forEach(b => b.addEventListener('click', () => { tbDe = +b.dataset.p; renderHoleView(); }));
  };

  // ---------- Media tarjeta (o entera) del jugador elegido ----------
  function bloque(i, desde, actual){
    let par = 0, golpes = 0, alguno = false;
    let hoyos = '', pares = '', marcas = '';
    for(let h = desde; h < desde + 9; h++){
      const p = parDe(h), v = golpesDe(h, i);
      par += p || 0;
      if(v != null){ golpes += v; alguno = true; }
      hoyos += '<button type="button" class="tb-h' + (h === actual ? ' actual' : '') + '" data-h="' + h + '" aria-label="Ir al hoyo ' + h + '">' + h + '</button>';
      pares += '<span>' + (p == null ? '' : p) + '</span>';
      marcas += '<span><i class="tb-m ' + clase(v, p) + '">' + (v == null ? '' : v) + '</i></span>';
    }
    const nom = desde === 1 ? 'Ida' : 'Vta';
    return '<div class="tb-bloque">'
      + '<div class="tb-r tb-r-h"><span class="tb-lbl">Hoyo</span>' + hoyos + '<span class="tb-tot">' + nom + '</span></div>'
      + '<div class="tb-r tb-r-p"><span class="tb-lbl">Par</span>' + pares + '<span class="tb-tot">' + par + '</span></div>'
      + '<div class="tb-r tb-r-g"><span class="tb-lbl">Golpes</span>' + marcas + '<span class="tb-tot b">' + (alguno ? golpes : '') + '</span></div>'
      + '</div>';
  }
  function pintarTira(){
    const t = document.getElementById('tbTira');
    if(!t) return;
    const n = players.filter(Boolean).length;
    if(!n){ t.innerHTML = ''; return; }
    if(tbDe == null || !players[tbDe]) tbDe = yoIdx();
    const nombre = String(players[tbDe] || '').includes(' / ') ? nombrePareja(String(players[tbDe]).split(' / ')) : String(players[tbDe] || '').trim().split(/\s+/)[0];
    const ida = currentHole <= 9;
    t.innerHTML = '<div class="tb-tira-cab"><b>' + esc(nombre).toUpperCase() + ' · ' + (tbEntera ? 'TARJETA ENTERA' : ida ? 'IDA (1 A 9)' : 'VUELTA (10 A 18)') + '</b>'
      + '<button type="button" class="tb-ver" id="tbVer">' + (tbEntera ? 'Ver solo media ‹' : 'Tarjeta entera ›') + '</button></div>'
      + (tbEntera ? bloque(tbDe, 1, currentHole) + bloque(tbDe, 10, currentHole) : bloque(tbDe, ida ? 1 : 10, currentHole))
      + (n > 1 ? '<p class="tb-pista">Toca un jugador de la clasificación para ver su tarjeta.</p>' : '');
    document.getElementById('tbVer').addEventListener('click', () => { tbEntera = !tbEntera; pintarTira(); });
    t.querySelectorAll('.tb-h').forEach(b => b.addEventListener('click', () => { currentHole = +b.dataset.h; renderHoleView(); }));
  }

  // ---------- Casillas de golpes pintadas según el resultado ----------
  function pintarCasillas(){
    const par = parDe(currentHole);
    document.querySelectorAll('#hvPlayers .stroke-box').forEach(b => {
      const v = parseInt(b.value, 10);
      b.classList.remove('tb-eagle', 'tb-birdie', 'tb-par', 'tb-bogey', 'tb-doble');
      const c = clase(isNaN(v) ? null : v, par); if(c) b.classList.add(c);
    });
    document.querySelectorAll('#hvPlayers .mk-box').forEach(b => {
      const v = parseInt(b.textContent, 10);
      b.classList.remove('tb-eagle', 'tb-birdie', 'tb-par', 'tb-bogey', 'tb-doble');
      const c = clase(isNaN(v) ? null : v, par); if(c) b.classList.add(c);
    });
  }

  // En qué pantalla estamos (para esconder los botones flotantes mientras se anota)
  function marcarPantalla(){
    const a = document.querySelector('.screen.active');
    const n = a ? a.dataset.screen : '';
    document.documentElement.classList.toggle('tb-s3', n === '3');
    document.documentElement.classList.toggle('tb-s4', n === '4');
  }
  window.tbMarcarPantalla = marcarPantalla;
  window.tbBloque = bloque;
  if(typeof goTo === 'function'){
    const goOrig = goTo;
    window.goTo = function(){ const r = goOrig.apply(this, arguments); try { marcarPantalla(); } catch(e){} return r; };
  }
  // «Guardar y seguir luego» ya no hace falta: cada golpe se guarda al momento
  const fin = document.getElementById('finalizarRondaBtn');
  if(fin) fin.textContent = 'Finalizar partida';

  const orig = window.renderHoleView;
  window.renderHoleView = function(){
    const r = orig.apply(this, arguments);
    try { marcarPantalla(); if(colocar()){ pintarCasillas(); pintarTira(); } } catch(e){ console.error(e); }
    return r;
  };
})();
