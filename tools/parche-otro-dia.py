# Una partida de la jornada puede jugarse otro día y a otra hora (norma de Carlos, 25-nov-2026). SOLO en pruebas:
# se aplica sobre pruebas/js/ligas.js y pruebas/js/convocatoria.js, nunca sobre js/ (que usa la real).
import sys
def parche(path, pares):
    s = open(path).read()
    for a, b in pares:
        if s.count(a) != 1:
            sys.exit('ERROR parche-otro-dia: no encuentro (o está repetido) en %s: %s' % (path, a[:70]))
        s = s.replace(a, b)
    open(path, 'w').write(s)

parche('pruebas/js/ligas.js', [
("""  const hora = j.hora || l.hora;
  if(j.salida !== 'tiro'){ const hi = Number(j.hoyoInicio || l.hoyoInicio) || 1; return { times: ligaHoras(hora, g),""", """  const hora = j.hora || l.hora;
  // Una partida puede jugarse otro día y a otra hora (j.otras[i] = { date, hora }): su hora sale la suya
  const propia = t => t.map((x, i) => (j.otras && j.otras[i] && j.otras[i].hora) || x);
  if(j.salida !== 'tiro'){ const hi = Number(j.hoyoInicio || l.hoyoInicio) || 1; return { times: propia(ligaHoras(hora, g)),"""),
("""  return { times: Array(g).fill(hora), hoyos: propios ?""", """  return { times: propia(Array(g).fill(hora)), hoyos: propios ?"""),
("""  cfg.grupos = ((c && c.groups""", """  cfg.otras = (c && c.fechas && c.fechas.some(Boolean) ? c.fechas.map((f, i) => f ? { date: f, hora: c.times[i] } : null) : (Array.isArray(j.otras) ? j.otras.map(o => o ? Object.assign({}, o) : null) : []));
  cfg.grupos = ((c && c.groups"""),
("""const jj = Object.assign({}, j, { hora: cfg.hora, salida""", """const jj = Object.assign({}, j, { otras: cfg.otras, hora: cfg.hora, salida"""),
("""    const etq = i => cfg.salida === 'tiro' ? 'Hoyo '""", """    const etq = i => cfg.otras[i] && cfg.otras[i].date ? ligaFechaCortaJ(cfg.otras[i].date) + ' · ' + String(cfg.otras[i].hora || '').replace(/^0/, '') + (cfg.salida === 'tiro' ? ' · hoyo ' + (sal.hoyos[i] || 1) : (cfg.hoyoInicio > 1 ? ' · hoyo ' + cfg.hoyoInicio : '')) : cfg.salida === 'tiro' ? 'Hoyo '"""),
("""          + (g.length ? '<div class="lg-pjs">' + g.map(jug).join('') + '</div>' : '<div class="lg-aviso" style="margin:4px 0 0;">Sin jugadores</div>')
          + (elegido && g.includes(elegido) ? opciones(elegido) : '')
          + '</div>').join('') + '</div>'""", """          + (g.length ? '<div class="lg-pjs">' + g.map(jug).join('') + '</div>' : '<div class="lg-aviso" style="margin:4px 0 0;">Sin jugadores</div>')
          + (elegido && g.includes(elegido) ? opciones(elegido) : '')
          + (cfg.otras[i] && cfg.otras[i].date
              ? '<div class="lg-otra"><div class="lg-otra-t">Otro día y otra hora</div><div class="field-row"><div class="field"><label>Fecha</label><input type="date" class="lg-otra-f" data-i="' + i + '" value="' + cfg.otras[i].date + '"></div>'
                + '<div class="field"><label>Hora</label><input type="time" class="lg-otra-h" data-i="' + i + '" value="' + (cfg.otras[i].hora || cfg.hora) + '"></div></div>'
                + '<button type="button" class="conv-link lg-otra-quitar" data-i="' + i + '">Quitar: juega con el resto</button></div>'
              : '<button type="button" class="conv-btn ghost lg-otra-btn" data-otra="' + i + '">Esta partida se juega otro día</button>')
          + '</div>').join('') + '</div>'"""),
("""    const ot = document.getElementById('ljOtros');""", """    body.querySelectorAll('[data-otra]').forEach(b => b.addEventListener('click', ()=>{ leer(); const i = Number(b.dataset.otra); cfg.otras[i] = { date: cfg.date, hora: ((ligaSalidas(l, Object.assign({}, j, { otras: cfg.otras, hora: cfg.hora, salida: cfg.salida === 'tiro' ? 'tiro' : undefined, hoyos: cfg.hoyos, hoyoInicio: cfg.hoyoInicio }), cfg.grupos.length).times[i]) || cfg.hora) }; pintar(); }));
    body.querySelectorAll('.lg-otra-f').forEach(inp => inp.addEventListener('change', ()=>{ leer(); const o = cfg.otras[Number(inp.dataset.i)]; if(o && inp.value){ o.date = inp.value; pintar(); } }));
    body.querySelectorAll('.lg-otra-h').forEach(inp => inp.addEventListener('change', ()=>{ leer(); const o = cfg.otras[Number(inp.dataset.i)]; if(o && inp.value){ o.hora = inp.value; pintar(); } }));
    body.querySelectorAll('.lg-otra-quitar').forEach(b => b.addEventListener('click', ()=>{ leer(); cfg.otras[Number(b.dataset.i)] = null; pintar(); }));
    const ot = document.getElementById('ljOtros');"""),
("""    cfg.grupos = llenos; // las partidas vacías no se guardan""", """    cfg.otras = cfg.grupos.map((g, i) => g.length ? (cfg.otras && cfg.otras[i]) || null : undefined).filter(o => o !== undefined); // cada partida conserva su fecha propia
    cfg.grupos = llenos; // las partidas vacías no se guardan"""),
("""  if(cfg.salida === 'tiro' && new Set(cfg.hoyos).size < cfg.hoyos.length){""", """  if((cfg.otras || []).some(o => o && o.date && o.date < ligaHoy())){ alert('La fecha de una partida no puede ser anterior a hoy.'); return false; }
  if(cfg.salida === 'tiro' && new Set(cfg.hoyos).size < cfg.hoyos.length){"""),
("""  if(cfg.grupos) j.grupos = cfg.grupos.map(g => g.slice());
""", """  if(cfg.grupos) j.grupos = cfg.grupos.map(g => g.slice());
  { const ot = (cfg.otras || []).map(o => (o && o.date && (o.date !== cfg.date || (o.hora && o.hora !== cfg.hora)) ? { date: o.date, hora: o.hora || cfg.hora } : null));
    if(ot.some(Boolean)) j.otras = ot; else delete j.otras; }
"""),
("""    c.date = j.date; c.courseId = j.courseId; c.times = sal.times; c.hoyos = sal.hoyos;""", """    c.date = j.date; c.courseId = j.courseId; c.times = sal.times; c.hoyos = sal.hoyos;
    c.fechas = c.times.map((t, i) => (j.otras && j.otras[i] && j.otras[i].date) || '');"""),
("""Object.assign({ time: t, players: grupos[i], handicaps: [], scores: {} }, sal.hoyos[i] ? { hoyo: sal.hoyos[i] } : {}))
    .concat([{ players: [], handicaps: [], scores: {}, meta: { date: j.date""", """Object.assign({ time: t, players: grupos[i], handicaps: [], scores: {} }, sal.hoyos[i] ? { hoyo: sal.hoyos[i] } : {}, (j.otras && j.otras[i] && j.otras[i].date) ? { fecha: j.otras[i].date } : {}))
    .concat([{ players: [], handicaps: [], scores: {}, meta: { date: j.date"""),
])

