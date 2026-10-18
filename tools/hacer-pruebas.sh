#!/usr/bin/env bash
# © 2026 Carlos Acedo Domínguez. Todos los derechos reservados.
# Genera la versión de pruebas (carpeta pruebas/) a partir de la app de la liga + lo de pruebas-src/.
# La app de la liga no se modifica: solo se lee.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf pruebas
mkdir pruebas
for f in *; do
  case "$f" in pruebas|pruebas-src|tools|acgolf-es|supabase|README.md|LICENSE|app-golf-movil.html) continue ;; esac
  cp -R "$f" pruebas/
done
cp pruebas-src/* pruebas/

# Base de datos de pruebas (separada de la de la liga)
sed -i \
  -e "s#https://qjtsjcfalettgvrlwwnr.supabase.co#https://svnkgmbfanwftncopqjg.supabase.co#" \
  -e "s#sb_publishable_HnUJlKmYnPGw8z-CAv87nA_EyN0l-cJ#sb_publishable_7ZPtF55SSEJhiP91H14Dpw_pGqEQ3-X#" \
  pruebas/js/rondas-compartidas.js
grep -q svnkgmbfanwftncopqjg pruebas/js/rondas-compartidas.js || { echo "ERROR: no se cambió la base de datos"; exit 1; }

# Partidas de hasta 8 grupos de 4 (32 jugadores) en la versión de pruebas
sed -i "s#const MAX_GROUPS = 4;#const MAX_GROUPS = 8;#" pruebas/js/players.js
grep -q "const MAX_GROUPS = 8;" pruebas/js/players.js || { echo "ERROR: no se cambió el número de grupos"; exit 1; }

# Enlaces de convocatoria apuntando a la versión de pruebas
sed -i "s#https://carlosacedo30.github.io/acgolf/'#https://carlosacedo30.github.io/acgolf/pruebas/'#" pruebas/js/convocatoria.js

# «Organizar partido con amigos» abierto a todos los jugadores con cuenta:
# el que lo organiza puede crear la partida con los apuntados; borrar sigue siendo solo del administrador
python3 - <<'PY'
p = 'pruebas/js/convocatoria.js'
s = open(p, encoding='utf-8').read()
cambios = [
  ("roundCode: meta.roundCode || null,", "roundCode: meta.roundCode || null, organiza: meta.organiza || null,"),
  ("meta: { date: c.date, courseId: c.courseId, roundCode: c.roundCode } }", "meta: { date: c.date, courseId: c.courseId, roundCode: c.roundCode, organiza: c.organiza || null } }"),
  ("groups: times.map(() => []), roundCode: null };", "groups: times.map(() => []), roundCode: null, organiza: window.miPerfilId || null };"),
  ("""    if(isAdmin){
      if(!conv.roundCode) h += '<button type="button" class="conv-btn primary" id="convCreateRound">Crear la partida con los apuntados</button>';
      h += '<button type="button" class="conv-link" id="convNewBtn">Organizar otro partido</button>';
      h += '<button""", """    const organizo = !!(conv.organiza && conv.organiza === window.miPerfilId);
    if((isAdmin || organizo) && !conv.roundCode) h += '<button type="button" class="conv-btn primary" id="convCreateRound">Crear la partida con los apuntados</button>';
    if(isAdmin || window.miPerfilId) h += '<button type="button" class="conv-link" id="convNewBtn">Organizar otro partido</button>';
    if(isAdmin){
      h += '<button"""),
]
for a, b in cambios:
    assert s.count(a) == 1, a
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
PY

# «Ligas» solo lo ven los administradores de grupo (en pruebas y en acgolf.es)
sed -i 's#const enPruebas = /\\/pruebas\\//.test(location.pathname);#const enPruebas = false;#' pruebas/js/ligas.js
grep -q "const enPruebas = false;" pruebas/js/ligas.js || { echo "ERROR: no se cambió quién ve Ligas"; exit 1; }

# El patrocinador de Los Iscariotes se puede quitar en los demás grupos (portada.js lo pone a null)
sed -i "s#^  const PATROCINADOR = {#  let PATROCINADOR = {#" pruebas/js/patrocinador.js
grep -q "let PATROCINADOR = {" pruebas/js/patrocinador.js || { echo "ERROR: no se cambió el patrocinador"; exit 1; }

# Organizar partido: una sola hora de salida fija y un botón para añadir más partidas (cada una 10 minutos después)
python3 - <<'PY'
p = 'pruebas/js/convocatoria.js'
s = open(p, encoding='utf-8').read()
a = """      + '<div class="field-row"><div class="field"><label>1ª partida</label><input type="time" id="convNewT1" value="' + CONV_DEFAULT_TIMES[0] + '"></div>'
      + '<div class="field"><label>2ª partida</label><input type="time" id="convNewT2" value="' + CONV_DEFAULT_TIMES[1] + '"></div></div>'"""
b = """      + '<div id="convHoras"><div class="field conv-hora-fila"><label>Hora de salida</label><input type="time" class="conv-hora" value="' + CONV_DEFAULT_TIMES[0] + '"></div></div>'
      + '<div class="field conv-mas"><label for="convMasN">Añadir más partidas</label><select id="convMasN"><option value="0">Ninguna más</option><option value="1">1 partida más</option><option value="2">2 partidas más</option><option value="3">3 partidas más</option><option value="4">4 partidas más</option><option value="5">5 partidas más</option><option value="6">6 partidas más</option><option value="7">7 partidas más</option></select><small>Cada una sale 10 minutos después de la anterior. Puedes cambiar las horas.</small></div>'"""
assert s.count(a) == 1, 'horas del partido'
s = s.replace(a, b)
a = """    document.getElementById('convNewCreate').addEventListener('click', convCreate);"""
b = """    const masHora = (t, n) => { const [h, m] = String(t || '08:40').split(':').map(Number); const x = h * 60 + m + n; return String(Math.floor(x / 60) % 24).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); };
    document.getElementById('convMasN').addEventListener('change', e => {
      const caja = document.getElementById('convHoras');
      const filas = [...caja.querySelectorAll('.conv-hora-fila')];
      const quiero = 1 + Number(e.target.value || 0);
      filas.slice(quiero).forEach(f => f.remove());
      for(let i = filas.length; i < quiero; i++){
        const prev = caja.querySelectorAll('.conv-hora'); const t = masHora(prev[prev.length - 1].value, 10);
        caja.insertAdjacentHTML('beforeend', '<div class="field conv-hora-fila"><label>' + (i + 1) + 'ª partida</label><input type="time" class="conv-hora" value="' + t + '"></div>');
      }
      const l = caja.querySelector('.conv-hora-fila label'); if(l) l.textContent = quiero > 1 ? '1ª partida' : 'Hora de salida';
    });
    document.getElementById('convNewCreate').addEventListener('click', convCreate);"""
assert s.count(a) == 1, 'boton crear partido'
s = s.replace(a, b)
a = """    const times = [document.getElementById('convNewT1').value, document.getElementById('convNewT2').value].filter(Boolean);"""
b = """    const times = [...document.querySelectorAll('#convHoras .conv-hora')].map(i => i.value).filter(Boolean);"""
assert s.count(a) == 1, 'leer horas'
s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
PY

# Campo nuevo solo en acgolf.es: Real Club de Golf La Peñaza (Zaragoza). Tarjeta de 1golf.eu; rating y slope
# sacados de la tabla oficial de hándicap de juego del club (blancas y amarillas de caballeros, azules y rojas de damas).
python3 - <<'PY'
def cambia(p, a, b):
    s = open(p, encoding='utf-8').read()
    assert s.count(a) == 1, (p, a[:60])
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
cambia('pruebas/js/data.js', """    { id:'la-cartuja',""", """    { id:'la-penaza', name:'Real Club de Golf La Peñaza', location:'Zaragoza',
      par:[4,4,3,4,5,3,5,4,4, 4,5,3,4,4,3,5,4,4],
      hcp:[12,8,14,2,18,10,6,16,4, 11,9,15,1,7,5,13,3,17],
      // Rating / slope de la tabla de hándicap de juego del club: blancas y amarillas de caballeros; azules y rojas, de damas
      tees:{
        blancas:  { rating:72.3, slope:132 },
        amarillas:{ rating:71.1, slope:129 },
        azules:   { rating:73.4, slope:124 },
        rojas:    { rating:72.3, slope:121 },
      } },
    { id:'la-cartuja',""")
cambia('pruebas/js/partida-rapida.js', """        + '<button type="button" class="pr-campo" data-campo="zaudin">Zaudín</button>';""",
       """        + '<button type="button" class="pr-campo" data-campo="zaudin">Zaudín</button>'
        + '<button type="button" class="pr-campo" data-campo="sevilla-golf">Real Club de Golf Sevilla</button>'
        + '<button type="button" class="pr-campo" data-campo="rc-pineda">Real Club Pineda</button>'
        + '<button type="button" class="pr-campo" data-campo="la-cartuja">La Cartuja</button>';""")
# (La Peñaza y los demás campos de acgolf se eligen con «Buscar otro campo», que también busca en los campos de la app)
cambia('pruebas/js/convocatoria.js', """<option value="zaudin">Club Zaudín Golf</option>""", """<option value="zaudin">Club Zaudín Golf</option><option value="la-penaza">R.C. de Golf La Peñaza</option>""")
cambia('pruebas/js/tiempo.js', """'zaudin': [37.378, -6.045] };""", """'zaudin': [37.378, -6.045], 'la-penaza': [41.701, -1.056] };""")

# Campos de 9 hoyos (La Cartuja, Las Minas, Corta Atalaya): la app juega los 9 dos veces (18 hoyos).
# Antes se repetía la misma dificultad en las dos vueltas y los golpes de regalo no sumaban el hándicap.
# Ahora la dificultad pasa a 18 valores: 1.ª vuelta impares (1, 3… 17) y 2.ª vuelta pares (2, 4… 18),
# en el mismo orden de dificultad del campo (como en las tarjetas de 9 hoyos de la RFEG).
cambia('pruebas/js/data.js', """  let selectedCourse = null;""", """  // Campos de 9 hoyos: dificultad de 18 valores (1.ª vuelta impares, 2.ª vuelta pares) para que
  // los golpes de regalo de las dos vueltas sumen justo el hándicap
  function hcpNueveA18(hcp){
    if(!Array.isArray(hcp) || hcp.length !== 9) return hcp;
    const orden = hcp.map((v, i) => [Number(v), i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const rango = Array(9); orden.forEach((x, r) => { rango[x[1]] = r + 1; });
    return rango.map(r => 2 * r - 1).concat(rango.map(r => 2 * r));
  }
  // Partida de 9 hoyos en cualquier campo («9 hoyos» en Crear partida): una sola vuelta con los 9 primeros hoyos.
  // Dificultad 1 a 9 en el orden del campo. Medio hándicap (regla de la Federación para 9 hoyos): en los campos
  // de 18 el rating de 9 hoyos es la mitad del de 18; en los de 9 hoyos ya es el de 9.
  function cursoNueve(c){
    if(!c || c.nueve) return c;
    const id = c.id + '-9';
    const ya = COURSES.find(x => x.id === id); if(ya) return ya;
    const hcp9 = (Array.isArray(c.hcp) ? c.hcp : []).slice(0, 9).map(Number);
    const orden = hcp9.map((v, i) => [isNaN(v) ? 99 : v, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const r = Array(9); orden.forEach((x, k) => { r[x[1]] = k + 1; });
    const de18 = !(c.holes9 && c.par.length === 9);
    let tees;
    if(c.tees){ tees = {}; Object.keys(c.tees).forEach(k => { const t = c.tees[k]; tees[k] = { rating: de18 ? Math.round(t.rating * 5) / 10 : t.rating, slope: t.slope }; }); }
    const v = { id, name: c.name + ' (9 hoyos)', location: c.location, holes9: true, nueve: true, par: c.par.slice(0, 9), hcp: r };
    if(tees) v.tees = tees;
    if(c.externo) v.externo = true;
    COURSES.push(v);
    return v;
  }
  COURSES.slice().forEach(c => cursoNueve(c));
  COURSES.forEach(c => { if(c.holes9 && !c.nueve) c.hcp = hcpNueveA18(c.hcp); });
  // Hoyos de la partida en juego: 9 en La Cartuja a 9 hoyos, 18 en todo lo demás
  function hoyosPartida(){ return (typeof selectedCourse !== 'undefined' && selectedCourse && selectedCourse.nueve) ? 9 : 18; }

  let selectedCourse = null;""")
cambia('pruebas/js/scorecard.js', """hcps.push((course.hcp && course.hcp[def.offset + i] !== undefined) ? course.hcp[def.offset + i] : (i + 1));""",
       """const ih = (course.holes9 && course.hcp && course.hcp.length === 18 ? def.startHole - 1 : def.offset) + i; // 9 hoyos: la 2.ª vuelta usa su propia dificultad
        hcps.push((course.hcp && course.hcp[ih] !== undefined) ? course.hcp[ih] : (i + 1));""")
# Una partida de un campo de 9 hoyos que otro móvil no conoce: se reconoce por traer 9 pares
cambia('pruebas/js/rondas-compartidas.js', """        holes9: false,""", """        holes9: !!(data.course_par && data.course_par.length === 9),
        nueve: /-9$/.test(String(data.course_id || '')), // partida de 9 hoyos (una vuelta)""")
# La Cartuja: rating y slope oficiales de 9 hoyos (par 29), sacados de la tabla de hándicap de juego
# del club (Escuela Golf La Cartuja): amarillas de caballeros y rojas de damas. Reproducen la tabla exacta.
cambia('pruebas/js/data.js', """      hcp:[3,5,13,12,10,15,2,11,9] },""", """      hcp:[3,5,13,12,10,15,2,11,9],
      // Rating / slope de 9 hoyos de la tabla del club (amarillas de caballeros, rojas de damas)
      tees:{
        amarillas:{ rating:25.4, slope:138 },
        rojas:    { rating:26.3, slope:146 },
      } },""")
# Real Club de Golf de Sevilla: rating y slope de la tabla de equivalencias del club (Sistema Mundial de Hándicap).
# Colores por metros (tarjeta de la RFEG): blancas = barra 62, amarillas = barra 56 (caballeros);
# azules = barra 56 de damas y rojas = barra 53 de damas (confirmado por Carlos).
cambia('pruebas/js/data.js', """      hcp:[14,2,12,6,18,4,8,16,10, 11,9,15,17,5,1,13,7,3] },""", """      hcp:[14,2,12,6,18,4,8,16,10, 11,9,15,17,5,1,13,7,3],
      // Rating / slope de la tabla del club: blancas (62) y amarillas (56) de caballeros; azules (56) y rojas (53) de damas
      tees:{
        blancas:  { rating:73.2, slope:135 },
        amarillas:{ rating:70.5, slope:126 },
        azules:   { rating:76.1, slope:136 },
        rojas:    { rating:74.2, slope:129 },
      } },""")

# Real Club Pineda: rating y slope por barra (1golf.eu y offcourse.co coinciden):
# blancas y amarillas de caballeros, azules y rojas de damas
cambia('pruebas/js/data.js', """      hcp:[8,4,14,10,12,18,2,6,16, 1,7,13,17,15,3,11,9,5] },""", """      hcp:[8,4,14,10,12,18,2,6,16, 1,7,13,17,15,3,11,9,5],
      // Rating / slope: blancas y amarillas de caballeros; azules y rojas, de damas
      tees:{
        blancas:  { rating:72.3, slope:131 },
        amarillas:{ rating:71.7, slope:130 },
        azules:   { rating:73.0, slope:126 },
        rojas:    { rating:71.8, slope:123 },
      } },""")

# Campos de 9 hoyos (se juegan dos vueltas): rating y par de las dos vueltas (regla de la Federación
# para juntar dos recorridos de 9 hoyos: rating × 2, mismo slope, par × 2)
cambia('pruebas/js/players.js', """    const par = c.par.reduce((a, b) => a + (Number(b) || 0), 0);
    return Math.round(v * d.slope / 113 + (d.rating - par));""", """    const vueltas = c.holes9 && c.par.length === 9 && !c.nueve ? 2 : 1; // 9 hoyos: se juegan dos vueltas
    const mitad = c.nueve ? 0.5 : 1; // partida de 9 hoyos: medio hándicap (regla de la Federación para 9 hoyos)
    const par = c.par.reduce((a, b) => a + (Number(b) || 0), 0) * vueltas;
    return Math.round(v * mitad * d.slope / 113 + (d.rating * vueltas - par));""")

# --- Partida de 9 hoyos (una vuelta) en cualquier campo ---
cambia('pruebas/js/players.js', """    return Math.floor(h / 18) + ((h % 18) >= strokeIndex ? 1 : 0);""",
       """    const base = (typeof hoyosPartida === 'function') ? hoyosPartida() : 18; // 9 hoyos: los golpes se reparten en 9
    return Math.floor(h / base) + ((h % base) >= strokeIndex ? 1 : 0);""")
# Crear partida: La Cartuja viene a 9 hoyos; con «9 hoyos» se juega la versión de una vuelta
cambia('pruebas/js/partida-rapida.js', """  function prRecibe(n){""", """  function prCurso(){ const c = COURSES.find(x => x.id === prCampo); return c && Number(prHoyos) === 9 && typeof cursoNueve === 'function' ? cursoNueve(c) : c; }
  function prRecibe(n){""")
p_ = 'pruebas/js/partida-rapida.js'; t_ = open(p_, encoding='utf-8').read()
assert t_.count("COURSES.find(c => c.id === prCampo)") == 4
open(p_, 'w', encoding='utf-8').write(t_.replace("COURSES.find(c => c.id === prCampo)", "prCurso()"))
cambia('pruebas/js/partida-rapida.js', """prCampo = b.dataset.campo; prPaso = 2; prPintar();""", """prCampo = b.dataset.campo; prPaso = 2; prHoyos = prCampo === 'la-cartuja' ? 9 : 18; prPintar();""")
cambia('pruebas/js/partida-rapida.js', """      delete g.modo; delete g.parejas;""", """      delete g.modo; delete g.parejas;
      if(campo.nueve) g.nueve = true; else delete g.nueve; // partida de 9 hoyos""")
# Partidas guardadas: se recuerda que son de 9 hoyos y terminan en el 9
cambia('pruebas/js/rondas-compartidas.js', """      if(g && Array.isArray(g.barras)) out.barras = g.barras;     // barra de salida de cada jugador""",
       """      if(g && Array.isArray(g.barras)) out.barras = g.barras;     // barra de salida de cada jugador
      if(g && g.nueve) out.nueve = true;                          // partida de 9 hoyos""")
cambia('pruebas/js/rondas-compartidas.js', """      return filled >= 18;""", """      return filled >= (group.nueve ? 9 : 18);""")
# Tarjeta: par total de una vuelta
cambia('pruebas/js/scorecard.js', """    currentCoursePar = course.holes9 ? nineSum * 2 : nineSum;""", """    currentCoursePar = course.holes9 && !course.nueve ? nineSum * 2 : nineSum;""")
# Pantalla de anotar: pasar de hoyo, fila de hoyos y clasificación hasta el 9
for a, b in [
  ("""    return h >= 1 && h <= 18 ? h : 1;""", """    return h >= 1 && h <= hoyosPartida() ? h : 1;"""),
  ("""  const hoyoSiguiente = h => h % 18 + 1;""", """  const hoyoSiguiente = h => h % hoyosPartida() + 1;"""),
  ("""  const hoyoAnterior = h => (h + 16) % 18 + 1;""", """  const hoyoAnterior = h => (h + hoyosPartida() - 2) % hoyosPartida() + 1;"""),
  ("""    if(currentHole < 1) currentHole = hoyoSalidaActual() === 1 ? 1 : 18;""", """    if(currentHole < 1) currentHole = hoyoSalidaActual() === 1 ? 1 : hoyosPartida();"""),
  ("""    if(currentHole > 18) currentHole = hoyoSalidaActual() === 1 ? 18 : 1;""", """    if(currentHole > hoyosPartida()) currentHole = hoyoSalidaActual() === 1 ? hoyosPartida() : 1;"""),
  ("""    if(currentHole > 18) currentHole = 18;""", """    if(currentHole > hoyosPartida()) currentHole = hoyosPartida();"""),
  ("""            const done = s.holesFilled >= 18;""", """            const done = s.holesFilled >= hoyosPartida();"""),
  ("""(s.holesFilled >= 18 ? '18 hoyos' : 'Hoyo ' + s.holesFilled + ' de 18')""", """(s.holesFilled >= hoyosPartida() ? hoyosPartida() + ' hoyos' : 'Hoyo ' + s.holesFilled + ' de ' + hoyosPartida())"""),
  ("""    for(let h = 1; h <= 18; h++){
      const inputs = [...document.querySelectorAll('.golpes-input[data-hole="' + h + '"]')];""", """    for(let h = 1; h <= hoyosPartida(); h++){
      const inputs = [...document.querySelectorAll('.golpes-input[data-hole="' + h + '"]')];"""),
  ("""      if(h === 9) html += '<span class="hole-strip-sep" aria-hidden="true"></span>';""", """      if(h === 9 && hoyosPartida() > 9) html += '<span class="hole-strip-sep" aria-hidden="true"></span>';"""),
]:
    cambia('pruebas/js/vista-hoyo.js', a, b)
# Resultados y «Finalizar ronda»
cambia('pruebas/js/resultados.js', """s.holesFilled + '/18 hoyos · Recibe '""", """s.holesFilled + '/' + hoyosPartida() + ' hoyos · Recibe '""")
cambia('pruebas/js/resultados.js', """summaries.every(s => s.holesFilled >= 18);""", """summaries.every(s => s.holesFilled >= hoyosPartida());""")
cambia('pruebas/js/resultados.js', """(summaries[i].holesFilled < 18 ? ' · ' + summaries[i].holesFilled + '/18 hoyos' : '')""", """(summaries[i].holesFilled < hoyosPartida() ? ' · ' + summaries[i].holesFilled + '/' + hoyosPartida() + ' hoyos' : '')""")
cambia('pruebas/js/interactions.js', """    const missing = getPlayerHolesFilled().filter(s => s.filled < 18);""", """    const missing = getPlayerHolesFilled().filter(s => s.filled < hoyosPartida());""")
cambia('pruebas/js/interactions.js', """s.filled + '/18 hoyos'""", """s.filled + '/' + hoyosPartida() + ' hoyos'""")

# Que los móviles descarguen de nuevo los archivos cambiados (no la copia guardada)
import re
p = 'pruebas/index.html'; s = open(p, encoding='utf-8').read()
for f in ('data', 'scorecard', 'rondas-compartidas', 'players', 'partida-rapida', 'vista-hoyo', 'resultados', 'interactions'):
    s, n = re.subn(r'(js/' + f + r'\.js\?v=\d+)"', r'\g<1>09"', s); assert n == 1, f
open(p, 'w', encoding='utf-8').write(s)
PY

# index.html: almacén separado, cuentas y banda de "VERSIÓN DE PRUEBAS"
python3 - <<'EOF'
import re
p = 'pruebas/index.html'
s = open(p, encoding='utf-8').read()
s = s.replace('<title>App de Golf</title>', '<title>App de Golf · PRUEBAS</title>\n<meta name="robots" content="noindex">\n<script src="almacen.js?v=1"></script>\n<script>window.acgolfBarras = true; /* elegir barra de salida de cada jugador */</script>', 1)
s = s.replace('</head>', '<link rel="stylesheet" href="cuenta.css?v=15">\n<link rel="stylesheet" href="avatares.css?v=1">\n<link rel="stylesheet" href="ryder.css?v=1">\n<link rel="stylesheet" href="contador.css?v=2">\n<link rel="stylesheet" href="faltan-tarjeta.css?v=1">\n<link rel="stylesheet" href="navegacion.css?v=1">\n<link rel="stylesheet" href="inicio-partido.css?v=1">\n<link rel="stylesheet" href="manual.css?v=1">\n<link rel="stylesheet" href="scramble.css?v=1">\n<link rel="stylesheet" href="salon.css?v=2">\n<link rel="stylesheet" href="ver-completa.css?v=1">\n<link rel="stylesheet" href="planes.css?v=2">\n<link rel="stylesheet" href="ayuda.css?v=2">\n<link rel="stylesheet" href="patro-destacado.css?v=1">\n<link rel="stylesheet" href="intro-video.css?v=1">\n<link rel="stylesheet" href="buscador-campos.css?v=2">\n<link rel="stylesheet" href="promo-bolas.css?v=1">\n<link rel="stylesheet" href="ir-hato.css?v=1">\n</head>', 1)
s = re.sub(r'(<script src="js/rondas-compartidas\.js\?v=\d+"></script>)', r'\1\n<script src="portada.js?v=6"></script>\n<script src="cuenta.js?v=24"></script>', s, count=1)
# La pantalla blanca y el resumen tienen que ir DESPUÉS del marcador: se quitan de su sitio y se ponen tras él
# El aviso «ahora es acgolf.es» solo va en la app antigua de la liga
s = re.sub(r'<script src="js/aviso-acgolf\.js\?v=\d+"></script>\n', '', s)
s = re.sub(r'<script src="js/(tarjeta-blanca|resumen-jugador)\.js\?v=\d+"></script>\n', '', s)
s = s.replace('</body>', '<script src="cuenta-ajustes.js?v=1"></script>\n<script src="grupos.js?v=1"></script>\n<script src="marcador.js?v=3"></script>\n<script src="js/tarjeta-blanca.js?v=2"></script>\n<script src="js/resumen-jugador.js?v=2"></script>\n<script src="enlace-partida.js?v=2"></script>\n<script src="aviso-partida.js?v=3"></script>\n<script src="avatares.js?v=1"></script>\n<script src="reserva-club.js?v=1"></script>\n<script src="ryder.js?v=1"></script>\n<script src="contador.js?v=2"></script>\n<script src="faltan-tarjeta.js?v=1"></script>\n<script src="patro-cuenta.js?v=1"></script>\n<script src="navegacion.js?v=2"></script>\n<script src="ganadores.js?v=1"></script>\n<script src="inicio-partido.js?v=2"></script>\n<script src="manual.js?v=5"></script>\n<script src="scramble.js?v=2"></script>\n<script src="salon.js?v=1"></script>\n<script src="ver-completa.js?v=2"></script>\n<script src="ayuda.js?v=1"></script>\n<script src="clasif-oculta.js?v=1"></script>\n<script src="intro-video.js?v=1"></script>\n<script src="patro-destacado.js?v=2"></script>\n<script src="qrcode.js?v=1"></script>\n<script src="qr-grupo.js?v=1"></script>\n<script src="buscador-campos.js?v=7"></script>\n<script src="promo-bolas.js?v=1"></script>\n<script src="ir-hato.js?v=1"></script>\n<div class="pr-banda">Pruebas</div>\n</body>', 1)
assert 'js/ligas.js' in s and 'cuenta-ajustes.js' in s and 'cuenta.js' in s and 'almacen.js' in s and 'grupos.js' in s and 'avatares.js' in s and 'avatares.css' in s and 'reserva-club.js' in s and 'ryder.js' in s and 'ryder.css' in s and 'contador.js' in s and 'contador.css' in s and 'faltan-tarjeta.js' in s and 'faltan-tarjeta.css' in s and 'patro-cuenta.js' in s and 'navegacion.js' in s and 'navegacion.css' in s and 'ganadores.js' in s and 'inicio-partido.js' in s and 'inicio-partido.css' in s and 'manual.js' in s and 'manual.css' in s and 'scramble.js' in s and 'scramble.css' in s and 'salon.js' in s and 'ver-completa.js' in s and 'planes.css' in s and 'ayuda.js' in s and 'clasif-oculta.js' in s and 'patro-destacado.js' in s and 'intro-video.js' in s and 'intro-video.css' in s and 'qr-grupo.js' in s and 'salon.css' in s
open(p, 'w', encoding='utf-8').write(s)
m = 'pruebas/manifest.json'
t = open(m, encoding='utf-8').read().replace('"App de Golf"', '"App de Golf · PRUEBAS"').replace('"App Golf"', '"Golf PRUEBAS"')
open(m, 'w', encoding='utf-8').write(t)
EOF
echo "Versión de pruebas generada en pruebas/"
