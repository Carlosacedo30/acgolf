/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Ritmo del campo (norma/idea de Carlos, 17-nov-2026) ---
// Pantalla SOLO para el administrador del club: dónde está cada grupo en el campo y cuáles van lentos.
// · Sin GPS: la posición sale del último hoyo anotado. La hora de cada hoyo la guarda el servidor (grupo.horas, «save_round_group»).
// · Cuenta según el hoyo por el que salió cada grupo (hoyoSalida): nunca da por hecho 1→18.
// · Semáforo: retraso < 8 min = a tiempo (verde) · 8 a 19 = se retrasa (ámbar) · 20 o más = parados (rojo).
// · Ritmo normal por hoyo: par 3 = 12 min, par 4 = 14, par 5 = 16 (se ajustará tras el primer campeonato).
// · Circuito dibujado: solo Hato Verde (greens con GPS + dibujos de cada hoyo). Otros campos: solo la lista.
(function(){
  'use strict';
  if(typeof initSupabase !== 'function') return;
  const MIN_PAR = { 3: 12, 4: 14, 5: 16 }, UMBRAL_AMBAR = 8, UMBRAL_ROJO = 20, HORAS_VIGENTE = 8;
  const COLOR = { v: '#C6F24E', a: '#F5B83D', r: '#E5484D', s: '#9AA3AB' };
  const TRAZADO = { 'hato-verde': {"vb":[1285,1705],"holes":[{"n":1,"x":298.4,"y":677.3,"tx":483.8,"ty":1087.3,"tr":"translate(298.4 677.3) rotate(-24.3) scale(0.9574) translate(-150 -70)"},{"n":2,"x":440.3,"y":437.4,"tx":272.3,"ty":721.5,"tr":"translate(440.3 437.4) rotate(30.6) scale(0.7021) translate(-150 -70)"},{"n":3,"x":351.5,"y":90.0,"tx":433.2,"ty":409.7,"tr":"translate(351.5 90.0) rotate(-14.3) scale(0.7021) translate(-150 -70)"},{"n":4,"x":388.1,"y":465.9,"tx":356.1,"ty":137.4,"tr":"translate(388.1 465.9) rotate(174.4) scale(0.7021) translate(-150 -70)"},{"n":5,"x":202.5,"y":278.4,"tx":308.0,"ty":385.0,"tr":"translate(202.5 278.4) rotate(-44.7) scale(0.3191) translate(-150 -70)"},{"n":6,"x":90.0,"y":513.6,"tx":154.7,"ty":378.3,"tr":"translate(90.0 513.6) rotate(-154.4) scale(0.3191) translate(-150 -70)"},{"n":7,"x":325.6,"y":640.0,"tx":193.4,"ty":569.0,"tr":"translate(325.6 640.0) rotate(118.2) scale(0.3191) translate(-150 -70)"},{"n":8,"x":354.7,"y":1023.1,"tx":320.6,"ty":574.4,"tr":"translate(354.7 1023.1) rotate(175.7) scale(0.9574) translate(-150 -70)"},{"n":9,"x":409.9,"y":1054.9,"tx":280.0,"ty":980.0,"tr":"translate(409.9 1054.9) rotate(120.0) scale(0.3191) translate(-150 -70)"},{"n":10,"x":878.6,"y":1129.7,"tx":434.2,"ty":1058.8,"tr":"translate(878.6 1129.7) rotate(99.1) scale(0.9574) translate(-150 -70)"},{"n":11,"x":1066.6,"y":1047.4,"tx":929.2,"ty":1107.6,"tr":"translate(1066.6 1047.4) rotate(66.3) scale(0.3191) translate(-150 -70)"},{"n":12,"x":1195.3,"y":1614.5,"tx":1095.7,"ty":1175.7,"tr":"translate(1195.3 1614.5) rotate(167.2) scale(0.9574) translate(-150 -70)"},{"n":13,"x":1097.8,"y":1120.4,"tx":1161.7,"ty":1444.2,"tr":"translate(1097.8 1120.4) rotate(-11.2) scale(0.7021) translate(-150 -70)"},{"n":14,"x":870.1,"y":725.7,"tx":1035.0,"ty":1011.6,"tr":"translate(870.1 725.7) rotate(-30.0) scale(0.7021) translate(-150 -70)"},{"n":15,"x":1048.9,"y":968.7,"tx":960.0,"ty":847.8,"tr":"translate(1048.9 968.7) rotate(143.7) scale(0.3191) translate(-150 -70)"},{"n":16,"x":690.8,"y":1060.8,"tx":1010.4,"ty":978.6,"tr":"translate(690.8 1060.8) rotate(-104.4) scale(0.7021) translate(-150 -70)"},{"n":17,"x":705.8,"y":783.6,"tx":688.0,"ty":1113.1,"tr":"translate(705.8 783.6) rotate(3.1) scale(0.7021) translate(-150 -70)"},{"n":18,"x":479.3,"y":1077.1,"tx":680.9,"ty":815.9,"tr":"translate(479.3 1077.1) rotate(-142.3) scale(0.7021) translate(-150 -70)"}]} };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const esAdmin = () => !!(window.miPerfil && (window.miPerfil.es_admin || window.miPerfil.es_super));

  // ---------- Cálculo (sin pantalla; se puede probar solo) ----------
  const nHoyos = g => (g && g.nueve) ? 9 : 18;
  const salidaDe = g => { const s = Math.round(Number(g && g.hoyoSalida)); return s >= 1 && s <= nHoyos(g) ? s : 1; };
  const ordenDe = g => { const n = nHoyos(g), s = salidaDe(g), o = []; for(let k = 0; k < n; k++) o.push((s - 1 + k) % n + 1); return o; };
  const parDe = (ronda, h) => { const p = Array.isArray(ronda.course_par) && ronda.course_par.length >= 9 ? ronda.course_par : null; return Number((p || [])[h - 1]) || 4; };
  const minHoyo = (ronda, h) => MIN_PAR[parDe(ronda, h)] || 14;
  function hoyosAnotados(g){
    const out = {};
    Object.keys(g.scores || {}).forEach(p => Object.keys(g.scores[p] || {}).forEach(h => { if(Number(g.scores[p][h]) > 0) out[h] = true; }));
    return Object.keys(out).map(Number);
  }
  function horaSalida(g, ahora){
    const m = /^(\d{1,2}):(\d{2})/.exec(String(g.hora || '')); if(!m) return null;
    const d = new Date(ahora); d.setHours(+m[1], +m[2], 0, 0); return d.getTime();
  }
  // Estado de un grupo en este momento
  function estadoGrupo(ronda, g, ahora){
    const orden = ordenDe(g), n = orden.length, hechos = hoyosAnotados(g);
    const pos = hechos.reduce((m, h) => Math.max(m, orden.indexOf(h) + 1), 0);   // cuántos hoyos lleva (el del orden más avanzado)
    const horas = g.horas || {};
    const tDe = h => horas[h] ? Number(horas[h]) * 1000 : 0;
    const ultimo = pos ? orden[pos - 1] : 0;
    const tUlt = (ultimo && tDe(ultimo)) || (pos ? new Date(ronda.updated_at).getTime() : 0);
    // Cuándo debería haber acabado cada hoyo, contando desde la salida
    let ini = horaSalida(g, ahora);
    if(ini == null){ const primero = orden.find(h => tDe(h)); if(primero) ini = tDe(primero) - minHoyo(ronda, primero) * 60000 * (orden.indexOf(primero) + 1); }
    const finEsperado = k => { let t = ini; for(let i = 0; i < k; i++) t += minHoyo(ronda, orden[i]) * 60000; return t; };
    const base = { ronda, g, orden, pos, ultimo, juegaEn: pos >= n ? 0 : orden[Math.min(pos, n - 1)], ini };
    if(pos >= n) return Object.assign(base, { fin: true, color: 's', retraso: 0, texto: 'Ha terminado' });
    if(!pos || ini == null){
      return Object.assign(base, { sinDatos: true, color: 's', retraso: 0, texto: 'Sin anotar aún' });
    }
    const r1 = (tUlt - finEsperado(pos)) / 60000, r2 = (ahora - finEsperado(pos + 1)) / 60000;
    const retraso = Math.max(0, Math.round(Math.max(r1, r2)));
    const color = retraso >= UMBRAL_ROJO ? 'r' : retraso >= UMBRAL_AMBAR ? 'a' : 'v';
    return Object.assign(base, { retraso, color, texto: color === 'r' ? 'PARADOS' : color === 'a' ? 'SE RETRASA' : 'A TIEMPO' });
  }
  function repasar(rondas, ahora){
    const lista = [];
    rondas.forEach(r => {
      const gs = (r.match_groups || []).map((g, gi) => ({ g, gi })).filter(x => x.g && (x.g.players || []).filter(Boolean).length);
      gs.forEach(x => { const e = estadoGrupo(r, x.g, ahora); e.num = x.gi + 1; e.varias = rondas.length > 1; lista.push(e); });
    });
    return lista.filter(e => !e.fin);
  }
  window.acgolfRitmo = { _estadoGrupo: estadoGrupo, _repasar: repasar, _ordenDe: ordenDe };
  window.acgolfRitmo._trazado = TRAZADO;

  // ---------- Pantalla ----------
  let ov = null, timer = null, ultimaLista = null;
  const nombres = g => (g.players || []).filter(Boolean);
  const horaTxt = ms => ms ? new Date(ms).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
  function circuito(lista, courseId, opts){
    opts = opts || {};   // opts.base: campo de 18 sobre el que se dibuja · opts.off: hoyos que se suman (vuelta 10-18 = 9) · opts.mio: el grupo del jugador
    const base = opts.base || courseId, off = opts.off || 0;
    const T = TRAZADO[base]; if(!T) return '<div class="rc-nocir">Este campo aún no tiene circuito dibujado. Abajo ves la lista de grupos.</div>';
    const cuenta = {};
    const pts = lista.filter(e => e.ronda.course_id === courseId && e.juegaEn).map(e => {
      const h = T.holes[e.juegaEn - 1 + off]; const k = cuenta[e.juegaEn] = (cuenta[e.juegaEn] || 0) + 1;
      const dir = h.x > T.vb[0] - 220 ? -1 : 1, cx = h.x + dir * (44 + (k - 1) * 64), cy = h.y - 46 + (k - 1) * 18;
      const mio = opts.mio ? e.g === opts.mio : false, r = mio ? 46 : 34, col = opts.mio ? (mio ? COLOR.a : COLOR.s) : COLOR[e.color];
      return '<g class="rc-pt"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + col + '" stroke="' + (mio ? '#fff' : '#111316') + '" stroke-width="' + (mio ? 7 : 4) + '"/><text x="' + cx + '" y="' + (cy + (mio ? 15 : 11)) + '" text-anchor="middle" font-size="' + (mio ? 44 : 31) + '" font-weight="900" fill="#111316">' + e.num + '</text></g>';
    }).join('');
    const dibujos = T.holes.map(h => '<g transform="' + h.tr + '" style="mix-blend-mode:lighten"><image href="hoyos/' + base + '-' + h.n + '.svg" width="300" height="600"/></g>').join('');
    const ruta = T.holes.map(h => 'M' + h.tx + ',' + h.ty + ' L' + h.x + ',' + h.y).join(' ');
    const nums = T.holes.map(h => '<circle cx="' + h.x + '" cy="' + h.y + '" r="22" fill="#111316" stroke="#C6F24E" stroke-width="3"/><text x="' + h.x + '" y="' + (h.y + 9) + '" text-anchor="middle" font-size="25" font-weight="900" fill="#F2F4F5">' + h.n + '</text>').join('');
    return '<div class="rc-mapa"><svg viewBox="0 0 ' + T.vb[0] + ' ' + T.vb[1] + '" role="img" aria-label="Circuito del campo con los grupos"><rect width="100%" height="100%" fill="#0e1f16"/>' + dibujos
      + '<path d="' + ruta + '" stroke="#C6F24E" stroke-width="3" stroke-dasharray="4 7" fill="none" opacity=".8"/>' + nums + pts + '</svg></div>';
  }
  function pintar(lista, rondas, ahoraMs){
    const cuerpo = ov.querySelector('.rc-cuerpo');
    const cnt = { v: 0, a: 0, r: 0 }; lista.forEach(e => { if(cnt[e.color] != null) cnt[e.color]++; });
    const ord = lista.slice().sort((a, b) => (b.retraso - a.retraso) || (a.num - b.num));
    // Atasco: un hoyo donde esperan dos o más grupos que van tarde
    const porHoyo = {}; lista.filter(e => e.juegaEn && (e.color === 'a' || e.color === 'r')).forEach(e => { (porHoyo[e.juegaEn] = porHoyo[e.juegaEn] || []).push(e); });
    const atascos = Object.keys(porHoyo).filter(h => porHoyo[h].length >= 2).map(h => {
      const gs = porHoyo[h], peor = gs.reduce((m, e) => Math.max(m, e.retraso), 0);
      return '<div class="rc-aviso"><b>Atasco en el hoyo ' + h + ' (par ' + parDe(gs[0].ronda, +h) + ')</b><span>Grupos ' + gs.map(e => e.num).sort((a, b) => a - b).join(', ') + ' esperando · hasta +' + peor + ' min</span></div>';
    }).join('');
    const cursos = Array.from(new Set(lista.map(e => e.ronda.course_id)));
    const filas = ord.map(e => {
      const sal = e.ini ? ' · salida ' + horaTxt(e.ini) : '';
      const quien = nombres(e.g).join(', ');
      const donde = e.sinDatos ? 'Todavía no han anotado ningún hoyo' : 'Hoyo ' + e.juegaEn + ' (lleva ' + e.pos + ' de ' + e.orden.length + ')';
      return '<div class="rc-fila rc-' + e.color + '"><i class="rc-dot" style="background:' + COLOR[e.color] + '"></i><div class="rc-tx"><b>Grupo ' + e.num + sal + '</b><span>' + esc(donde) + (e.varias ? ' · ' + esc(e.ronda.round_name || '') : '') + '</span><span class="rc-nom">' + esc(quien) + '</span></div>'
        + '<div class="rc-rt" style="color:' + COLOR[e.color] + '">' + (e.sinDatos ? '' : (e.retraso ? '+' + e.retraso + ' min' : '')) + '<small>' + e.texto + '</small></div></div>';
    }).join('');
    cuerpo.innerHTML = (lista.length
      ? '<div class="rc-res"><div class="rc-n rc-v"><b>' + cnt.v + '</b><span>a tiempo</span></div><div class="rc-n rc-a"><b>' + cnt.a + '</b><span>se retrasan</span></div><div class="rc-n rc-r"><b>' + cnt.r + '</b><span>parados</span></div></div>'
        + cursos.map(c => circuito(lista, c)).join('') + atascos + '<div class="rc-lista">' + filas + '</div>'
      : (demo && demo.fin ? '<div class="rc-vacio"><b>Campeonato terminado</b><span>El último grupo acabó a las ' + horaTxt(demo.fin) + '. Duración del campeonato: ' + Math.floor((demo.fin - demo.sim.t0) / 3600000) + ' h ' + String(Math.round(((demo.fin - demo.sim.t0) % 3600000) / 60000)).padStart(2, '0') + ' min.</span></div>'
        : '<div class="rc-vacio"><b>No hay ninguna partida en juego</b><span>Cuando un grupo empiece a anotar hoyos, aparecerá aquí con su ritmo.</span></div>'));
    ov.querySelector('.rc-sub').textContent = demo ? (lista.length + (lista.length === 1 ? ' grupo en juego' : ' grupos en juego') + ' · hora simulada ' + horaTxt(ahoraMs)) : (lista.length + (lista.length === 1 ? ' grupo en juego' : ' grupos en juego') + ' · hora ' + horaTxt(ahoraMs || Date.now()) + ' · se actualiza solo');
    const cab = ov.querySelector('.rc-camp'); const nombre = rondas[0] && (rondas[0].course_name || ''); cab.textContent = nombre ? nombre + ' · hoy' : 'Hoy';
  }
  // ---------- Demostración simulada (para enseñarla al club): un campeonato inventado de 80 jugadores ----------
  // Usa EXACTAMENTE el mismo cálculo y la misma pantalla que el ritmo real, pero con datos inventados y el reloj acelerado.
  let demo = null;
  const NOMBRES = ['Antonio', 'Manuel', 'José', 'Francisco', 'Juan', 'Javier', 'Rafael', 'Miguel', 'Pedro', 'Luis', 'Fernando', 'Alberto', 'Ángel', 'Ramón', 'Joaquín', 'Enrique', 'Andrés', 'Diego', 'Vicente', 'Ignacio'];
  const APE = ['García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Ruiz', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Gil', 'Vázquez', 'Serrano', 'Ramos', 'Blanco', 'Molina', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Iglesias', 'Medina', 'Cortés', 'Garrido', 'Castillo', 'Santos', 'Lozano', 'Guerrero', 'Cano', 'Prieto', 'Méndez', 'Cruz', 'Gallego', 'Vidal'];
  const alea = semilla => () => { semilla = (semilla * 1664525 + 1013904223) % 4294967296; return semilla / 4294967296; };
  function simular(){
    const r = alea(20261117), PAR = [5,4,4,4,3,3,3,5,3,5,3,5,4,4,3,4,4,4];
    const d0 = new Date(); d0.setHours(8, 0, 0, 0); const t0 = d0.getTime();
    const salidas = []; for(let i = 1; i <= 18; i++) salidas.push(i); salidas.push(1, 8);      // 20 grupos: 18 hoyos y los dos últimos por par 5
    const grupos = salidas.map((s, i) => ({
      s, i, players: [0, 1, 2, 3].map(j => NOMBRES[(i * 3 + j * 7) % NOMBRES.length] + ' ' + APE[(i * 2 + j * 9) % APE.length] + ' ' + APE[(i * 5 + j * 4 + 3) % APE.length]),
      lento: i === 5 ? 3.5 : i === 12 ? 2 : 0,                                                    // el grupo 6 va lento todo el rato, el 13 un poco
      ritmo: 0.93 + r() * 0.14, finish: [], tee: [],
    }));
    // Cola en cada hoyo: nadie sale hasta que el grupo de delante lleva 7 minutos jugando ese hoyo
    const ultimoTee = Array(19).fill(-1e12), listo = grupos.map(g => t0), k = grupos.map(() => 0);
    let pendientes = grupos.length * 18;
    while(pendientes > 0){
      let mejor = -1;
      grupos.forEach((g, i) => { if(k[i] < 18 && (mejor < 0 || listo[i] < listo[mejor] || (listo[i] === listo[mejor] && i < mejor))) mejor = i; });
      const g = grupos[mejor], h = (g.s - 1 + k[mejor]) % 18 + 1;
      const ini = Math.max(listo[mejor], ultimoTee[h] + 7 * 60000);
      let dur = (MIN_PAR[PAR[h - 1]] * g.ritmo + g.lento) * 60000;
      if(mejor === 12 && k[mejor] === 5) dur += 17 * 60000;                                       // el grupo 13 pierde una bola en su 6.º hoyo
      if(mejor === 17 && k[mejor] === 3) dur += 9 * 60000;                                        // y el 18 se para a buscar otra
      ultimoTee[h] = ini; g.tee.push(ini); g.finish.push(ini + dur); listo[mejor] = ini + dur; k[mejor]++; pendientes--;
    }
    const fin = Math.max.apply(null, grupos.map(g => g.finish[17]));
    return { t0, grupos, fin, PAR };
  }
  function rondaEn(sim, T){
    const mg = sim.grupos.map(g => {
      const sc = {}, horas = {}; const hechos = g.finish.filter(f => f <= T).length;
      for(let q = 0; q < hechos; q++){ const h = (g.s - 1 + q) % 18 + 1; [0, 1, 2, 3].forEach(p => { (sc[p] = sc[p] || {})[h] = sim.PAR[h - 1] + (p % 2); }); horas[h] = Math.floor(g.finish[q] / 1000); }
      const d = new Date(g.tee[0]);
      return { players: g.players, handicaps: [10, 14, 18, 22], scores: sc, horas, hoyoSalida: g.s, hora: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') };
    });
    return { code: 'DEMO', round_name: 'Campeonato (demostración)', course_id: 'hato-verde', course_name: 'Club Hato Verde', course_par: sim.PAR, updated_at: new Date(T).toISOString(), match_groups: mg };
  }
  function pasoDemo(){
    if(!demo || !ov || ov.hidden) return;
    if(!demo.pausa) demo.T = Math.min(demo.T + demo.vel * 60000 * 0.25, demo.sim.fin + 60000);
    const ronda = rondaEn(demo.sim, demo.T), lista = repasar([ronda], demo.T);
    if(!lista.length && demo.T >= demo.sim.fin){ demo.fin = demo.sim.fin; demo.pausa = true; } else demo.fin = 0;
    ultimaLista = lista; pintar(lista, [ronda], demo.T);
    const barra = ov.querySelector('.rc-prog i'); if(barra) barra.style.width = Math.min(100, (demo.T - demo.sim.t0) / (demo.sim.fin - demo.sim.t0) * 100) + '%';
    const bp = ov.querySelector('#rcPausa'); if(bp) bp.textContent = demo.pausa ? (demo.fin ? '↻ Verla otra vez' : '▶ Seguir') : '⏸ Pausa';
  }
  function entrarDemo(){
    demo = { sim: simular(), T: 0, vel: 3, pausa: false, fin: 0 }; demo.T = demo.sim.t0 + 6 * 60000;
    clearInterval(timer);
    ov.classList.add('rc-es-demo');
    ov.querySelector('.rc-demobar').innerHTML = '<div class="rc-banda"><span><b>DEMOSTRACIÓN</b> · datos inventados</span><button type="button" class="rc-salir" id="rcSalirDemo">Salir</button></div>'
      + '<div class="rc-prog"><i></i></div><div class="rc-ctl"><button type="button" id="rcPausa">⏸ Pausa</button><button type="button" data-vel="1">Lento</button><button type="button" data-vel="3" class="on">Normal</button><button type="button" data-vel="8">Rápido</button></div>';
    const bar = ov.querySelector('.rc-demobar');
    bar.querySelector('#rcPausa').onclick = () => { if(demo.fin){ demo.T = demo.sim.t0 + 6 * 60000; demo.fin = 0; demo.pausa = false; } else demo.pausa = !demo.pausa; pasoDemo(); };
    bar.querySelectorAll('[data-vel]').forEach(b => b.onclick = () => { demo.vel = +b.dataset.vel; bar.querySelectorAll('[data-vel]').forEach(x => x.classList.toggle('on', x === b)); });
    bar.querySelector('#rcSalirDemo').onclick = salirDemo;
    ov.querySelector('.rc-camp').textContent = 'Club Hato Verde';
    pasoDemo(); timer = setInterval(pasoDemo, 250);
  }
  function salirDemo(){
    demo = null; clearInterval(timer); ov.classList.remove('rc-es-demo'); ov.querySelector('.rc-demobar').innerHTML = '';
    cargar(); timer = setInterval(() => { if(!document.hidden && ov && !ov.hidden) cargar(); }, 15000);
  }
  async function cargar(){
    const client = initSupabase(); if(!client || !ov) return;
    const desde = new Date(Date.now() - HORAS_VIGENTE * 3600 * 1000).toISOString();
    const { data, error } = await client.from('rounds').select('code, round_name, course_id, course_name, course_par, match_groups, updated_at, created_at').gte('updated_at', desde).order('updated_at', { ascending: false }).limit(40);
    if(error){ ov.querySelector('.rc-cuerpo').innerHTML = '<div class="rc-vacio"><b>No se pudo cargar</b><span>Revisa la conexión. Se intentará otra vez solo.</span></div>'; return; }
    const rondas = (data || []).filter(r => !/^(Convocatoria|Liga de amigos|Inscripción Ryder)$/.test(r.round_name || '') && r.course_id !== null);
    const lista = repasar(rondas, Date.now());
    ultimaLista = lista; pintar(lista, rondas, Date.now());
  }
  function abrir(){
    if(!esAdmin()) return;
    if(!ov){
      ov = document.createElement('div'); ov.className = 'rc'; ov.id = 'rcOv'; ov.hidden = true;
      ov.innerHTML = '<div class="rc-top"><button type="button" class="rc-volver" id="rcVolver">‹ Volver</button></div><div class="rc-cab"><span class="rc-etq">Ritmo del campo</span><h1 class="rc-camp"></h1><p class="rc-sub">Cargando…</p><button type="button" class="rc-demo-btn" id="rcVerDemo">▶ Ver demostración con 80 jugadores</button></div><div class="rc-demobar"></div><div class="rc-cuerpo"><div class="rc-vacio"><span>Cargando…</span></div></div>';
      document.body.appendChild(ov);
      ov.querySelector('#rcVolver').onclick = cerrar;
      ov.querySelector('#rcVerDemo').onclick = entrarDemo;
    }
    ov.hidden = false; demo = null; ov.classList.remove('rc-es-demo'); ov.querySelector('.rc-demobar').innerHTML = ''; cargar(); clearInterval(timer); timer = setInterval(() => { if(!document.hidden && ov && !ov.hidden) cargar(); }, 15000);
  }
  function cerrar(){ if(ov){ ov.hidden = true; if(demo){ demo = null; ov.classList.remove('rc-es-demo'); ov.querySelector('.rc-demobar').innerHTML = ''; } } clearInterval(timer); }
  window.acgolfRitmo.abrir = abrir; window.acgolfRitmo.cerrar = cerrar; window.acgolfRitmo._circuito = circuito;

  // ---------- Botón (solo administrador) en el menú del Inicio ----------
  function ponerBoton(){
    if(document.getElementById('hmRitmo')) return true;
    const ref = document.querySelector('#homeAhora .home-menu .home-menu-btn:last-of-type'); if(!ref) return false;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'home-menu-btn'; b.id = 'hmRitmo'; b.hidden = !esAdmin();
    b.innerHTML = '<svg class="ico" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="7.5"/><path d="M12 13V8.5M12 3.5v2M9.5 3.5h5"/></svg><span>Ritmo del campo</span>';
    b.onclick = abrir; ref.parentNode.appendChild(b); return true;
  }
  let nb = 0; const tb = setInterval(() => { const ok = ponerBoton(); const b = document.getElementById('hmRitmo'); if(b) b.hidden = !esAdmin(); if((ok && window.miPerfil) || ++nb > 120) clearInterval(tb); }, 1000);
})();