parche('pruebas/js/convocatoria.js', [
("""      hoyos: slots.map(g => Number(g.hoyo) || null),""", """      fechas: slots.map(g => g.fecha || ''), // si una partida se juega otro día, su fecha (si no, la del partido)
      hoyos: slots.map(g => Number(g.hoyo) || null),"""),
("""(c.hoyos && c.hoyos[i]) ? { hoyo: c.hoyos[i] } : {}))
      .concat""", """(c.hoyos && c.hoyos[i]) ? { hoyo: c.hoyos[i] } : {}, (c.fechas && c.fechas[i]) ? { fecha: c.fechas[i] } : {}))
      .concat"""),
("""  function convEtq(c, i){ const h = convHoyoSalida(c, i); return h ? (convAlTiro(c) ? 'Hoyo ' + h : convTime(c.times[i]) + ' · hoyo ' + h) : convTime(c.times[i]); }""", """  // Una partida que se juega otro día lleva su día delante: «Vie 27 · 9:00»
  function convDiaOtra(c, i){
    const f = c.fechas && c.fechas[i]; if(!f || f === c.date) return '';
    const d = new Date(f + 'T12:00:00'); return ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()] + ' ' + d.getDate() + ' · ';
  }
  function convEtq(c, i){ const h = convHoyoSalida(c, i), o = convDiaOtra(c, i); return o + (h ? (convAlTiro(c) ? 'Hoyo ' + h : convTime(c.times[i]) + ' · hoyo ' + h) : convTime(c.times[i])); }"""),
])
print('parche-otro-dia aplicado')

# Jugadores añadidos a una liga ya empezada (Carlos, 26-nov-2026). SOLO pruebas.
parche('pruebas/js/ligas.js', [
("""fijas: Array.isArray(meta.fijas) ? meta.fijas : [],""", """nuevos: meta.nuevos || {}, fijas: Array.isArray(meta.fijas) ? meta.fijas : [],"""),
("""fijas: l.fijas || [], minimo: l.minimo || 0,""", """nuevos: l.nuevos || {}, fijas: l.fijas || [], minimo: l.minimo || 0,"""),
("""entra: rs.length >= (l.minimo || 0) && rs.length > 0 };""", """entra: !!(l.nuevos && l.nuevos[n]) || (rs.length >= (l.minimo || 0) && rs.length > 0), nuevo: !!(l.nuevos && l.nuevos[n] && !rs.length) };"""),
("""lg-nom">' + ligaEsc(ligaCortoN(c.jugador)) + '</td>'""", """lg-nom">' + ligaEsc(ligaCortoN(c.jugador)) + (c.nuevo ? '<span class="lg-nuevo"> · nuevo</span>' : '') + '</td>'"""),
])

# Marcador en directo: nombre COMPLETO del jugador (norma de Carlos, 13-nov y 28-nov-2026). SOLO pruebas.
parche('pruebas/js/vista-hoyo.js', [
("    // Match Play entre dos:", "    const largo = s => (s.pIndexes && s.pIndexes.length > 1) || String(s.name).includes(' / ') || /^Pareja [AB]/.test(s.name) ? corto(s) : String(s.name || '').trim();\n    // Match Play entre dos:"),
("<span class=\"mv-l\">' + esc(corto(a)) + '</span>", "<span class=\"mv-l\">' + esc(largo(a)) + '</span>"),
("<span class=\"mv-l\">' + esc(corto(b)) + '</span>", "<span class=\"mv-l\">' + esc(largo(b)) + '</span>"),
("(i + 1) + 'º ' : '') + esc(corto(s)) + '</span>'", "(i + 1) + 'º ' : '') + esc(largo(s)) + '</span>'"),
])
