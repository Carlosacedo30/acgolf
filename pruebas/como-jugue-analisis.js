/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- «¿Cómo jugué?»: análisis de las últimas 18 tarjetas del jugador (datos de la app) ---
// Debajo del resumen de cada jugador:
//  1) Mapa de calor hoyo a hoyo por tarjeta: birdies, pares, bogeys y dobles o más.
//  2) Líneas cruzadas: control de errores (dobles o más) frente a eficiencia (pares + birdies).
//  3) Golpes sobre el par por campo: un punto por tarjeta y una línea con la media.
//  + Evolución del hándicap y diagnóstico por áreas (salida, golpe a green, juego corto, putt).
// Las tarjetas salen de la función ultimas_tarjetas() (partidas de la app + historial de golfdirecto).
(function(){
  'use strict';
  const N = 18;
  const COL = { birdie:'#E5484D', par:'#FFFFFF', bogey:'#8DB8FF', doble:'#2F5BD3', verde:'#2E7D32', oscuro:'#0E3324', gris:'#5C6670', linea:'#DADFE3' };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const coma = (n, d) => n == null || !isFinite(n) ? '—' : Number(n).toFixed(d == null ? 1 : d).replace('.', ',');
  const fechaCorta = f => { const d = new Date(f); return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); };
  const cache = {};   // nombre -> { cuando, tarjetas } (se pide como mucho cada 10 minutos)
  let pidiendo = null;

  // ---------- Datos ----------
  async function tarjetasDe(nombre){
    const c = cache[nombre];
    if(c && Date.now() - c.cuando < 10 * 60 * 1000) return c.tarjetas;
    const client = typeof initSupabase === 'function' ? initSupabase() : null;
    if(!client) throw new Error('sin conexión');
    const { data, error } = await client.rpc('ultimas_tarjetas', { p_jugador: nombre, p_limite: N });
    if(error) throw error;
    const lista = (Array.isArray(data) ? data : []).map(t => ({
      fecha: t.fecha, campo: t.campo || 'Campo', hcp: t.hcp == null ? null : Number(t.hcp),
      par: (t.par || []).map(Number), golpes: (t.golpes || []).map(Number), fuente: t.fuente,
    })).filter(t => t.par.length === 18 && t.golpes.length === 18);
    cache[nombre] = { cuando: Date.now(), tarjetas: lista };
    return lista;
  }

  const tipo = (g, p) => { const d = g - p; return d <= -1 ? 'birdie' : d === 0 ? 'par' : d === 1 ? 'bogey' : 'doble'; };

  function cuentas(ts){
    const porTarjeta = ts.map(t => {
      const c = { birdie:0, par:0, bogey:0, doble:0 };
      t.golpes.forEach((g, i) => c[tipo(g, t.par[i])]++);
      const sobre = t.golpes.reduce((a, b) => a + b, 0) - t.par.reduce((a, b) => a + b, 0);
      return Object.assign(c, { sobre, total: t.golpes.reduce((a, b) => a + b, 0) });
    });
    return porTarjeta;
  }

  // ---------- 1) Mapa de calor ----------
  function mapaCalor(ts){
    const W = 340, izq = 44, arriba = 18, celda = (W - izq - 4) / 18, alto = Math.min(16, celda);
    const H = arriba + ts.length * alto + 4;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ca-svg" role="img" aria-label="Mapa de calor hoyo a hoyo de las últimas tarjetas">';
    for(let h = 0; h < 18; h++){
      s += '<text x="' + (izq + h * celda + celda / 2) + '" y="12" class="ca-eje" text-anchor="middle">' + (h + 1) + '</text>';
    }
    ts.forEach((t, r) => {
      const y = arriba + r * alto;
      s += '<text x="' + (izq - 6) + '" y="' + (y + alto * 0.72) + '" class="ca-eje" text-anchor="end">' + fechaCorta(t.fecha) + '</text>';
      t.golpes.forEach((g, h) => {
        const k = tipo(g, t.par[h]);
        s += '<rect x="' + (izq + h * celda + 0.5) + '" y="' + (y + 0.5) + '" width="' + (celda - 1) + '" height="' + (alto - 1) + '" rx="2" fill="' + COL[k] + '"'
          + (k === 'par' ? ' stroke="#B8C0C7" stroke-width="0.8"' : '') + '><title>' + fechaCorta(t.fecha) + ' · hoyo ' + (h + 1) + ': ' + g + ' (par ' + t.par[h] + ')</title></rect>';
      });
    });
    s += '<line x1="' + (izq + 9 * celda) + '" y1="' + (arriba - 2) + '" x2="' + (izq + 9 * celda) + '" y2="' + (H - 2) + '" stroke="' + COL.oscuro + '" stroke-width="1.2" stroke-dasharray="2 2"/>';
    return s + '</svg>';
  }

  // ---------- 2) Líneas cruzadas ----------
  function lineas(ts, c){
    const W = 340, H = 190, izq = 30, der = 10, arriba = 12, abajo = 26;
    const x = i => izq + (ts.length === 1 ? (W - izq - der) / 2 : i * (W - izq - der) / (ts.length - 1));
    const y = v => arriba + (1 - v / 18) * (H - arriba - abajo);
    const efi = c.map(k => k.par + k.birdie), err = c.map(k => k.doble);
    const camino = arr => arr.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ca-svg" role="img" aria-label="Pares y birdies frente a dobles o más en cada tarjeta">';
    [0, 6, 12, 18].forEach(v => { s += '<line x1="' + izq + '" x2="' + (W - der) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="' + COL.linea + '"/><text x="' + (izq - 5) + '" y="' + (y(v) + 4) + '" class="ca-eje" text-anchor="end">' + v + '</text>'; });
    ts.forEach((t, i) => { if(i % Math.ceil(ts.length / 6) === 0 || i === ts.length - 1) s += '<text x="' + x(i) + '" y="' + (H - 8) + '" class="ca-eje" text-anchor="middle">' + fechaCorta(t.fecha) + '</text>'; });
    s += '<path d="' + camino(efi) + '" fill="none" stroke="' + COL.verde + '" stroke-width="2.5" stroke-linejoin="round"/>';
    s += '<path d="' + camino(err) + '" fill="none" stroke="' + COL.doble + '" stroke-width="2.5" stroke-linejoin="round"/>';
    efi.forEach((v, i) => { s += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3" fill="' + COL.verde + '"><title>' + fechaCorta(ts[i].fecha) + ': ' + v + ' pares o birdies</title></circle>'; });
    err.forEach((v, i) => { s += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3" fill="' + COL.doble + '"><title>' + fechaCorta(ts[i].fecha) + ': ' + v + ' dobles o más</title></circle>'; });
    // etiqueta directa al final de cada línea
    const u = ts.length - 1;
    s += '<text x="' + (x(u) - 4) + '" y="' + (y(efi[u]) - 7) + '" class="ca-et" fill="' + COL.verde + '" text-anchor="end">' + efi[u] + '</text>';
    s += '<text x="' + (x(u) - 4) + '" y="' + (y(err[u]) + 15) + '" class="ca-et" fill="' + COL.doble + '" text-anchor="end">' + err[u] + '</text>';
    return s + '</svg>';
  }

  // ---------- 3) Golpes sobre el par por campo ----------
  function porCampo(ts, c){
    const campos = [...new Set(ts.map(t => t.campo))];
    const W = 340, izq = 30, der = 10, arriba = 14, abajo = 30, H = 200;
    const vals = c.map(k => k.sobre);
    const min = Math.min(0, Math.floor((Math.min(...vals) - 2) / 5) * 5), max = Math.ceil((Math.max(...vals) + 2) / 5) * 5;
    const y = v => arriba + (1 - (v - min) / (max - min)) * (H - arriba - abajo);
    const ancho = (W - izq - der) / campos.length;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ca-svg" role="img" aria-label="Golpes sobre el par en cada tarjeta, por campo">';
    for(let v = min; v <= max; v += 5) s += '<line x1="' + izq + '" x2="' + (W - der) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="' + COL.linea + '"/><text x="' + (izq - 5) + '" y="' + (y(v) + 4) + '" class="ca-eje" text-anchor="end">' + (v > 0 ? '+' + v : v) + '</text>';
    campos.forEach((cp, j) => {
      const cx = izq + ancho * j + ancho / 2;
      const mios = ts.map((t, i) => ({ t, v: vals[i] })).filter(x => x.t.campo === cp);
      const media = mios.reduce((a, b) => a + b.v, 0) / mios.length;
      mios.forEach((m, k) => {
        const dx = ((k * 37) % 21 - 10) / 10 * Math.min(ancho * 0.3, 40); // reparto fijo (sin azar) para que no se tapen
        s += '<circle cx="' + (cx + dx).toFixed(1) + '" cy="' + y(m.v).toFixed(1) + '" r="4.5" fill="' + COL.verde + '" fill-opacity="0.55" stroke="#FFFFFF" stroke-width="1"><title>' + fechaCorta(m.t.fecha) + ': +' + m.v + '</title></circle>';
      });
      const half = Math.min(ancho * 0.38, 60);
      s += '<line x1="' + (cx - half) + '" x2="' + (cx + half) + '" y1="' + y(media) + '" y2="' + y(media) + '" stroke="' + COL.oscuro + '" stroke-width="3" stroke-linecap="round"/>';
      s += '<text x="' + (cx + half + 3) + '" y="' + (y(media) + 4) + '" class="ca-et" fill="' + COL.oscuro + '">+' + coma(media) + '</text>';
      const nom = cp.length > 18 ? cp.slice(0, 17) + '…' : cp;
      s += '<text x="' + cx + '" y="' + (H - 10) + '" class="ca-eje" text-anchor="middle">' + esc(nom) + ' (' + mios.length + ')</text>';
    });
    return s + '</svg>';
  }

  // ---------- Hándicap ----------
  function hcpLinea(ts){
    const pts = ts.map((t, i) => ({ i, v: t.hcp })).filter(p => p.v != null);
    if(pts.length < 2) return '';
    const W = 340, H = 110, izq = 30, der = 34, arriba = 14, abajo = 22;
    const vs = pts.map(p => p.v), min = Math.floor(Math.min(...vs) - 1), max = Math.ceil(Math.max(...vs) + 1);
    const x = i => izq + i * (W - izq - der) / Math.max(1, ts.length - 1);
    const y = v => arriba + (1 - (v - min) / (max - min)) * (H - arriba - abajo);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ca-svg" role="img" aria-label="Evolución del hándicap">';
    [min, max].forEach(v => { s += '<line x1="' + izq + '" x2="' + (W - der) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="' + COL.linea + '"/><text x="' + (izq - 5) + '" y="' + (y(v) + 4) + '" class="ca-eje" text-anchor="end">' + v + '</text>'; });
    s += '<path d="' + pts.map((p, k) => (k ? 'L' : 'M') + x(p.i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ') + '" fill="none" stroke="' + COL.oscuro + '" stroke-width="2.5"/>';
    const u = pts[pts.length - 1];
    s += '<circle cx="' + x(u.i) + '" cy="' + y(u.v) + '" r="4" fill="' + COL.oscuro + '"/><text x="' + (x(u.i) + 7) + '" y="' + (y(u.v) + 4) + '" class="ca-et" fill="' + COL.oscuro + '">' + coma(u.v) + '</text>';
    s += '<text x="' + x(0) + '" y="' + (H - 6) + '" class="ca-eje">' + fechaCorta(ts[0].fecha) + '</text><text x="' + x(ts.length - 1) + '" y="' + (H - 6) + '" class="ca-eje" text-anchor="end">' + fechaCorta(ts[ts.length - 1].fecha) + '</text>';
    return s + '</svg>';
  }

  // ---------- Diagnóstico por áreas (estimado solo con la tarjeta) ----------
  function diagnostico(ts){
    let p45 = 0, d45 = 0, p3 = 0, s3 = 0, falla = 0, bog = 0;
    const porHoyo = {}; // campo|hoyo -> sumas
    ts.forEach(t => t.golpes.forEach((g, i) => {
      const p = t.par[i], d = g - p;
      if(p >= 4){ p45++; if(d >= 2) d45++; }
      if(p === 3){ p3++; s3 += d; }
      if(d >= 1){ falla++; if(d === 1) bog++; }
      const k = t.campo + '|' + (i + 1);
      (porHoyo[k] = porHoyo[k] || { campo: t.campo, h: i + 1, par: p, n: 0, s: 0 }); porHoyo[k].n++; porHoyo[k].s += d;
    }));
    const nivel = (v, bien, regular, alReves) => {
      const b = alReves ? v >= bien : v <= bien, r = alReves ? v >= regular : v <= regular;
      return b ? ['bien', 'Bien'] : r ? ['regular', 'Mejorable'] : ['mal', 'A trabajar'];
    };
    const salida = p45 ? d45 / p45 * 100 : null;
    const green = p3 ? s3 / p3 : null;
    const corto = falla ? bog / falla * 100 : null;
    const areas = [
      { t:'Salida (drive)', v: salida, txt: coma(salida, 0) + '% de dobles o más en pares 4 y 5', n: nivel(salida, 15, 30),
        c:'Los hoyos grandes suelen venir de la salida: fuera de calle, agua o fuera de límites. Si es alto, sal con el palo que más controles.' },
      { t:'Golpe a green', v: green, txt: '+' + coma(green) + ' golpes sobre el par en los pares 3', n: nivel(green, 0.6, 1.1),
        c:'En un par 3 el primer golpe ya es al green: mide cómo llegas a green con hierros.' },
      { t:'Juego corto', v: corto, txt: coma(corto, 0) + '% de los hoyos fallados se quedan en bogey', n: nivel(corto, 65, 45, true),
        c:'Cuando no haces par, ¿lo salvas con un bogey o se convierte en doble? Cuanto más alto, mejor aproximación y salida de búnker.' },
    ];
    const peores = Object.values(porHoyo).filter(x => x.n >= 3).map(x => Object.assign(x, { m: x.s / x.n })).sort((a, b) => b.m - a.m).slice(0, 3);
    let h = '<div class="ca-areas">' + areas.map(a => '<div class="ca-area ' + a.n[0] + '"><div class="ca-area-c"><b>' + a.t + '</b><span class="ca-chip">' + a.n[1] + '</span></div>'
      + '<div class="ca-area-v">' + esc(a.txt) + '</div><div class="ca-area-x">' + esc(a.c) + '</div></div>').join('')
      + '<div class="ca-area sin"><div class="ca-area-c"><b>Putt</b><span class="ca-chip">Sin datos</span></div>'
      + '<div class="ca-area-x">La tarjeta solo guarda los golpes del hoyo, no los putts. Para medir el putt habría que apuntar los putts de cada hoyo.</div></div></div>';
    if(peores.length) h += '<div class="ca-sub">Los hoyos que más te cuestan</div><div class="ca-peores">'
      + peores.map(x => '<div><b>Hoyo ' + x.h + '</b><span>' + esc(x.campo) + ' · par ' + x.par + '</span><em>+' + coma(x.m) + '</em></div>').join('') + '</div>';
    return h;
  }

  // ---------- Montaje ----------
  function seccion(titulo, sub, cuerpo){
    return '<div class="rj-sec ca-sec"><div class="rj-sec-t">' + titulo + '</div>' + (sub ? '<p class="rj-nota ca-nota">' + sub + '</p>' : '') + cuerpo + '</div>';
  }
  function pintar(box, nombre, ts){
    if(!ts.length){ box.innerHTML = seccion('Tus últimas tarjetas', '', '<p class="rj-p">Todavía no hay tarjetas completas de 18 hoyos de ' + esc(nombre) + '.</p>'); return; }
    const c = cuentas(ts);
    const media = c.reduce((a, b) => a + b.sobre, 0) / c.length;
    const tot = k => c.reduce((a, b) => a + b[k], 0);
    const hs = ts.filter(t => t.hcp != null);
    const leyenda = '<div class="ca-ley"><span><i style="background:' + COL.birdie + '"></i>Birdie o mejor</span><span><i class="par"></i>Par</span><span><i style="background:' + COL.bogey + '"></i>Bogey</span><span><i style="background:' + COL.doble + '"></i>Doble o más</span></div>';
    box.innerHTML =
      seccion('Tus últimas ' + ts.length + ' tarjetas', fechaCorta(ts[0].fecha) + ' a ' + fechaCorta(ts[ts.length - 1].fecha) + ' · solo tarjetas completas de 18 hoyos',
        '<div class="ca-kpis"><div><b>+' + coma(media) + '</b><span>golpes sobre el par de media</span></div>'
        + '<div><b>' + tot('birdie') + '</b><span>birdies</span></div><div><b>' + tot('par') + '</b><span>pares</span></div>'
        + '<div><b>' + tot('doble') + '</b><span>dobles o más</span></div></div>'
        + (hs.length >= 2 ? '<div class="ca-sub">Hándicap: ' + coma(hs[0].hcp) + ' → ' + coma(hs[hs.length - 1].hcp) + '</div>' + hcpLinea(ts) : ''))
      + seccion('Hoyo a hoyo', 'Cada fila es una tarjeta (la de abajo, la más reciente). La raya separa la ida de la vuelta.', mapaCalor(ts) + leyenda)
      + seccion('Aciertos frente a errores', 'Hoyos de cada tarjeta: <b style="color:' + COL.verde + '">pares y birdies</b> (eficiencia) frente a <b style="color:' + COL.doble + '">dobles o más</b> (errores). Lo ideal: la verde arriba y la azul abajo.', lineas(ts, c))
      + seccion('Golpes sobre el par por campo', 'Cada punto es una tarjeta; la raya oscura es tu media en ese campo.', porCampo(ts, c))
      + seccion('Diagnóstico por áreas', 'Estimado con lo que guarda la tarjeta (golpes de cada hoyo).', diagnostico(ts));
  }

  async function montar(){
    const rj = document.getElementById('rjBox');
    const cab = rj && rj.querySelector('.rj-cab .rj-nom');
    if(!cab) return;
    const nombre = cab.textContent.trim();
    if(!nombre || nombre.includes(' / ')) return;   // parejas: no hay tarjeta individual
    let box = document.getElementById('caBox');
    if(box && box.dataset.jugador === nombre && rj.contains(box)) return;
    if(!box || !rj.contains(box)){ box = document.createElement('div'); box.id = 'caBox'; box.className = 'ca-box'; rj.appendChild(box); }
    box.dataset.jugador = nombre;
    const c = cache[nombre];
    if(c && Date.now() - c.cuando < 10 * 60 * 1000){ pintar(box, nombre, c.tarjetas); return; }   // ya cargadas: sin parpadeo
    box.innerHTML = '<div class="rj-sec"><div class="rj-sec-t">Tus últimas tarjetas</div><p class="rj-p">Cargando tus tarjetas…</p></div>';
    try {
      const yo = pidiendo = nombre;
      const ts = await tarjetasDe(nombre);
      if(pidiendo !== yo || box.dataset.jugador !== nombre) return;
      pintar(box, nombre, ts);
    } catch(e){
      box.innerHTML = '<div class="rj-sec"><div class="rj-sec-t">Tus últimas tarjetas</div><p class="rj-p">No se han podido cargar. Revisa la cobertura.</p></div>';
    }
  }

  // El resumen se repinta entero a menudo: se vuelve a colocar el análisis cuando hace falta
  function vigilar(){
    const rj = document.getElementById('rjBox');
    if(!rj){ setTimeout(vigilar, 800); return; }
    new MutationObserver(() => montar()).observe(rj, { childList: true });
    montar();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigilar); else vigilar();
  window.acgolfComoJugue = { tarjetasDe, cuentas, diagnostico };
})();
