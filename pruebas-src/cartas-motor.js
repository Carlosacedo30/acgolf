/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Cartas: las cartas y las cuentas de la Copa de las Cartas ---
// Modalidad solo para reírse: NO cuenta para el hándicap, la liga ni ninguna clasificación.
// Las cartas mueven «puntos de juego» aparte; los golpes reales no se tocan.
// Este archivo solo tiene cartas y cuentas (sin pantallas), para poder probarlo aparte.
(function(root){
  // fam: v = ventaja, t = travesura, c = comodín · r: c común, m menos común, r rara, l legendaria
  // obj: 1 = hay que elegir a qué jugador va dirigida
  const CARTAS = {
    escudo:     { n:'Escudo',          fam:'v', r:'c', obj:0, t:'Si haces bogey, ese hoyo cuenta como par.' },
    seguro:     { n:'Seguro',          fam:'v', r:'c', obj:0, t:'Si haces 0 puntos, te quedas con 1.' },
    buendia:    { n:'Buen día',        fam:'v', r:'c', obj:0, t:'Un punto más para ti, sin condiciones.' },
    doble:      { n:'Doble o nada',    fam:'v', r:'m', obj:0, t:'Los puntos de este hoyo valen el doble.' },
    adivino:    { n:'El Adivino',      fam:'v', r:'m', obj:0, t:'Dices que haces par o mejor. Si aciertas, +2.' },
    racha:      { n:'Racha',           fam:'v', r:'m', obj:0, t:'Par o mejor en este hoyo y en el siguiente: +3.' },
    muro:       { n:'El Muro',         fam:'v', r:'m', obj:0, t:'En este hoyo nadie te puede jugar travesuras.' },
    espejo:     { n:'Espejo',          fam:'v', r:'m', obj:0, t:'Si te echan una travesura, rebota a quien la jugó.' },
    zancadilla: { n:'Zancadilla',      fam:'t', r:'c', obj:1, t:'Un rival pierde 1 punto en este hoyo.' },
    regalo:     { n:'Regalo',          fam:'t', r:'c', obj:1, t:'Das 1 punto de este hoyo a un amigo.' },
    cambiazo:   { n:'Cambiazo',        fam:'t', r:'m', obj:1, t:'Cambias tus puntos del hoyo con los de otro jugador.' },
    ladron:     { n:'Ladrón',          fam:'t', r:'m', obj:0, t:'Robas 1 punto al que más puntos haga en el hoyo.' },
    impuesto:   { n:'Impuesto',        fam:'t', r:'m', obj:0, t:'El que gane el hoyo da 1 punto al último.' },
    congelador: { n:'Congelador',      fam:'t', r:'m', obj:1, t:'Un rival no puede jugar cartas en el hoyo siguiente.' },
    robo:       { n:'Robo',            fam:'t', r:'r', obj:1, t:'Te llevas una carta al azar de un rival.' },
    palo:       { n:'Palo del rival',  fam:'t', r:'r', obj:1, t:'Tu rival elige el palo con el que sales. Una vez por partida.' },
    ruletaLola: { n:'Ruleta de Lola',  fam:'c', r:'r', obj:0, t:'La app saca una carta al azar y Lola la anuncia.' },
    ruletaCurro:{ n:'Ruleta de Curro', fam:'c', r:'r', obj:0, t:'Como la de Lola, pero con Curro. Premio o castigo.' },
    todos:      { n:'Todos a una',     fam:'c', r:'r', obj:0, t:'Todos ganan 1 punto en este hoyo.' },
    revolucion: { n:'Revolución',      fam:'c', r:'r', obj:0, t:'En este hoyo gana el que menos puntos haga.' },
    oro:        { n:'Carta Oro',       fam:'c', r:'l', obj:0, t:'+5 puntos. Rarísima: solo una por partida.' },
  };
  const PESO = { c: 5, m: 3, r: 1.2, l: 0.35 };
  const TRAVESURAS = { zancadilla:1, cambiazo:1, ladron:1, impuesto:1, congelador:1, robo:1, palo:1 };
  const POOL_LOLA = ['escudo','doble','buendia','adivino','seguro','zancadilla','ladron','regalo','todos','impuesto'];
  const POOL_CURRO = ['doble','todos','zancadilla','ladron','impuesto','cambiazo','revolucion','buendia'];

  // Cartas repartidas: 3 al empezar y 1 nueva cada 3 hoyos (al terminar el 3, 6, 9, 12 y 15; en 9 hoyos, el 3 y el 6)
  const INICIALES = 3;
  const nuevasMax = n => Math.floor((n - 1) / 3);

  // ---- Azar repetible (para ruletas y robos: todos los móviles sacan lo mismo) ----
  function semilla(txt){ let h = 1779033703 ^ txt.length; for(let i = 0; i < txt.length; i++){ h = Math.imul(h ^ txt.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
  function azar(txt){ let a = semilla(txt); return function(){ a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---- Sacar una carta de la baraja (azar de verdad, solo al repartir) ----
  // tiene: cartas que ya tiene en la mano; oroUsado: ya salió la Carta Oro en esta partida
  function sacarCarta(tiene, oroUsado, rnd){
    const r = rnd || Math.random;
    let ids = Object.keys(CARTAS).filter(id => !(id === 'oro' && oroUsado));
    const sinRepetir = ids.filter(id => (tiene || []).indexOf(id) < 0);
    if(sinRepetir.length) ids = sinRepetir;
    const total = ids.reduce((s, id) => s + PESO[CARTAS[id].r], 0);
    let x = r() * total;
    for(const id of ids){ x -= PESO[CARTAS[id].r]; if(x <= 0) return id; }
    return ids[ids.length - 1];
  }

  // ---- Puntos normales de un hoyo (Stableford neto) ----
  // Golpes que recibe en un hoyo: hcp = hándicap de juego para los hoyos que se juegan; rango = 1 (el más difícil) a n
  function golpesRecibidos(hcp, rango, n){
    const h = Math.round(Number(hcp) || 0);
    if(h <= 0) return 0;
    return Math.floor(h / n) + ((h % n) >= rango ? 1 : 0);
  }
  const NO_PUNTUA = 99; // «recogí la bola»
  function puntosNormales(golpes, par, recibe){
    if(golpes == null) return null;
    if(golpes >= NO_PUNTUA) return 0;
    return Math.max(0, 2 - (golpes - par - recibe));
  }

  // ---- Cuentas de toda la partida ----
  // est = { code, n, par:[…n], rango:[…n] (1 = más difícil), jug:[{ nombre, hcp, golpes:{pos:n}, elige:{pos:{c,o}}, sorteo:[ids], fuera }] }
  function simular(est){
    const n = est.n;
    const act = est.jug.filter(j => !j.fuera);
    const nombres = act.map(j => j.nombre);
    const por = {}; est.jug.forEach(j => { por[j.nombre] = j; });
    const mano = {}, paloUsado = {}, congelado = {};
    act.forEach(j => { mano[j.nombre] = (j.sorteo || []).slice(0, INICIALES); paloUsado[j.nombre] = false; });
    const hoyos = [];
    const base = {}; // base[pos][nombre]
    const recibe = (j, pos) => golpesRecibidos(j.hcp, est.rango[pos - 1], n);
    // Fase A: qué hoyos están cerrados (los han anotado todos) y sus puntos normales
    let cerrados = 0;
    for(let pos = 1; pos <= n; pos++){
      if(!act.length || !act.every(j => j.golpes && j.golpes[pos] != null)) break;
      base[pos] = {}; act.forEach(j => { base[pos][j.nombre] = puntosNormales(j.golpes[pos], est.par[pos - 1], recibe(j, pos)); });
      cerrados = pos;
    }
    // Fase B: repartir las cartas hoyo a hoyo
    const totales = {}; act.forEach(j => { totales[j.nombre] = 0; });
    for(let pos = 1; pos <= cerrados; pos++){
      // cartas nuevas al empezar el hoyo 4, 7, 10, 13, 16
      if(pos > 1 && (pos - 1) % 3 === 0 && (pos - 1) / 3 <= nuevasMax(n)){
        act.forEach(j => { const c = (j.sorteo || [])[INICIALES + (pos - 1) / 3 - 1]; if(c) mano[j.nombre].push(c); });
      }
      const h = { pos, cerrado: true, jug: {} };
      const fin = {}, notas = {}, juega = {};
      act.forEach(j => {
        fin[j.nombre] = base[pos][j.nombre]; notas[j.nombre] = [];
        h.jug[j.nombre] = { golpes: j.golpes[pos], base: base[pos][j.nombre] };
      });
      // qué carta juega cada uno (solo vale si la tiene, no está congelado y el objetivo es correcto)
      act.forEach(j => {
        const e = (j.elige || {})[pos]; if(!e || !e.c || !CARTAS[e.c]) return;
        if(mano[j.nombre].indexOf(e.c) < 0) return;
        if((congelado[pos] || []).indexOf(j.nombre) >= 0) return;
        if(e.c === 'palo' && paloUsado[j.nombre]) return;
        let c = e.c, o = e.o || null;
        if(CARTAS[c].obj && (!o || o === j.nombre || nombres.indexOf(o) < 0)) return;
        juega[j.nombre] = { c, o, original: c };
      });
      // las cartas jugadas salen de la mano (la ruleta se cambia por la carta que toque)
      nombres.forEach(nm => {
        const p = juega[nm]; if(!p) return;
        mano[nm].splice(mano[nm].indexOf(p.c), 1);
        if(p.c === 'palo') paloUsado[nm] = true;
        if(p.c === 'ruletaLola' || p.c === 'ruletaCurro'){
          const rnd = azar(est.code + '|' + pos + '|' + nm);
          const pool = p.c === 'ruletaLola' ? POOL_LOLA : POOL_CURRO;
          p.c = pool[Math.floor(rnd() * pool.length)];
          if(CARTAS[p.c].obj){ const otros = nombres.filter(x => x !== nm); p.o = otros[Math.floor(rnd() * otros.length)] || null; }
          notas[nm].push('La ' + CARTAS[p.original].n + ' ha sacado: ' + CARTAS[p.c].n);
        }
        h.jug[nm].carta = p.original; h.jug[nm].sale = p.c; h.jug[nm].objetivo = p.o;
      });
      const tiene = (nm, c) => juega[nm] && juega[nm].c === c;
      const suma = (nm, v, txt) => { fin[nm] += v; notas[nm].push(txt); };
      // 1. cartas propias
      nombres.forEach(nm => {
        if(tiene(nm, 'escudo')){ if(base[pos][nm] === 1){ fin[nm] = 2; notas[nm].push('Escudo: el bogey cuenta como par (+1)'); } else notas[nm].push('Escudo: no hacía falta'); }
        if(tiene(nm, 'seguro')){ if(fin[nm] === 0){ fin[nm] = 1; notas[nm].push('Seguro: te quedas con 1 punto'); } else notas[nm].push('Seguro: no hacía falta'); }
        if(tiene(nm, 'buendia')) suma(nm, 1, 'Buen día: +1');
        if(tiene(nm, 'adivino')){ if(base[pos][nm] >= 2) suma(nm, 2, 'El Adivino acierta: +2'); else notas[nm].push('El Adivino falla: 0'); }
        if(tiene(nm, 'oro')) suma(nm, 5, 'Carta Oro: +5');
        if(tiene(nm, 'racha')){
          if(pos >= n) notas[nm].push('Racha: no hay hoyo siguiente');
          else if(!base[pos + 1]) notas[nm].push('Racha: pendiente del hoyo siguiente');
          else if(base[pos][nm] >= 2 && base[pos + 1][nm] >= 2) suma(nm, 3, 'Racha: par o mejor dos hoyos seguidos (+3)');
          else notas[nm].push('Racha: no ha salido');
        }
      });
      nombres.forEach(nm => { if(tiene(nm, 'doble')){ const antes = fin[nm]; fin[nm] = antes * 2; notas[nm].push('Doble o nada: ' + antes + ' × 2'); } });
      // 2. cartas de todos
      const nTodos = nombres.filter(nm => tiene(nm, 'todos')).length;
      if(nTodos) nombres.forEach(nm => { fin[nm] += nTodos; notas[nm].push('Todos a una: +' + nTodos); });
      if(nombres.some(nm => tiene(nm, 'revolucion'))){
        const v = nombres.map(nm => fin[nm]); const t = Math.max.apply(null, v) + Math.min.apply(null, v);
        nombres.forEach(nm => { fin[nm] = t - fin[nm]; notas[nm].push('Revolución: puntos al revés'); });
      }
      // 3. cartas contra otros (en el orden de la lista; El Muro y el Espejo las frenan)
      const sale = (a, o, que) => {
        // devuelve a quién llega de verdad la travesura: null = frenada
        if(!o) return null;
        if(tiene(o, 'muro')){ notas[a].push(CARTAS[que].n + ': frenada por El Muro'); notas[o].push('El Muro frena ' + CARTAS[que].n + ' de ' + a); return null; }
        if(tiene(o, 'espejo') && que !== 'cambiazo'){ notas[a].push(CARTAS[que].n + ': rebota por el Espejo de ' + o); notas[o].push('Espejo: ' + CARTAS[que].n + ' rebota a ' + a); return { a: o, o: a }; }
        return { a, o };
      };
      nombres.forEach(a => {
        const p = juega[a]; if(!p || !TRAVESURAS[p.c] && p.c !== 'regalo') return;
        if(p.c === 'regalo'){
          if(fin[a] >= 1 && p.o){ fin[a] -= 1; fin[p.o] += 1; notas[a].push('Regalo: das 1 punto a ' + p.o + ' (−1)'); notas[p.o].push('Regalo de ' + a + ': +1'); }
          else notas[a].push('Regalo: no tienes puntos que dar');
          return;
        }
        let objetivo = p.o;
        if(p.c === 'ladron'){ const otros = nombres.filter(x => x !== a); objetivo = otros.sort((x, y) => fin[y] - fin[x])[0] || null; }
        if(p.c === 'impuesto'){ objetivo = null; }
        if(p.c === 'impuesto'){
          const orden = nombres.slice().sort((x, y) => fin[y] - fin[x]); const ganador = orden[0], ultimo = orden[orden.length - 1];
          if(ganador === ultimo || fin[ganador] < 1){ notas[a].push('Impuesto: nadie tiene puntos que pagar'); return; }
          const r = sale(a, ganador, 'impuesto'); if(!r) return;
          const quien = r.o === ganador ? ganador : r.o;
          fin[quien] -= 1; fin[ultimo] += 1; notas[quien].push('Impuesto: pagas 1 punto a ' + ultimo + ' (−1)'); notas[ultimo].push('Impuesto de ' + a + ': +1');
          return;
        }
        const r = sale(a, objetivo, p.c); if(!r) return;
        const A = r.a, O = r.o;
        if(p.c === 'zancadilla'){ if(fin[O] > 0){ fin[O] -= 1; notas[O].push('Zancadilla de ' + A + ': −1'); } else notas[O].push('Zancadilla de ' + A + ': ya tenías 0'); notas[A].push('Zancadilla a ' + O); }
        if(p.c === 'ladron'){ if(fin[O] > 0){ fin[O] -= 1; fin[A] += 1; notas[A].push('Ladrón: robas 1 punto a ' + O + ' (+1)'); notas[O].push('Ladrón de ' + A + ': −1'); } else notas[A].push('Ladrón: ' + O + ' no tenía puntos'); }
        if(p.c === 'cambiazo'){ const t = fin[A]; fin[A] = fin[O]; fin[O] = t; notas[A].push('Cambiazo con ' + O); notas[O].push('Cambiazo de ' + A); }
        if(p.c === 'congelador'){ (congelado[pos + 1] = congelado[pos + 1] || []).push(O); notas[A].push('Congelador a ' + O); notas[O].push('Congelador de ' + A + ': no juegas cartas en el hoyo siguiente'); }
        if(p.c === 'palo'){ notas[A].push('Palo del rival: ' + O + ' elige tu palo de salida'); notas[O].push('Palo del rival: eliges el palo de salida de ' + A); }
        if(p.c === 'robo'){
          const cand = mano[O].slice();
          if(cand.length){ const rnd = azar(est.code + '|robo|' + pos + '|' + A); const c = cand[Math.floor(rnd() * cand.length)]; mano[O].splice(mano[O].indexOf(c), 1); mano[A].push(c); notas[A].push('Robo: te llevas una carta de ' + O); notas[O].push('Robo de ' + A + ': te quitan una carta'); }
          else notas[A].push('Robo: ' + O + ' no tenía cartas');
        }
      });
      nombres.forEach(nm => { fin[nm] = Math.max(0, fin[nm]); totales[nm] += fin[nm]; h.jug[nm].fin = fin[nm]; h.jug[nm].notas = notas[nm]; });
      hoyos.push(h);
    }
    // Hoyo que se está jugando ahora (si la partida no ha terminado): mano que se tiene al empezarlo
    const posActual = Math.min(cerrados + 1, n);
    const terminada = cerrados >= n && n > 0;
    if(!terminada && cerrados >= 1 && cerrados % 3 === 0 && cerrados / 3 <= nuevasMax(n)){
      act.forEach(j => { const c = (j.sorteo || [])[INICIALES + cerrados / 3 - 1]; if(c) mano[j.nombre].push(c); });
    }
    const total = {};
    act.forEach(j => { const sinUsar = terminada ? mano[j.nombre].length : 0; total[j.nombre] = { hoyos: totales[j.nombre], sinUsar, total: totales[j.nombre] + sinUsar, hcp: j.hcp }; });
    const clasificacion = act.map(j => j.nombre).sort((a, b) => total[b].total - total[a].total || total[a].hcp - total[b].hcp || a.localeCompare(b, 'es'));
    return { n, cerrados, posActual, terminada, hoyos, mano, congelado: congelado[posActual] || [], paloUsado, total, clasificacion, base };
  }

  const M = { CARTAS, PESO, INICIALES, nuevasMax, sacarCarta, golpesRecibidos, puntosNormales, simular, NO_PUNTUA };
  if(typeof module !== 'undefined' && module.exports) module.exports = M; else root.CartasMotor = M;
})(typeof window !== 'undefined' ? window : globalThis);
