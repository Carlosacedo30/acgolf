/* © 2026 Carlos Acedo Domínguez. acgolf TV nueva (28-nov-2026, solo pruebas).
   Encima de la tele de siempre (tele-directo.js) pone:
   · vistas que cambian solas: clasificación (con empates tipo golf «T2»), el hoyo donde está cada grupo dibujado en silueta
     (con la salida, el green y los bunkers/agua de la app) y los grupos en el campo;
   · animación a pantalla completa cuando alguien anota birdie, águila o pasa a liderar (vídeos de Curro y Lola);
   · un rótulo de entrada.
   Todo se cuenta según el hoyo por el que salió cada grupo (ordenDe), nunca 1→18 a ciegas. Nombres completos. */
(function(){
  'use strict';
  const EV = () => window.acgolfEnVivo || {};
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const signo = d => d === 0 ? 'E' : (d > 0 ? '+' : '−') + Math.abs(d);
  const largo = n => { n = String(n || '').trim(); return n.includes(' / ') ? n.split(' / ').map(x => x.split(/\s+/)[0]).join(' y ') : n.split(/\s+/).slice(0, 3).join(' '); };
  const etq = h => (window.etqV ? window.etqV(h) : h);
  const cliente = () => { try { return typeof initSupabase === 'function' ? initSupabase() : null; } catch(e){ return null; } };

  let zumT1 = null, zumT2 = null, ronda = null, vista = 0, grupoTurno = 0, timer = null, fiestaT = null, memoria = null, geo = {}, geoPidiendo = {};
  const TIEMPO = 9000;
  let faseAct = 'medio'; const tiempoFase = () => faseAct === 'final' ? 7000 : TIEMPO;
  // vista fija del hoyo (fundido): se pide a pinta() por su nombre
  let vistaForzada = null;

  // ---------- Datos ----------
  function datos(round){
    const E = EV(); const t = E.tabla ? E.tabla(round) : [];
    const gr = (round.match_groups || []).filter(g => g && (g.players || []).filter(Boolean).length);
    const pares = E.paresDe ? E.paresDe(round) : [];
    const esPtos = round.scoring_type === 'stableford';
    // Puestos con empates tipo golf: T2, T2, 4, T5…
    const puesto = t.map((x, i) => { const k = esPtos ? x.pts : x.neto; let a = i; while(a > 0 && (esPtos ? t[a - 1].pts : t[a - 1].neto) === k) a--; let b = i; while(b < t.length - 1 && (esPtos ? t[b + 1].pts : t[b + 1].neto) === k) b++; return { pos: a + 1, emp: b > a }; });
    // Dónde está cada grupo (el hoyo que está jugando, según su hoyo de salida)
    const grupos = gr.map((g, gi) => {
      const orden = E.ordenDe ? E.ordenDe(g) : [], n = orden.length || 18;
      const mios = t.filter(x => x.gi === (round.match_groups || []).indexOf(g));
      const hechos = mios.reduce((m, x) => Math.max(m, x.pos || 0), 0);
      const fin = hechos >= n, hoyo = orden[Math.min(hechos, n - 1)] || 1;
      return { g, gi, orden, n, hechos, fin, hoyo, par: pares[hoyo - 1] || 4, salida: orden[0] || 1, jug: (g.players || []).filter(Boolean), time: g.time || '' };
    });
    const nh = x => (x && x.g && x.g.nueve) ? 9 : 18;
    const final = t.length >= 2 && t.every(x => (x.pos || 0) >= nh(x));
    const avance = t.reduce((m, x) => Math.max(m, x.pos || 0), 0), total = t[0] ? nh(t[0]) : 18;
    const fase = final ? 'fin' : (!t.length || avance <= 4 ? 'inicio' : (avance >= total - 3 ? 'final' : 'medio'));
    return { t, gr, grupos, pares, esPtos, final, fase, avance, total };
  }

  // ---------- Silueta del hoyo (con la salida, el green y los obstáculos de la app) ----------
  async function cargarGeo(cid){
    const base = String(cid || '').replace(/-9v?$/, '');
    if(geo[base] || geoPidiendo[base]) return;
    geoPidiendo[base] = true;
    const c = cliente(); if(!c){ geoPidiendo[base] = false; return; }
    try {
      const [g, t, o] = await Promise.all([
        c.from('hole_greens').select('hole, lat, lng').eq('course_id', base),
        c.from('hole_tees').select('hole, lat, lng').eq('course_id', base),
        c.from('hole_obstacles').select('hole, tipo, lat, lng').eq('course_id', base)]);
      const r = {}; (g.data || []).forEach(x => (r[x.hole] = r[x.hole] || {}).green = x); (t.data || []).forEach(x => (r[x.hole] = r[x.hole] || {}).tee = x);
      (o.data || []).forEach(x => ((r[x.hole] = r[x.hole] || {}).obst = r[x.hole].obst || []).push(x));
      geo[base] = r;
    } catch(e){ /* sin conexión: se dibuja sin silueta */ }
    geoPidiendo[base] = false;
  }
  const geoDe = (cid, h) => (geo[String(cid || '').replace(/-9v?$/, '')] || {})[h] || null;
  window.acgolfTeleGeo = g => { geo = g || {}; };   // para pruebas

  function silueta(gh, sem){
    if(!gh || !gh.tee || !gh.green) return null;
    const T = gh.tee, G = gh.green, k = 111320, cl = Math.cos(T.lat * Math.PI / 180);
    const xy = p => [(p.lng - T.lng) * k * cl, -(p.lat - T.lat) * k];
    const g = xy(G), d = Math.hypot(g[0], g[1]); if(!(d > 20)) return null;
    const ang = Math.atan2(g[0], -g[1]);
    const rot = p => { const [x, y] = xy(p); return [x * Math.cos(ang) + y * Math.sin(ang), -x * Math.sin(ang) + y * Math.cos(ang)]; };
    const W = 496, H = 700, esc2 = (H - 230) / d, ox = W / 2, oy = H - 70;
    const P = p => { const [x, y] = rot(p); return [ox + x * esc2, oy + y * esc2]; };
    const t = P(T), gr = P(G);
    let seed = 7 + sem * 13; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const bend = (rnd() - .5) * 110, N = 40, cen = [];
    for(let i = 0; i <= N; i++){ const u = i / N; cen.push([t[0] + (gr[0] - t[0]) * u + Math.sin(u * Math.PI) * bend, t[1] + (gr[1] - t[1]) * u, u]); }
    const wd = u => Math.max(16, 26 + Math.sin(Math.min(u, 1) * Math.PI * .9 + .2) * 30 + (u > .85 ? -(u - .85) * 80 : 0));
    const L = [], R = []; cen.forEach(c => { const w = wd(c[2]); L.push([c[0] - w, c[1]]); R.push([c[0] + w, c[1]]); });
    const poly = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const fw = poly(L) + ' ' + poly(R.slice().reverse()).replace('M', 'L') + 'Z';
    const cerca = u => cen.reduce((a, c) => Math.abs(c[2] - u) < Math.abs(a[2] - u) ? c : a);
    let s = '<defs><filter id="tvn" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .22 0"/></filter>'
      + '<filter id="tvs" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>'
      + '<pattern id="tvm" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><rect width="36" height="18" fill="#52b571"/><rect y="18" width="36" height="18" fill="#46a565"/></pattern>'
      + '<pattern id="tvr" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><rect width="30" height="15" fill="#2a6b43"/><rect y="15" width="30" height="15" fill="#266340"/></pattern>'
      + '<radialGradient id="tvg" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#8fe3a8"/><stop offset="1" stop-color="#5cc27b"/></radialGradient>'
      + '<radialGradient id="tva" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#F7EBC4"/><stop offset="1" stop-color="#D9C28A"/></radialGradient>'
      + '<radialGradient id="tvt" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#2f8a4f"/><stop offset="1" stop-color="#16482b"/></radialGradient>'
      + '<linearGradient id="tvw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fbcff"/><stop offset="1" stop-color="#2d6fd0"/></linearGradient>'
      + '<radialGradient id="tvv" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></radialGradient></defs>';
    s += '<rect width="496" height="700" fill="url(#tvr)"/><rect width="496" height="700" filter="url(#tvn)"/>';
    const trees = [];
    for(let i = 0; i < 70; i++){ const u = rnd(), c = cerca(u), side = rnd() < .5 ? -1 : 1, off = wd(u) + 30 + rnd() * 70, x = c[0] + side * off, y = c[1] + (rnd() - .5) * 30; if(x > 8 && x < 488 && y > 8 && y < 690) trees.push([x, y, 10 + rnd() * 10]); }
    for(let i = 0; i < 14; i++){ const side = i % 2 ? -1 : 1; trees.push([side < 0 ? 14 + rnd() * 20 : 482 - rnd() * 20, 20 + rnd() * 660, 12 + rnd() * 10]); }
    trees.sort((a, b) => a[1] - b[1]).forEach(([x, y, r]) => { s += '<ellipse cx="' + (x + 5) + '" cy="' + (y + 7) + '" rx="' + r + '" ry="' + (r * .7) + '" fill="#000" opacity=".35" filter="url(#tvs)"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#tvt)"/><circle cx="' + (x - r * .3) + '" cy="' + (y - r * .35) + '" r="' + (r * .45) + '" fill="#3fa062" opacity=".55"/>'; });
    // agua real de la app (si la hay): charco con brillo
    (gh.obst || []).filter(o => o.tipo === 'agua').forEach(o => { const q = P(o), cx = q[0], cy = q[1]; s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="46" ry="26" fill="#000" opacity=".25" filter="url(#tvs)"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="44" ry="24" fill="url(#tvw)" stroke="#d8efff" stroke-width="2.5"/><path d="M' + (cx - 24) + ' ' + (cy - 4) + ' q10 -6 20 0 M' + (cx - 6) + ' ' + (cy + 6) + ' q10 -6 20 0" stroke="#fff" stroke-width="1.5" fill="none" opacity=".6"/>'; });
    s += '<path d="' + fw + '" fill="#3a9059" stroke="#3a9059" stroke-width="14" stroke-linejoin="round"/><path d="' + fw + '" fill="url(#tvm)" stroke="#7fd69a" stroke-width="2"/>';
    s += '<ellipse cx="' + (gr[0] + 3) + '" cy="' + (gr[1] + 6) + '" rx="64" ry="50" fill="#000" opacity=".3" filter="url(#tvs)"/><ellipse cx="' + gr[0] + '" cy="' + gr[1] + '" rx="64" ry="50" fill="#4aa86a"/><ellipse cx="' + gr[0] + '" cy="' + gr[1] + '" rx="54" ry="42" fill="url(#tvg)" stroke="#d9f7e2" stroke-width="1.6"/>';
    (gh.obst || []).filter(o => o.tipo === 'bunker').forEach(o => { const q = P(o), cx = q[0], cy = q[1]; const blob = 'M' + (cx - 34) + ' ' + (cy + 2) + ' q-2 -22 24 -22 q20 -6 34 8 q10 18 -10 24 q-22 10 -38 -2 q-8 -4 -10 -8z';
      s += '<path d="' + blob + '" fill="#000" opacity=".3" transform="translate(3,5)" filter="url(#tvs)"/><path d="' + blob + '" fill="#E8D7A2" stroke="#fff6dc" stroke-width="3"/><path d="' + blob + '" fill="url(#tva)" transform="translate(' + cx + ' ' + cy + ') scale(.86) translate(' + (-cx) + ' ' + (-cy) + ')"/>'; });
    s += '<rect x="' + (t[0] - 26) + '" y="' + (t[1] - 12) + '" width="52" height="24" rx="8" fill="#5ec07d" stroke="#d9f7e2" stroke-width="2"/><circle cx="' + (t[0] - 12) + '" cy="' + t[1] + '" r="3.5" fill="#E9CF8C"/><circle cx="' + (t[0] + 12) + '" cy="' + t[1] + '" r="3.5" fill="#E9CF8C"/>';
    s += '<ellipse cx="' + (gr[0] + 4) + '" cy="' + (gr[1] + 2) + '" rx="9" ry="3.5" fill="#000" opacity=".35"/><circle cx="' + gr[0] + '" cy="' + gr[1] + '" r="4.5" fill="#111"/><line x1="' + gr[0] + '" y1="' + gr[1] + '" x2="' + gr[0] + '" y2="' + (gr[1] - 46) + '" stroke="#fff" stroke-width="2.6"/><path d="M' + gr[0] + ' ' + (gr[1] - 46) + ' q14 -3 26 5 q-12 8 -26 5z" fill="#C62B3A" stroke="#fff" stroke-width="1"/>';
    // el grupo: entre la salida y el green, según los hoyos que lleva
    const f = Math.max(.12, Math.min(.82, sem));
    const c = cen[Math.round(f * N)], pj = [c[0] + 4, c[1]];
    s += '<path d="M' + t[0] + ' ' + (t[1] - 6) + ' C' + (t[0] + 60) + ' ' + (t[1] - 120) + ' ' + (pj[0] + 50) + ' ' + (pj[1] + 60) + ' ' + pj[0] + ' ' + pj[1] + '" stroke="#fff" stroke-width="2.4" stroke-dasharray="7 7" fill="none" opacity=".9"/>';
    s += '<rect width="496" height="700" fill="url(#tvv)"/>';
    s += '<circle id="tvA" cx="' + pj[0] + '" cy="' + pj[1] + '" r="1" fill="none"/><circle id="tvS" cx="' + t[0] + '" cy="' + (t[1] + 34) + '" r="1" fill="none"/>';
    return { svg: s, metros: Math.round(d), f };
  }

  // ---------- Vistas ----------
  function vClasif(D){
    const filas = D.t.slice(0, 6).map((x, i) => {
      const p = D.puesto[i], m = D.esPtos ? x.pts : signo(x.neto);
      return '<div class="tv-f' + (i === 0 ? ' uno' : '') + '"><i>' + (p.emp ? 'T' : '') + p.pos + '</i><em>' + esc(largo(x.n)) + '<small>' + (x.pos >= (x.g && x.g.nueve ? 9 : 18) ? 'terminado' : 'hoyo ' + etq(x.ultimo)) + '</small></em><b>' + m + '</b></div>';
    }).join('');
    return '<div class="tv-card tv-clas"><h4><span>' + (D.final ? 'RESULTADO FINAL' : 'CLASIFICACIÓN') + '</span><span>' + (D.fase === 'final' ? 'RECTA FINAL' : (D.esPtos ? 'PUNTOS' : 'NETO')) + '</span></h4>' + (filas || '<p class="tv-vacio">Esperando los primeros golpes…</p>') + '</div>';
  }
  function vHoyo(D){
    const gs = D.grupos; if(!gs.length) return vClasif(D);
    let G = gs[grupoTurno % gs.length]; grupoTurno++;
    if(D.fase === 'final' && D.t[0] && grupoTurno % 2 === 1){ const gl = gs.find(x => x.gi === D.t[0].gi); if(gl) G = gl; }
    const gh = geoDe(ronda.course_id, G.hoyo), sil = silueta(gh, G.hechos / Math.max(1, G.n));
    const nombres = G.jug.map(n => { const x = D.t.find(y => y.n === n); return '<div class="tv-j"><span>' + esc(largo(n)) + '</span><b>' + (x ? (D.esPtos ? x.pts : signo(x.neto)) : '·') + '</b></div>'; }).join('');
    const quien = G.time ? 'Salida ' + esc(G.time) : 'Grupo ' + (G.gi + 1);
    const arte = sil ? '<div class="tv-hw"><svg viewBox="0 0 496 700" preserveAspectRatio="xMidYMax slice">' + sil.svg + '</svg><div class="tv-pins"></div></div>'
      : '<div class="tv-hw tv-sin"><b>' + etq(G.hoyo) + '</b><span>HOYO</span></div>';
    return '<div class="tv-card tv-hoyo" data-sil="' + (sil ? sil.metros : '') + '"><div class="tv-izq">' + arte + '</div><div class="tv-der"><h4><span>HOYO ' + etq(G.hoyo) + '</span><span>PAR ' + G.par + (sil ? ' · ' + sil.metros + ' M' : '') + '</span></h4>'
      + '<div class="tv-q"><small>' + quien + (G.salida !== 1 ? ' · salió por el ' + etq(G.salida) : '') + '</small><i>' + (G.fin ? 'terminado' : 'lleva ' + G.hechos + ' de ' + G.n) + '</i></div>' + nombres + '</div></div>';
  }
  function vGrupos(D){
    const filas = D.grupos.map(G => { const p = Math.round(100 * G.hechos / G.n); return '<div class="tv-gr"><div><b>' + (G.time ? 'Salida ' + esc(G.time) : 'Grupo ' + (G.gi + 1)) + '</b><small>sale por el ' + etq(G.salida) + '</small></div><div class="tv-bar"><u style="width:' + p + '%"></u></div><span>' + (G.fin ? 'FIN' : 'hoyo ' + etq(G.hoyo)) + '</span></div>'; }).join('');
    return '<div class="tv-card tv-grupos"><h4><span>EL CAMPO</span><span>' + D.grupos.length + (D.grupos.length === 1 ? ' GRUPO' : ' GRUPOS') + '</span></h4>' + filas + '</div>';
  }
  function vPodio(D){
    const t = D.t.slice(0, 3), med = ['1', '2', '3'];
    const cols = t.map((x, i) => { const p = D.puesto[i]; return '<div class="tv-pd p' + (i + 1) + '"><i>' + (p.emp ? 'T' : '') + p.pos + '</i><em>' + esc(largo(x.n)) + '</em><b>' + (D.esPtos ? x.pts + ' pts' : signo(x.neto)) + '</b><small>' + (D.esPtos ? '' : (x.bruto + ' golpes')) + '</small></div>'; }).join('');
    return '<div class="tv-card tv-podio"><h4><span>EL PODIO</span><span>RESULTADO FINAL</span></h4><div class="tv-pds">' + cols + '</div></div>';
  }
  const VISTAS = [vClasif, vHoyo, vGrupos];
  const ordenVistas = fase => fase === 'inicio' ? [vGrupos, vHoyo, vClasif] : fase === 'final' ? [vClasif, vHoyo, vClasif, vGrupos] : fase === 'fin' ? [vPodio, vClasif, vGrupos] : VISTAS;

  function pinta(){
    const cap = document.querySelector('#vvOverlay .tv-cap'); if(!cap || !ronda) return;
    let D; try { D = datos(ronda); } catch(e){ return; }
    D.puesto = D.t.map((x, i) => { const k = D.esPtos ? x.pts : x.neto; let a = i; while(a > 0 && (D.esPtos ? D.t[a - 1].pts : D.t[a - 1].neto) === k) a--; let b = i; while(b < D.t.length - 1 && (D.esPtos ? D.t[b + 1].pts : D.t[b + 1].neto) === k) b++; return { pos: a + 1, emp: b > a }; });
    cargarGeo(ronda.course_id);
    faseAct = D.fase; const lista = ordenVistas(D.fase); const fn = vistaForzada || (D.t.length ? lista[vista % lista.length] : vClasif); vistaForzada = null;
    const nueva = document.createElement('div'); nueva.className = 'tv-v'; nueva.innerHTML = fn(D);
    const vieja = cap.querySelector('.tv-v');
    cap.appendChild(nueva);
    requestAnimationFrame(() => { nueva.classList.add('on'); colocarPins(nueva); });
    if(vieja){ vieja.classList.remove('on'); setTimeout(() => vieja.remove(), 700); }
    cap.dataset.vista = vista % lista.length;
  }
  // Los marcadores (grupo y salida) van derechos encima del dibujo inclinado
  function colocarPins(v){
    const w = v.querySelector('.tv-hw'); if(!w || w.classList.contains('tv-sin')) return;
    const svg = w.querySelector('svg'); const pins = w.querySelector('.tv-pins'); if(!svg || !pins) return;
    const r = w.getBoundingClientRect(); if(!r.width) return;
    w.style.setProperty('--per', Math.round(r.width * 1.8) + 'px');
    const at = id => { const el = svg.querySelector('#' + id); if(!el) return null; const b = el.getBoundingClientRect(); return [(b.left - r.left + b.width / 2) / r.width * 100, (b.top - r.top + b.height / 2) / r.height * 100]; };
    const a = at('tvA'), s = at('tvS'), hoyo = v.querySelector('.tv-hoyo'), met = hoyo ? Number(hoyo.dataset.sil) : 0;
    pins.innerHTML = (s ? '<span class="tv-p tv-sal" style="left:' + s[0] + '%;top:' + s[1] + '%">SALIDA</span>' : '') + (a ? '<span class="tv-p tv-g1" style="left:' + a[0] + '%;top:' + a[1] + '%">G</span>' : '');
  }

  // ---------- El realizador: decide qué se ve y cuándo (28-nov-2026, idea de Carlos) ----------
  // Guion de la emisión:
  //  1. Entrada: la mesa de Lola y Curro a pantalla grande; saludo y cómo va la partida.
  //  2. Auto rotación: la mesa se hace pequeña y pasan las vistas (clasificación, hoyo, campo) mientras comentan.
  //  3. Vuelta a la mesa grande con las marcas en la tele y el marcador que se mueve debajo.
  //  4. Fundido al hoyo del campo donde está la partida.
  //  Cuando alguien hace birdie o águila: pantalla negra de gran evento (con foto-resumen y, pequeña, la celebración),
  //  luego mesa grande comentándolo y fundido al hoyo. Después se sigue con la rotación.
  let gen = 0, modo = '', ocupado = false, pend = [], rotT = null, vtEl = () => document.querySelector('#vvOverlay .vt');
  const T_ = () => window.acgolfTele || {};
  const espera = (ms, g) => new Promise(ok => { const t = setTimeout(ok, ms); });
  const vive = g => g === gen && !!ronda && !!vtEl();
  function setModo(m){ modo = m; const vt = vtEl(); if(vt) vt.dataset.modo = m; }
  async function decir(pasos, minMs, g){
    // Habla con las voces grabadas; si el móvil no deja sonar, espera el tiempo mínimo en silencio
    const ini = Date.now(); let r;
    try { r = await T_()._reproducir(pasos); } catch(e){ r = false; }
    const resto = minMs - (Date.now() - ini); if(resto > 0) await espera(resto, g);
    return r;
  }
  function rotar(on){
    clearInterval(rotT); rotT = null;
    if(!on) return;
    pinta(); rotT = setInterval(() => { vista = (vista + 1) % 12; pinta(); }, tiempoFase());
  }
  function marcas(){
    const vt = vtEl(); if(!vt) return;
    let D; try { D = datos(ronda); } catch(e){ return; }
    const ti = D.t.map((x, i) => { const k = D.esPtos ? x.pts : x.neto; let a = i; while(a > 0 && (D.esPtos ? D.t[a - 1].pts : D.t[a - 1].neto) === k) a--; let b = i; while(b < D.t.length - 1 && (D.esPtos ? D.t[b + 1].pts : D.t[b + 1].neto) === k) b++; return (b > a ? 'T' : '') + (a + 1); });
    const filas = D.t.slice(0, 3).map((x, i) => '<div class="' + (i === 0 ? 'uno' : '') + '"><i>' + ti[i] + '</i><em>' + esc(largo(x.n)) + '</em><b>' + (D.esPtos ? x.pts : signo(x.neto)) + '</b></div>').join('');
    let m = vt.querySelector('.tv-marcas'); if(!m){ m = document.createElement('div'); m.className = 'tv-marcas'; vt.appendChild(m); }
    m.innerHTML = '<h5>' + (D.final ? 'FINAL' : (D.esPtos ? 'PUNTOS' : 'NETO')) + '</h5>' + (filas || '<p>Esperando los primeros golpes…</p>');
  }
  async function entrada(g){
    const T = T_(); let P = []; try { P = T.guion(ronda); } catch(e){}
    setModo('intro'); marcas(); rotar(false);
    let DD = null; try { DD = datos(ronda); } catch(e){}
    if(DD && DD.final) return programaFinal(g, P, DD);
    const A = P.slice(0, 3), B = P.slice(3, 6), C = P.slice(6);
    await decir(A, 9000, g); if(!vive(g)) return;
    await reel(g, 2, true); if(!vive(g)) return;
    await bucle(g, B, C);
  }
  async function bucle(g, B, C){
    // Ciclo: rotación (mesa pequeña) → mesa grande con marcas → fundido al hoyo → vuelta a la rotación
    while(vive(g)){
      setModo('rot'); rotar(true);
      await decir(B || [], 22000, g); B = null; if(!vive(g)) return;
      setModo('host'); rotar(false); marcas();
      await decir(C || [], 10000, g); C = null; if(!vive(g)) return;
      setModo('hoyo'); vistaForzada = vHoyo; grupoTurno = Math.floor(Math.random() * 3); pinta();
      document.querySelector('#vvOverlay .tv-cap') && document.querySelector('#vvOverlay .tv-cap').classList.add('grande');
      await espera(9000, g); if(!vive(g)) return;
      const cp = document.querySelector('#vvOverlay .tv-cap'); if(cp) cp.classList.remove('grande');
    }
  }
  // ---------- El resumen final: la misma emisión, con el ganador en pantalla negra, el podio y las cervezas ----------
  async function programaFinal(g, P, D){
    const por = f => P.filter(p => String(p.rot || '').indexOf(f) >= 0);
    const hola = P.slice(0, 2), gana = por('Gana'), seg = por('2.º'), ter = por('3.º'), cerv = por('🍺'), adios = por('hasta la próxima');
    const x = D.t[0];
    setModo('intro'); marcas(); rotar(false);
    const lv = vtEl() && vtEl().querySelector('.vt-live'); if(lv) lv.innerHTML = '<i></i>RESUMEN FINAL';
    await decir(hola, 7000, g); if(!vive(g)) return;
    // 1. El ganador, en pantalla negra
    if(x){ const hg = gana.length ? T_()._reproducir(gana) : null; await liv({ tipo: 'GANADOR', n: x.n, nombre: largo(x.n), detalle: 'RESUMEN FINAL · ' + (D.esPtos ? x.pts + ' PUNTOS' : signo(x.neto) + ' NETO'), golpes: D.esPtos ? x.pts : x.bruto, final: true }, g, 9000); if(hg) await hg; if(!vive(g)) return; }
    // 2. El podio con la mesa pequeña, mientras comentan al 2.º y al 3.º
    setModo('rot'); rotar(false); vistaForzada = vPodio; pinta();
    await decir(seg.concat(ter), 9000, g); if(!vive(g)) return;
    // 2b. Lo mejor del día: birdies y águilas
    await reel(g, 3, true); if(!vive(g)) return;
    // 3. Las cervezas: brindis a pantalla completa
    if(cerv.length){ const pagan = D.t.slice(D.t.length - Math.floor(D.t.length / 2)).map(y => largo(y.n)); await brindis(pagan, cerv, g); if(!vive(g)) return; }
    // 4. Despedida con la mesa grande y la clasificación final en las marcas
    setModo('host'); marcas(); await decir(adios, 6000, g); if(!vive(g)) return;
    // 5. Fin de la emisión: tarjeta de despedida y se queda la clasificación final con un botón para verlo otra vez
    { const vt0 = vtEl(); if(vt0){ const f = document.createElement('div'); f.className = 'tv-fin'; f.innerHTML = '<small>FIN DE LA EMISIÓN</small><b>ac<span>golf</span> TV</b><em>Gracias por verlo · hasta la próxima partida</em>'; vt0.appendChild(f); requestAnimationFrame(() => f.classList.add('on')); await espera(4500, g); f.classList.remove('on'); setTimeout(() => f.remove(), 900); if(!vive(g)) return; } }
    setModo('rot'); vistaForzada = vClasif; pinta();
    const vt = vtEl(); if(vt && !vt.querySelector('.tv-otra')){ const b = document.createElement('button'); b.type = 'button'; b.className = 'tv-otra'; b.textContent = '↺ Ver el resumen otra vez'; b.onclick = () => { b.remove(); window.acgolfTeleDir({ inicio: true }); }; vt.appendChild(b); }
  }
  // Lo mejor del día: los birdies y águilas que ya hay (los mejores primero), cada uno en pantalla negra con su celebración
  function mejoresMomentos(n){
    const E = EV(); if(!E.momentos) return [];
    let m = []; try { m = E.momentos(ronda); } catch(e){}
    const vistos = {};
    return m.filter(x => x.d < 0).sort((a, b) => a.d - b.d || b.pos - a.pos).filter(x => { const k = x.n + ':' + x.h; if(vistos[k]) return false; vistos[k] = 1; return true; }).slice(0, n || 3);
  }
  async function reel(g, n, conVoz){
    const L = mejoresMomentos(n); if(!L.length) return;
    for(let i = 0; i < L.length; i++){
      const x = L[i], ev = { tipo: x.d <= -2 ? 'ÁGUILA' : 'BIRDIE', n: x.n, nombre: largo(x.n), detalle: 'HOYO ' + etq(x.h) + ' · PAR ' + x.par, golpes: x.v, tit: 'LO MEJOR DEL DÍA' };
      const r = 'Birdie de <b>' + esc(largo(x.n)) + '</b> en el hoyo ' + etq(x.h);
      const hab = (conVoz && i === 0) ? T_()._reproducir([{ q: 'lola', clips: ['l-birdie'], rot: r }, { q: 'curro', clips: ['c-birdie'], rot: r }]) : null;
      await liv(ev, g, 7000); if(hab) await hab; if(!vive(g)) return;
    }
  }
  async function brindis(pagan, voz, g){
    const vt = vtEl(); if(!vt) return;
    const e = document.createElement('div'); e.className = 'tv-brin';
    e.innerHTML = '<video muted playsinline autoplay preload="auto" src="tv-brindis.mp4?v=1"></video><div class="tv-bt"><small>HOY PAGAN</small><b>LAS CERVEZAS</b><span>' + pagan.map(esc).join(' · ') + '</span></div>';
    vt.appendChild(e); setModo('liv'); rotar(false); requestAnimationFrame(() => e.classList.add('on'));
    try { e.querySelector('video').play().catch(() => {}); } catch(er){}
    await decir(voz, 8000, g);
    e.classList.remove('on'); setTimeout(() => e.remove(), 700);
  }
  // Pantalla negra de gran evento
  async function liv(ev, g, dur){
    const vt = vtEl(); if(!vt) return;
    let D; try { D = datos(ronda); } catch(e){ D = { t: [] }; }
    const x = D.t.find(y => y.n === ev.n) || D.t[0], pos = x ? D.t.indexOf(x) + 1 : '';
    const col = (ev.tipo === 'ÁGUILA' || ev.tipo === 'GANADOR') ? 'oro' : (ev.tipo === 'NUEVO LÍDER' || ev.tipo === 'RECTA FINAL' ? 'azul' : '');
    const old = vt.querySelector('.tv-liv'); if(old) old.remove();
    const vid = ev.tipo === 'BIRDIE' ? 'tv-birdie.mp4?v=1' : (ev.tipo === 'GANADOR' ? 'tv-brindis.mp4?v=1' : 'tv-aplausos.mp4?v=1');
    const e = document.createElement('div'); e.className = 'tv-liv ' + col;
    e.innerHTML = '<i class="l1"></i><i class="l2"></i><div class="tv-lt"><small>' + (ev.tit ? ev.tit : (ev.final ? 'RESUMEN FINAL' : 'EN DIRECTO') + ' · ' + esc(ronda.round_name || '')) + '</small><b>' + esc(ev.tipo) + '</b><strong>' + esc(ev.nombre) + '</strong><span>' + esc(ev.detalle) + '</span>'
      + '<div class="tv-cifras"><div><small>' + (D.esPtos ? 'PUNTOS' : 'NETO') + '</small><b>' + (x ? (D.esPtos ? x.pts : signo(x.neto)) : '—') + '</b></div><div><small>PUESTO</small><b>' + pos + '</b></div><div><small>' + (ev.final ? (D.esPtos ? 'PUNTOS' : 'GOLPES') : 'EN EL HOYO') + '</small><b>' + (ev.golpes || '—') + '</b></div></div></div>'
      + '<div class="tv-pip"><video muted playsinline autoplay preload="auto" src="' + vid + '"></video></div>';
    vt.appendChild(e); setModo('liv'); rotar(false);
    requestAnimationFrame(() => e.classList.add('on'));
    try { e.querySelector('video').play().catch(() => {}); } catch(er){}
    await espera(dur || 7000, g);
    e.classList.remove('on'); setTimeout(() => e.remove(), 700);
  }
  // Nunca se corta a Lola o a Curro a mitad de frase: si están hablando, el evento espera a que acaben (máx. 25 s)
  async function esperarHabla(){ for(let i = 0; i < 125 && T_()._hablando && T_()._hablando(); i++) await new Promise(ok => setTimeout(ok, 200)); }
  async function evento(ev){
    if(!ronda) return; ocupado = true; await esperarHabla(); if(!ronda){ ocupado = false; return; } const g = ++gen;
    try {
      const avs = pend.splice(0);                       // lo que dicen Lola y Curro sobre esta jugada
      const voz = avs.length ? avs.sort((a, b) => a.prio - b.prio)[0].pasos : null;
      if(ev){
        const hab = voz ? T_()._reproducir(voz) : null;   // hablan mientras se ve la pantalla negra
        await liv(ev, g); if(!vive(g)) return;
        if(hab) await hab; if(!vive(g)) return;
        setModo('host'); marcas(); await espera(5000, g); if(!vive(g)) return;
      } else if(voz){
        setModo('host'); marcas(); rotar(false); await decir(voz, 6000, g); if(!vive(g)) return;
      }
      setModo('hoyo'); vistaForzada = vHoyo; pinta(); const cp = document.querySelector('#vvOverlay .tv-cap'); if(cp) cp.classList.add('grande');
      await espera(8000, g); if(!vive(g)) return;
      if(cp) cp.classList.remove('grande');
      await bucle(g, [], []);
    } finally { ocupado = false; }
  }
  function mirarNovedades(){
    if(!ronda) return;
    const E = EV(); if(!E.momentos || !E.tabla) return;
    const m = E.momentos(ronda), t = E.tabla(ronda);
    const claves = {}; m.forEach(x => { claves[x.gi + ':' + x.p + ':' + x.h] = x; });
    const lider = t[0] ? t[0].n : null;
    if(memoria){
      const nuevas = Object.keys(claves).filter(k => !memoria.claves[k]).map(k => claves[k]);
      const mejor = nuevas.filter(x => x.d < 0).sort((a, b) => a.d - b.d)[0];
      if(mejor){ setTimeout(() => evento({ tipo: mejor.d <= -2 ? 'ÁGUILA' : 'BIRDIE', n: mejor.n, nombre: largo(mejor.n), detalle: 'HOYO ' + etq(mejor.h) + ' · PAR ' + mejor.par, golpes: mejor.v }), 400); }
      else if(lider && memoria.lider && lider !== memoria.lider && t.length > 1){ const x = t[0]; setTimeout(() => evento({ tipo: 'NUEVO LÍDER', n: x.n, nombre: largo(x.n), detalle: x.esPtos ? x.pts + ' PUNTOS' : signo(x.neto) + ' NETO', golpes: '' }), 400); }
    }
    // La recta final: se avisa una sola vez con la pantalla negra
    try { const D = datos(ronda); if(memoria && memoria.fase && memoria.fase !== 'final' && D.fase === 'final' && D.t[0]){ const x = D.t[0]; setTimeout(() => evento({ tipo: 'RECTA FINAL', n: x.n, nombre: largo(x.n), detalle: 'LIDERA · ' + (x.esPtos ? x.pts + ' PUNTOS' : signo(x.neto) + ' NETO') + ' · HOYO ' + etq(x.ultimo), golpes: '' }), 600); } memoria = { claves, lider, fase: D.fase }; return; } catch(e){}
    memoria = { claves, lider };
  }

  // El aviso que ya preparaba la tele de siempre (cambio de líder, birdie, recta final…) lo recoge el realizador
  window.acgolfTeleDir = function(o){
    if(!o) return;
    if(o.aviso){ pend.push(o.aviso); if(!ocupado) setTimeout(() => { if(pend.length && !ocupado) evento(null); }, 900); return; }
    if(o.inicio){ if(!ronda) return; const g = ++gen; entrada(g); }
  };

  // ---------- Montaje ----------
  function engancharse(code, round){
    const vt = document.querySelector('#vvOverlay .vt'); if(!vt) return;
    ronda = round; vista = 0; grupoTurno = 0; memoria = null; pend = []; ocupado = false;
    if(vt.querySelector('.tv-cap')) return;
    vt.classList.add('tv-on'); vt.dataset.modo = 'intro';
    const fondo = vt.querySelector('.vt-fondo');
    const cap = document.createElement('div'); cap.className = 'tv-cap';
    if(fondo) fondo.after(cap); else vt.prepend(cap);
    const intro = document.createElement('div'); intro.className = 'tv-intro';
    intro.innerHTML = '<small>' + esc(round.round_name || 'Partida') + '</small><b>ac<span>golf</span> TV</b><em>' + esc(round.course_name || '') + '</em>';
    vt.appendChild(intro); setTimeout(() => intro.classList.add('fuera'), 2200); setTimeout(() => intro.remove(), 3000);
    mirarNovedades();
  }
  // Partida terminada: la misma emisión con el resumen final (la llama en-vivo.js en lugar del plató de antes)
  function montarFinal(sitio, round, empezarYa){
    const T = window.acgolfTele; if(!T || !T.montar || !sitio) return false;
    try { sitio.innerHTML = '<div class="vt-sitio"></div>'; T.montar(round.code, round); return !!sitio.querySelector('.vt'); } catch(e){ return false; }
  }
  function arrancar(){
    const T = window.acgolfTele; if(!T || T._tv) return; T._tv = true;
    const m0 = T.montar, a0 = T.actualizar, q0 = T.quitar;
    T.montar = function(code, round){ const r = m0.apply(this, arguments); try { engancharse(code, round); } catch(e){} return r; };
    T.actualizar = function(round){ const r = a0.apply(this, arguments); try { ronda = round; mirarNovedades(); } catch(e){} return r; };
    T.quitar = function(){ gen++; clearInterval(rotT); rotT = null; ronda = null; memoria = null; pend = []; ocupado = false; return q0.apply(this, arguments); };
    T.montarFinal = montarFinal; T._tvEvento = evento; T._tvPinta = pinta; T._tvModo = setModo;
  }
  if(window.acgolfTele) arrancar(); else window.addEventListener('load', () => setTimeout(arrancar, 300));
})();
