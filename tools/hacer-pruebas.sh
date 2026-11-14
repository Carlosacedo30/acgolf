#!/usr/bin/env bash
# © 2026 Carlos Acedo Domínguez. Todos los derechos reservados.
# Genera la versión de pruebas (carpeta pruebas/) a partir de la app de la liga + lo de pruebas-src/.
# La app de la liga no se modifica: solo se lee.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf pruebas
mkdir pruebas
for f in *; do
  case "$f" in pruebas|pruebas-src|tools|acgolf-es|supabase|README.md|CLAUDE.md|LICENSE|app-golf-movil.html) continue ;; esac
  cp -R "$f" pruebas/
done
cp -R pruebas-src/. pruebas/

# Base de datos de PRUEBAS: proyecto qjtsjcfalettgvrlwwnr (sin datos reales, sin correos).
# La app real (acgolf.es) usa svnkgmbfanwftncopqjg. NUNCA mezclar.
grep -q qjtsjcfalettgvrlwwnr pruebas/js/rondas-compartidas.js || { echo "ERROR: pruebas no apunta a la base de pruebas"; exit 1; }
if grep -rq svnkgmbfanwftncopqjg pruebas/js/rondas-compartidas.js; then echo "ERROR: pruebas apunta a la base REAL"; exit 1; fi

# Partidas de hasta 8 grupos de 4 (32 jugadores) en la versión de pruebas
sed -i "s#const MAX_GROUPS = 4;#const MAX_GROUPS = 8;#" pruebas/js/players.js
grep -q "const MAX_GROUPS = 8;" pruebas/js/players.js || { echo "ERROR: no se cambió el número de grupos"; exit 1; }

# Enlaces de convocatoria apuntando a la versión de pruebas
sed -i "s#https://carlosacedo30.github.io/acgolf/'#https://carlosacedo30.github.io/acgolf/pruebas/'#" pruebas/js/convocatoria.js

# «Organizar partido con amigos» abierto a todos los jugadores con cuenta:
# el que lo organiza y cualquiera de los apuntados pueden crear la partida con los apuntados; borrar sigue siendo solo del administrador
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
    const yoMismo = (window.miPerfil && window.miPerfil.player_name) || '';
    const apuntado = !!yoMismo && (conv.groups || []).some(g => (g || []).includes(yoMismo));   // cualquiera de los apuntados puede crear la partida
    if((isAdmin || organizo || apuntado) && !conv.roundCode) h += '<button type="button" class="conv-btn primary" id="convCreateRound">Crear la partida con los apuntados</button>';
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

# Organizar partido: WhatsApp justo debajo de las partidas (antes había que bajar hasta el final),
# botón para añadir otra partida a un partido ya creado y el nombre del grupo de cada uno en el mensaje
python3 - <<'PY'
def cambia(p, a, b):
    s = open(p, encoding='utf-8').read()
    assert s.count(a) == 1, (p, a[:60])
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
f = 'pruebas/js/convocatoria.js'
cambia(f, """    }).join('') + '</div>';

    if(conv.roundCode){""", """    }).join('') + '</div>';
    {
      const organizo1 = !!(conv.organiza && conv.organiza === window.miPerfilId);
      if((isAdmin || organizo1) && !conv.roundCode && !convAlTiro(conv) && conv.times.length < 12)
        h += '<button type="button" class="conv-btn conv-mas-partida" id="convAddTee">＋ Añadir otra partida (' + convTime(convHoraMas(conv.times[conv.times.length - 1], 10)) + ')</button>';
      h += '<a class="conv-btn wa" id="convShareWa" target="_blank" rel="noopener" href="' + convEsc(convWaHref()) + '">Enviar al grupo de WhatsApp</a>';
    }

    if(conv.roundCode){""")
cambia(f, """    h += '<div class="conv-actions">'
      + '<a class="conv-btn wa" id="convShareWa" target="_blank" rel="noopener" href="' + convEsc(convWaHref()) + '">Enviar al grupo de WhatsApp</a>';""", """    h += '<div class="conv-actions">';""")
cambia(f, """    const db = document.getElementById('convDeleteBtn'); if(db) db.addEventListener('click', ()=> convDelete(db));""", """    const db = document.getElementById('convDeleteBtn'); if(db) db.addEventListener('click', ()=> convDelete(db));
    const at = document.getElementById('convAddTee'); if(at) at.addEventListener('click', async ()=>{
      if(at.dataset.busy) return; at.dataset.busy = '1'; at.textContent = 'Guardando…';
      await convMutate(c => { const t = convHoraMas(c.times[c.times.length - 1], 10); c.times.push(t); c.groups.push([]); if(c.hoyos) c.hoyos.push(null); return null; });
    });""")
cambia(f, """  function convSlotOf(c, name){""", """  function convHoraMas(t, n){ const [h, m] = String(t || '08:40').split(':').map(Number); const x = h * 60 + m + n; return String(Math.floor(x / 60) % 24).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); }
  function convSlotOf(c, name){""")
cambia(f, """    const text = '🏌️ *Los Iscariotes* · '""", """    const text = '🏌️ *' + ((window.miPerfil && window.miPerfil.grupo) || 'Los Iscariotes') + '* · '""")
PY

# Organizar partido: cruz grande en cada horario para quitarlo (administrador o quien organiza, antes de crear la partida)
python3 - <<'PY'
def cambia(p, a, b):
    s = open(p, encoding='utf-8').read()
    assert s.count(a) == 1, (p, a[:60])
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
f = 'pruebas/js/convocatoria.js'
cambia(f, """    h += '<div class="conv-tees">' + conv.times.map((t, i) => {""", """    const puedeQuitar = (isAdmin || !!(conv.organiza && conv.organiza === window.miPerfilId)) && !conv.roundCode && conv.times.length > 1;
    h += '<div class="conv-tees">' + conv.times.map((t, i) => {""")
cambia(f, """<span class="conv-tee-n">' + g.length + '/' + CONV_SLOTS + '</span></div>' + seats + '</div>';""",
          """<span class="conv-tee-n">' + g.length + '/' + CONV_SLOTS + '</span>'
        + (puedeQuitar ? '<button type="button" class="conv-tee-x" data-quitar="' + i + '" aria-label="Quitar el horario de las ' + convEsc(convEtq(conv, i)) + '">✕</button>' : '') + '</div>' + seats + '</div>';""")
cambia(f, """    const db = document.getElementById('convDeleteBtn'); if(db) db.addEventListener('click', ()=> convDelete(db));""", """    const db = document.getElementById('convDeleteBtn'); if(db) db.addEventListener('click', ()=> convDelete(db));
    body.querySelectorAll('[data-quitar]').forEach(b => b.addEventListener('click', async ()=>{
      const i = Number(b.dataset.quitar); const hora = convEtq(conv, i); const n = (conv.groups[i] || []).length;
      if(!confirm('¿Quitar el horario de las ' + hora + '?' + (n ? '\\n' + (n === 1 ? 'El apuntado se queda' : 'Los ' + n + ' apuntados se quedan') + ' sin hora y ' + (n === 1 ? 'tendrá' : 'tendrán') + ' que apuntarse en otra.' : ''))) return;
      b.disabled = true;
      await convMutate(c => {
        if(c.roundCode) return 'La partida ya está creada: ya no se pueden quitar horarios.';
        if(c.times.length <= 1) return 'Tiene que quedar al menos un horario.';
        const k = c.times.indexOf(conv.times[i]); const j = k >= 0 ? k : i;
        c.times.splice(j, 1); c.groups.splice(j, 1); if(c.hoyos) c.hoyos.splice(j, 1);
        return null;
      });
    }));""")
PY

# Organizar partido: si el campo viene del buscador, se guarda con el partido y se da de alta al cargarlo en cualquier móvil
python3 - <<'PY'
p = 'pruebas/js/convocatoria.js'
s = open(p, encoding='utf-8').read()
cambios = [
  ("roundCode: meta.roundCode || null, organiza: meta.organiza || null,",
   "roundCode: meta.roundCode || null, organiza: meta.organiza || null, campo: (() => { const k = meta.campo; if(k && k.id && Array.isArray(k.par) && !COURSES.some(x => x.id === k.id)) COURSES.push(Object.assign({}, k, { externo: true })); return k || null; })(),"),
  ("roundCode: c.roundCode, organiza: c.organiza || null } }",
   "roundCode: c.roundCode, organiza: c.organiza || null, campo: c.campo || null } }"),
  ("groups: times.map(() => []), roundCode: null, organiza: window.miPerfilId || null };",
   "groups: times.map(() => []), roundCode: null, organiza: window.miPerfilId || null,\n      campo: (() => { const k = COURSES.find(x => x.id === courseId); return k && k.externo ? { id: k.id, name: k.name, location: k.location || '', par: k.par, hcp: k.hcp, tees: k.tees || undefined, holes9: k.holes9 || undefined } : null; })() };"),
]
for a, b in cambios:
    assert s.count(a) == 1, a
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
PY

# Organizar partido: en los huecos de cada horario salen las dos primeras palabras del nombre (Carlos Acedo, no Carlos Acedo Domínguez)
python3 - <<'PY'
p = 'pruebas/js/convocatoria.js'
s = open(p, encoding='utf-8').read()
cambios = [
  ("  function convSlotOf(c, name){",
   "  // Se enseñan las dos primeras palabras del nombre (Carlos Acedo, Juan Carlos)\n"
   "  function convNombreCorto(n){ return String(n || '').trim().split(/\\s+/).filter(Boolean).slice(0, 2).join(' '); }\n"
   "  function convSlotOf(c, name){"),
  ("convEsc(g[k]) + '</div>'", "convEsc(convNombreCorto(g[k])) + '</div>'"),
]
for a, b in cambios:
    assert s.count(a) == 1, a
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
# («Crear partida» y «Organizar partido» enseñan los campos favoritos; ver pruebas-src/buscador-campos.js)
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
    if(c.tees9 && c.tees9.ida){ tees = tees || {}; Object.keys(c.tees9.ida).forEach(k => { tees[k] = c.tees9.ida[k]; }); }
    if(tees) v.tees = tees;
    if(c.externo) v.externo = true;
    COURSES.push(v);
    return v;
  }
  // Liga de 9 hoyos «Vuelta»: los hoyos 10 al 18 como partida de una vuelta (en los campos de 9 hoyos solo hay una vuelta)
  function cursoNueveVuelta(c){
    if(!c || c.nueve) return c;
    if(!Array.isArray(c.par) || c.par.length < 18) return cursoNueve(c);
    const id = c.id + '-9v';
    const ya = COURSES.find(x => x.id === id); if(ya) return ya;
    const hcp9 = (Array.isArray(c.hcp) ? c.hcp : []).slice(9, 18).map(Number);
    const orden = hcp9.map((v, i) => [isNaN(v) ? 99 : v, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const r = Array(9); orden.forEach((x, k) => { r[x[1]] = k + 1; });
    let tees;
    if(c.tees){ tees = {}; Object.keys(c.tees).forEach(k => { const t = c.tees[k]; tees[k] = { rating: Math.round(t.rating * 5) / 10, slope: t.slope }; }); }
    const v = { id, name: c.name + ' (vuelta 10-18)', location: c.location, holes9: true, nueve: true, par: c.par.slice(9, 18), hcp: r };
    if(c.tees9 && c.tees9.vuelta){ tees = tees || {}; Object.keys(c.tees9.vuelta).forEach(k => { tees[k] = c.tees9.vuelta[k]; }); }
    if(tees) v.tees = tees;
    if(c.externo) v.externo = true;
    COURSES.push(v);
    return v;
  }
  COURSES.slice().forEach(c => cursoNueve(c));
  COURSES.slice().forEach(c => cursoNueveVuelta(c));
  COURSES.forEach(c => { if(c.holes9 && !c.nueve) c.hcp = hcpNueveA18(c.hcp); });
  // Hoyos de la partida en juego: 9 en La Cartuja a 9 hoyos, 18 en todo lo demás
  function hoyosPartida(){ return (typeof selectedCourse !== 'undefined' && selectedCourse && selectedCourse.nueve) ? 9 : 18; }

  let selectedCourse = null;""")
cambia('pruebas/js/scorecard.js', """hcps.push((course.hcp && course.hcp[def.offset + i] !== undefined) ? course.hcp[def.offset + i] : (i + 1));""",
       """const ih = (course.holes9 && course.hcp && course.hcp.length === 18 ? def.startHole - 1 : def.offset) + i; // 9 hoyos: la 2.ª vuelta usa su propia dificultad
        hcps.push((course.hcp && course.hcp[ih] !== undefined) ? course.hcp[ih] : (i + 1));""")
# Una partida de un campo de 9 hoyos que otro móvil no conoce: se reconoce por traer 9 pares
cambia('pruebas/js/rondas-compartidas.js', """        holes9: false,""", """        holes9: !!(data.course_par && data.course_par.length === 9),
        nueve: /-9v?$/.test(String(data.course_id || '')), // partida de 9 hoyos (una vuelta)""")
# La Cartuja: rating y slope oficiales de 9 hoyos (par 29), sacados de la tabla de hándicap de juego
# del club (Escuela Golf La Cartuja): amarillas de caballeros y rojas de damas. Reproducen la tabla exacta.
cambia('pruebas/js/data.js', """      hcp:[3,5,13,12,10,15,2,11,9] },""", """      hcp:[3,5,13,12,10,15,2,11,9],
      // Rating / slope de 9 hoyos de la tabla del club (amarillas de caballeros, rojas de damas)
      tees:{
        amarillas:{ rating:25.4, slope:138 },
        rojas:    { rating:26.3, slope:146 },
      } },""")
# Las Minas (9 hoyos, par 36): rating y slope de 9 hoyos de golfingrecord.com (orientativo, falta confirmar con el club)
cambia('pruebas/js/data.js', """      hcp:[9,3,15,7,17,13,5,11,1] },""", """      hcp:[9,3,15,7,17,13,5,11,1],
      // Rating / slope de 9 hoyos: golfingrecord.com (orientativo); blancas y amarillas de caballeros, azules y rojas de damas
      tees:{
        blancas:   { rating:35.5, slope:132 },
        amarillas: { rating:35.4, slope:131 },
        azules:    { rating:36.2, slope:126 },
        rojas:     { rating:35.5, slope:124 },
      } },""")
# Real Club de Golf de Sevilla: rating y slope de la tarjeta del club (enero de 2026, Sistema Mundial de Hándicap).
# La tarjeta va por número de barra; colores por distancia (como la Federación):
# blancas = barra 62 y amarillas = barra 56 (caballeros); azules = barra 53 y rojas = barra 46 (damas).
cambia('pruebas/js/data.js', """      hcp:[14,2,12,6,18,4,8,16,10, 11,9,15,17,5,1,13,7,3] },""", """      hcp:[14,2,12,6,18,4,8,16,10, 11,9,15,17,5,1,13,7,3],
      // Rating / slope de la tarjeta del club (2026): blancas (62) y amarillas (56) de caballeros; azules (53) y rojas (46) de damas
      tees:{
        blancas:  { rating:73.2, slope:135 },
        amarillas:{ rating:70.5, slope:126 },
        azules:   { rating:74.2, slope:129 },
        rojas:    { rating:70.2, slope:117 },
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
cambia('pruebas/js/partida-rapida.js', """  function prRecibe(n){""", """  function prCurso(){ const c = COURSES.find(x => x.id === prCampo); return c && Number(prHoyos) === 9 && typeof cursoNueve === 'function' ? (window.acgolfMitad === 'vuelta' ? cursoNueveVuelta(c) : cursoNueve(c)) : c; }
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
# Fuera el aviso antiguo de abajo («Hoyo 8 · Pepe — Te como los huevos», «¡Qué bueno eres!»): ahora solo comentan Curro y Lola
cambia('pruebas/js/resultados.js', """    toastQueue.push(m);
    processToastQueue();""", """    // aviso antiguo quitado (decisión de Carlos, 9-nov-2026)""")
# Fuera también los iconos 👍/🥚 de las casillas, la lista de «mensajes» y la frase «Hoy te hacen el chivito»
cambia('pruebas/js/resultados.js', """            if(diff === 0){ msg = PAR_MESSAGE; icon = '👍'; }
            else if(diff === -1){ msg = BIRDIE_MESSAGE; icon = '🥚'; }""", """            // mensajes antiguos (👍/🥚) quitados: ahora comentan solo Curro y Lola""")
cambia('pruebas/js/resultados.js', """const WINNER_MESSAGE = 'Hoy te hacen el chivito';""", """const WINNER_MESSAGE = 'Ganador de la partida';""")
cambia('pruebas/js/resultados.js', """s.holesFilled + '/18 hoyos · Recibe '""", """s.holesFilled + '/' + hoyosPartida() + ' hoyos · Recibe '""")
cambia('pruebas/js/resultados.js', """summaries.every(s => s.holesFilled >= 18);""", """summaries.every(s => s.holesFilled >= hoyosPartida());""")
cambia('pruebas/js/resultados.js', """(summaries[i].holesFilled < 18 ? ' · ' + summaries[i].holesFilled + '/18 hoyos' : '')""", """(summaries[i].holesFilled < hoyosPartida() ? ' · ' + summaries[i].holesFilled + '/' + hoyosPartida() + ' hoyos' : '')""")
cambia('pruebas/js/interactions.js', """    const missing = getPlayerHolesFilled().filter(s => s.filled < 18);""", """    const missing = getPlayerHolesFilled().filter(s => s.filled < hoyosPartida());""")
cambia('pruebas/js/interactions.js', """s.filled + '/18 hoyos'""", """s.filled + '/' + hoyosPartida() + ' hoyos'""")

# Campos de Huelva (18-oct-2026): rating y slope por barra (no tenían ninguno). En Islantilla (Azul + Amarillo) la
# dificultad de la 2.ª vuelta se repetía (impares en las dos): la vuelta Amarillo pasa a pares, en su mismo orden de dificultad.
cambia('pruebas/js/data.js', """      hcp:[3,1,11,13,7,17,15,5,9, 16,2,14,4,18,8,12,10,6] },""", """      hcp:[3,1,11,13,7,17,15,5,9, 16,2,14,4,18,8,12,10,6],
      // Rating / slope: 18birdies, coincide con la tabla de slope del club (islacanela.es); azules y rojas de damas
      tees:{
        blancas:   { rating:73.4, slope:126 },
        amarillas: { rating:71.0, slope:125 },
        azules:    { rating:75.2, slope:127 },
        rojas:     { rating:74.0, slope:125 },
      } },""")
cambia('pruebas/js/data.js', """      hcp:[17,2,5,11,13,12,7,9,15, 10,16,3,6,1,14,18,4,8] },""", """      hcp:[17,2,5,11,13,12,7,9,15, 10,16,3,6,1,14,18,4,8],
      // Rating / slope: 18birdies (orientativo); azules y rojas de damas
      tees:{
        blancas:   { rating:73.6, slope:140 },
        amarillas: { rating:72.3, slope:140 },
        azules:    { rating:76.1, slope:134 },
        rojas:     { rating:73.6, slope:129 },
      } },""")
cambia('pruebas/js/data.js', """      hcp:[15,5,9,3,1,7,11,17,13, 3,5,1,15,7,17,13,9,11] },""", """      hcp:[15,5,9,3,1,7,11,17,13, 4,6,2,16,8,18,14,10,12],
      // Rating / slope: 1golf.eu, recorrido Azul + Amarillo; azules = barra azul de caballeros (no hay de damas), rojas de damas
      tees:{
        blancas:   { rating:65.7, slope:114 },
        amarillas: { rating:65.9, slope:114 },
        azules:    { rating:69.5, slope:125 },
        rojas:     { rating:70.9, slope:122 },
      } },""")
cambia('pruebas/js/data.js', """      hcp:[9,13,17,5,7,15,3,1,11, 10,6,18,8,12,16,4,2,14] },""", """      hcp:[9,13,17,5,7,15,3,1,11, 10,6,18,8,12,16,4,2,14],
      // Rating / slope: 1golf.eu; azules y rojas de damas
      tees:{
        blancas:   { rating:72.0, slope:132 },
        amarillas: { rating:70.1, slope:129 },
        azules:    { rating:71.6, slope:137 },
        rojas:     { rating:70.4, slope:129 },
      } },""")
cambia('pruebas/js/data.js', """      hcp:[4,14,16,12,8,6,10,18,2, 3,11,9,15,1,13,17,5,7] },""", """      hcp:[4,14,16,12,8,6,10,18,2, 3,11,9,15,1,13,17,5,7],
      // Rating / slope: 1golf.eu; azules y rojas de damas
      tees:{
        blancas:   { rating:72.2, slope:134 },
        amarillas: { rating:70.8, slope:131 },
        azules:    { rating:71.6, slope:137 },
        rojas:     { rating:72.4, slope:128 },
      } },""")
cambia('pruebas/js/data.js', """      hcp:[2,12,18,16,4,10,14,6,8, 11,3,9,17,13,1,7,15,5] },""", """      hcp:[2,12,18,16,4,10,14,6,8, 11,3,9,17,13,1,7,15,5],
      // Rating / slope: 1golf.eu; azules y rojas de damas
      tees:{
        blancas:   { rating:71.2, slope:129 },
        amarillas: { rating:69.7, slope:129 },
        azules:    { rating:73.1, slope:126 },
        rojas:     { rating:72.0, slope:123 },
      } },""")
cambia('pruebas/js/data.js', """      hcp:[4,10,18,2,12,8,14,6,16, 13,11,15,9,1,17,3,7,5] },""", """      hcp:[4,10,18,2,12,8,14,6,16, 13,11,15,9,1,17,3,7,5],
      // Rating / slope: 1golf.eu; azules y rojas de damas
      tees:{
        blancas:   { rating:71.3, slope:133 },
        amarillas: { rating:69.7, slope:131 },
        azules:    { rating:72.9, slope:125 },
        rojas:     { rating:70.6, slope:125 },
      } },""")
cambia('pruebas/js/data.js', """      hcp:[16,14,12,8,4,18,6,10,2, 13,9,17,7,15,5,11,1,3] },""", """      hcp:[16,14,12,8,4,18,6,10,2, 13,9,17,7,15,5,11,1,3],
      // Rating / slope: 1golf.eu; azules y rojas de damas
      tees:{
        blancas:   { rating:73.9, slope:132 },
        amarillas: { rating:71.1, slope:129 },
        azules:    { rating:74.6, slope:127 },
        rojas:     { rating:71.9, slope:124 },
      } },""")

# Pantalla de anotar (18-oct-2026, pedido por Carlos):
# · tarjeta de arriba siempre completa (ida y vuelta), sin botón de «media»
# · un punto en cada hoyo donde el jugador recibe golpe de hándicap
# · distancia al green solo en Hato Verde; fuera la sección «Ver tarjetas completas» de abajo
cambia('pruebas/js/tarjeta-blanca.js', """  let tbEntera = false;     // ver la tarjeta entera (ida y vuelta)""", """  const tbEntera = true;    // la tarjeta se ve siempre entera (ida y vuelta)""")
cambia('pruebas/js/tarjeta-blanca.js', """    let hoyos = '', pares = '', marcas = '';
    for(let h = desde; h < desde + 9; h++){
      const p = parDe(h), v = golpesDe(h, i);""", """    let hoyos = '', pares = '', marcas = '';
    // Golpes de hándicap que recibe el jugador en cada hoyo (con el % de la modalidad)
    let hcpJ = 0; try { hcpJ = typeof hcpJuego === 'function' ? hcpJuego(i) : 0; } catch(e){}
    const recibe = h => { const si = siDe(h); if(si == null || typeof strokesForHole !== 'function') return 0; try { return Math.max(0, strokesForHole(hcpJ, si)); } catch(e){ return 0; } };
    for(let h = desde; h < desde + 9; h++){
      const p = parDe(h), v = golpesDe(h, i), rec = recibe(h);""")
cambia('pruebas/js/tarjeta-blanca.js', """      pares += '<span>' + (p == null ? '' : p) + '</span>';""", """      pares += '<span class="tb-pc">' + (p == null ? '' : p) + (rec ? '<em class="tb-pts" aria-label="Recibe ' + rec + (rec === 1 ? ' golpe' : ' golpes') + '">' + '•'.repeat(Math.min(rec, 3)) + '</em>' : '') + '</span>';""")
cambia('pruebas/js/tarjeta-blanca.js', """    t.innerHTML = '<div class="tb-tira-cab"><b>' + esc(nombre).toUpperCase() + ' · ' + (tbEntera ? 'TARJETA ENTERA' : ida ? 'IDA (1 A 9)' : 'VUELTA (10 A 18)') + '</b>'
      + '<button type="button" class="tb-ver" id="tbVer">' + (tbEntera ? 'Ver solo media ‹' : 'Tarjeta entera ›') + '</button></div>'""", """    t.innerHTML = '<div class="tb-tira-cab"><b>' + esc(nombre).toUpperCase() + ' · TARJETA</b><span class="tb-pts-ley"><em class="tb-pts">•</em> recibe golpe</span></div>'""")
cambia('pruebas/js/tarjeta-blanca.js', """    document.getElementById('tbVer').addEventListener('click', () => { tbEntera = !tbEntera; pintarTira(); });
""", "")
cambia('pruebas/js/tarjeta-blanca.js', """  // ---------- Casillas de golpes pintadas según el resultado ----------""", """  // Distancia al green solo en Hato Verde (el único campo con dibujos y greens guardados); fuera las tarjetas de abajo
  function limpiar(){
    const g = document.getElementById('greenArriba');
    if(g) g.style.display = (typeof selectedCourse !== 'undefined' && selectedCourse && selectedCourse.id === 'hato-verde') ? '' : 'none';
    const lbl = document.getElementById('toggleGridLbl');
    const sec = lbl && lbl.closest('section');
    if(sec) sec.style.display = 'none';
  }

  // ---------- Casillas de golpes pintadas según el resultado ----------""")
cambia('pruebas/js/tarjeta-blanca.js', """    try { marcarPantalla(); if(colocar()){ pintarCasillas(); pintarTira(); } } catch(e){ console.error(e); }""", """    try { marcarPantalla(); limpiar(); if(colocar()){ pintarCasillas(); pintarTira(); } } catch(e){ console.error(e); }""")

# Que los móviles descarguen de nuevo los archivos cambiados (no la copia guardada)
import re
p = 'pruebas/index.html'; s = open(p, encoding='utf-8').read()
for f in ('data', 'scorecard', 'rondas-compartidas', 'players', 'partida-rapida', 'vista-hoyo', 'resultados', 'interactions', 'ligas', 'convocatoria'):
    s, n = re.subn(r'(js/' + f + r'\.js\?v=\d+)"', r'\g<1>10"', s); assert n == 1, f
open(p, 'w', encoding='utf-8').write(s)
PY

# index.html: almacén separado, cuentas y banda de "VERSIÓN DE PRUEBAS"
python3 - <<'EOF'
import re
p = 'pruebas/index.html'
s = open(p, encoding='utf-8').read()
s = s.replace('<title>App de Golf</title>', '<title>App de Golf · PRUEBAS</title>\n<meta name="robots" content="noindex">\n<script src="almacen.js?v=1"></script>\n<script>window.acgolfBarras = true; /* elegir barra de salida de cada jugador */</script>', 1)
s = s.replace('</head>', '<link rel="stylesheet" href="cuenta.css?v=30">\n<link rel="stylesheet" href="seguimiento.css?v=4">\n<link rel="stylesheet" href="en-vivo.css?v=12">\n<link rel="stylesheet" href="tele-directo.css?v=5">\n<link rel="stylesheet" href="redes.css?v=4">\n<link rel="stylesheet" href="idioma.css?v=2">\n<link rel="stylesheet" href="avatares.css?v=1">\n<link rel="stylesheet" href="ryder.css?v=3">\n<link rel="stylesheet" href="contador.css?v=2">\n<link rel="stylesheet" href="faltan-tarjeta.css?v=1">\n<link rel="stylesheet" href="navegacion.css?v=1">\n<link rel="stylesheet" href="inicio-partido.css?v=6">\n<link rel="stylesheet" href="manual.css?v=2">\n<link rel="stylesheet" href="scramble.css?v=1">\n<link rel="stylesheet" href="salon.css?v=2">\n<link rel="stylesheet" href="ver-completa.css?v=1">\n<link rel="stylesheet" href="planes.css?v=2">\n<link rel="stylesheet" href="ayuda.css?v=2">\n<link rel="stylesheet" href="patro-destacado.css?v=1">\n<link rel="stylesheet" href="intro-video.css?v=2">\n<link rel="stylesheet" href="buscador-campos.css?v=10">\n<link rel="stylesheet" href="promo-bolas.css?v=2">\n<link rel="stylesheet" href="ir-hato.css?v=2">\n<link rel="stylesheet" href="anotar-limpio.css?v=1">\n<link rel="stylesheet" href="anotar-compacta.css?v=1">\n<link rel="stylesheet" href="como-jugue.css?v=1">\n<link rel="stylesheet" href="caddie-curro.css?v=2">\n<link rel="stylesheet" href="avisos-movil.css?v=2">\n<link rel="stylesheet" href="redes-aviso.css?v=1">\n<link rel="stylesheet" href="campos-grafito.css?v=3">\n<link rel="stylesheet" href="cartas.css?v=1">\n<link rel="stylesheet" href="hoyo19.css?v=3">\n<link rel="stylesheet" href="hoyo19-hilo.css?v=6">\n<link rel="stylesheet" href="liga-compartir.css?v=1">\n</head>', 1)
s = re.sub(r'(<script src="js/rondas-compartidas\.js\?v=\d+"></script>)', r'\1\n<script src="visitas.js?v=2"></script>\n<script src="portada.js?v=6"></script>\n<script src="avisos-movil.js?v=5"></script>\n<script src="cuenta.js?v=56"></script>\n<script src="seguimiento.js?v=7"></script>', s, count=1)
# La pantalla blanca y el resumen tienen que ir DESPUÉS del marcador: se quitan de su sitio y se ponen tras él
# El aviso «ahora es acgolf.es» solo va en la app antigua de la liga
s = re.sub(r'<script src="js/aviso-acgolf\.js\?v=\d+"></script>\n', '', s)
s = re.sub(r'<script src="js/(tarjeta-blanca|resumen-jugador)\.js\?v=\d+"></script>\n', '', s)
s = s.replace('</body>', '<script src="idioma-en-3.js?v=2"></script>\n<script src="idioma-en-2.js?v=3"></script>\n<script src="idioma-en.js?v=5"></script>\n<script src="idiomas/fr/idioma-fr.js?v=3"></script>\n<script src="idiomas/fr/idioma-fr-2.js?v=4"></script>\n<script src="idioma.js?v=8"></script>\n<script src="cuenta-ajustes.js?v=1"></script>\n<script src="grupos.js?v=1"></script>\n<script src="marcador.js?v=7"></script>\n<script src="js/tarjeta-blanca.js?v=3"></script>\n<script src="anotar-compacta.js?v=3"></script>\n<script src="js/resumen-jugador.js?v=3"></script>\n<script src="enlace-partida.js?v=3"></script>\n<script src="aviso-partida.js?v=4"></script>\n<script src="avatares.js?v=2"></script>\n<script src="reserva-club.js?v=2"></script>\n<script src="ryder.js?v=6"></script>\n<script src="cartas-motor.js?v=1"></script>\n<script src="cartas.js?v=1"></script>\n<script src="hoyo19-foto.js?v=2"></script>\n<script src="hoyo19-hilo.js?v=8"></script>\n<script src="liga-compartir.js?v=1"></script>\n<script src="hoyo19.js?v=4"></script>\n<script src="contador.js?v=2"></script>\n<script src="faltan-tarjeta.js?v=1"></script>\n<script src="patro-cuenta.js?v=1"></script>\n<script src="navegacion.js?v=2"></script>\n<script src="ganadores.js?v=2"></script>\n<script src="inicio-partido.js?v=5"></script>\n<script src="manual.js?v=11"></script>\n<script src="scramble.js?v=2"></script>\n<script src="salon.js?v=1"></script>\n<script src="ver-completa.js?v=2"></script>\n<script src="ayuda.js?v=4"></script>\n<script src="clasif-oculta.js?v=1"></script>\n<script src="intro-video.js?v=9"></script>\n<script src="patro-destacado.js?v=2"></script>\n<script src="qrcode.js?v=1"></script>\n<script src="qr-grupo.js?v=1"></script>\n<script src="campos-cadiz.js?v=4"></script>\n<script src="buscador-campos.js?v=18"></script>\n<script src="promo-bolas.js?v=2"></script>\n<script src="ir-hato.js?v=2"></script>\n<script src="como-jugue.js?v=2"></script>\n<script src="caddie-curro.js?v=16"></script>\n<script src="aviso-cerrada.js?v=1"></script>\n<script src="redes.js?v=7"></script>\n<script src="redes-aviso.js?v=1"></script>\n<script src="tele-directo.js?v=14"></script>\n<script src="en-vivo.js?v=29"></script>\n<script src="partido-a-partida.js?v=3"></script>\n<div class="pr-banda">Pruebas</div>\n</body>', 1)
assert 'js/ligas.js' in s and 'cuenta-ajustes.js' in s and 'cuenta.js' in s and 'almacen.js' in s and 'grupos.js' in s and 'avatares.js' in s and 'avatares.css' in s and 'reserva-club.js' in s and 'ryder.js' in s and 'ryder.css' in s and 'cartas.js' in s and 'cartas-motor.js' in s and 'cartas.css' in s and 'contador.js' in s and 'contador.css' in s and 'faltan-tarjeta.js' in s and 'faltan-tarjeta.css' in s and 'patro-cuenta.js' in s and 'navegacion.js' in s and 'navegacion.css' in s and 'ganadores.js' in s and 'inicio-partido.js' in s and 'inicio-partido.css' in s and 'manual.js' in s and 'manual.css' in s and 'scramble.js' in s and 'scramble.css' in s and 'salon.js' in s and 'ver-completa.js' in s and 'planes.css' in s and 'ayuda.js' in s and 'clasif-oculta.js' in s and 'patro-destacado.js' in s and 'intro-video.js' in s and 'intro-video.css' in s and 'qr-grupo.js' in s and 'salon.css' in s and 'hoyo19.js' in s and 'hoyo19.css' in s and 'hoyo19-hilo.js' in s and 'hoyo19-foto.js' in s and 'hoyo19-hilo.css' in s and 'liga-compartir.js' in s and 'liga-compartir.css' in s
open(p, 'w', encoding='utf-8').write(s)
m = 'pruebas/manifest.json'
t = open(m, encoding='utf-8').read().replace('"App de Golf"', '"App de Golf · PRUEBAS"').replace('"App Golf"', '"Golf PRUEBAS"')
open(m, 'w', encoding='utf-8').write(t)
EOF
# Partido organizado: interruptor «Partida con marcador» al crear la partida, y el organizador (o el administrador)
# puede borrar el partido aunque ya tenga la partida creada (se borran los dos)
python3 - <<'EOF'
def cambia(p, a, b):
    s = open(p, encoding='utf-8').read()
    assert s.count(a) == 1, (p, a[:60])
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
f = 'pruebas/js/convocatoria.js'
cambia(f, """  let convChannel = null;""", """  let convChannel = null;
  let convMarc = false;       // interruptor «Partida con marcador» al crear la partida de un partido organizado
  const convEsJornada = c => !!(c && /J\\d+$/.test(c.code || '') && String(c.code).length > 6);   // jornada de una liga: el marcador va solo""")
cambia(f, """    if((isAdmin || organizo || apuntado) && !conv.roundCode) h += '<button type="button" class="conv-btn primary" id="convCreateRound">Crear la partida con los apuntados</button>';""",
"""    if((isAdmin || organizo || apuntado) && !conv.roundCode){
      if(!convEsJornada(conv)) h += '<button type="button" class="pr-marc' + (convMarc ? ' on' : '') + '" id="convMarc" role="switch" aria-checked="' + (convMarc ? 'true' : 'false') + '">'
        + '<span class="pr-marc-t"><b>' + (convMarc ? 'Con marcador' : 'Partida normal') + '</b><small>'
        + (convMarc ? 'Cada uno apunta sus golpes y los del jugador al que marca, como en la liga.' : 'Cada uno apunta sus golpes, sin marcador. Toca para jugar con marcador.')
        + '</small></span><span class="pr-marc-sw" aria-hidden="true"><i></i></span></button>';
      h += '<button type="button" class="conv-btn primary" id="convCreateRound">Crear la partida con los apuntados</button>';
    }""")
cambia(f, """    if(isAdmin){
      h += '<button type="button" class="conv-btn borrar" id="convDeleteBtn">""", """    if(isAdmin || organizo){
      h += '<button type="button" class="conv-btn borrar" id="convDeleteBtn">""")
cambia(f, """    const db = document.getElementById('convDeleteBtn'); if(db) db.addEventListener('click', ()=> convDelete(db));""",
"""    const db = document.getElementById('convDeleteBtn'); if(db) db.addEventListener('click', ()=> convDelete(db));
    const cm = document.getElementById('convMarc'); if(cm) cm.addEventListener('click', ()=>{ convMarc = !convMarc; renderConv(); });""")
cambia(f, """      if(error) throw error;
      await convMutate(c => { c.roundCode = data.code; return null; });""", """      if(error) throw error;
      if(convMarc && !convEsJornada(conv)){ try { await client.rpc('poner_marcador', { p_code: data.code }); } catch(e){} }
      convMarc = false;
      await convMutate(c => { c.roundCode = data.code; return null; });""")
cambia(f, """    if(!confirm('¿Borrar el partido del ' + convLongDate(conv.date) + '?\\nDesaparece para todos los jugadores y no se puede deshacer.')) return;""",
"""    if(!confirm('¿Borrar el partido del ' + convLongDate(conv.date) + '?\\n' + (conv.roundCode ? 'También se borra la partida que se creó con los apuntados. ' : '') + 'Desaparece para todos los jugadores y no se puede deshacer.')) return;""")
cambia(f, """    const res = await deleteSharedRound(conv.code);""", """    if(conv.roundCode){ try { await deleteSharedRound(conv.roundCode); } catch(e){} }
    const res = await deleteSharedRound(conv.code);""")
EOF

# --- Liga de 9 o 18 hoyos (etapa 1): paso «Hoyos» al crear la liga; 9 hoyos = Ida (1-9) o Vuelta (10-18) ---
python3 - <<'EOF'
def cambia(p, a, b):
    s = open(p, encoding='utf-8').read()
    assert s.count(a) == 1, (p, a[:70])
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
L = 'pruebas/js/ligas.js'
# el campo de una jornada de 9 hoyos («campo-9» o «campo-9v») se crea si aún no existe
cambia(L, """function ligaCampo(id){ return COURSES.find(c => c.id === id) || COURSES.find(c => c.id === 'hato-verde'); }""",
"""function ligaCampo(id){
  let c = COURSES.find(x => x.id === id);
  if(!c){
    const m = /^(.*)-9(v?)$/.exec(String(id || '')); const b = m && COURSES.find(x => x.id === m[1]);
    if(b && typeof cursoNueve === 'function') c = m[2] ? cursoNueveVuelta(b) : cursoNueve(b);
  }
  return c || COURSES.find(x => x.id === 'hato-verde');
}""")
# se guarda en la liga
cambia(L, """hoyoInicio: meta.hoyoInicio || 1, jornadas: meta.jornadas || [],""", """hoyoInicio: meta.hoyoInicio || 1, jornadas: meta.jornadas || [],
    hoyos: meta.hoyos === 9 ? 9 : 18, mitad: meta.mitad === 'vuelta' ? 'vuelta' : 'ida',""")
cambia(L, """hoyoInicio: l.hoyoInicio || 1, jornadas: l.jornadas,
    frec:""", """hoyoInicio: l.hoyoInicio || 1, jornadas: l.jornadas, hoyos: l.hoyos === 9 ? 9 : 18, mitad: l.mitad === 'vuelta' ? 'vuelta' : 'ida',
    frec:""")
cambia(L, """hoyoInicio: f.hoyoInicio || 1, jornadas: cal,""", """hoyoInicio: f.hoyoInicio || 1, jornadas: cal, hoyos: f.hoyos === 9 ? 9 : 18, mitad: f.mitad === 'vuelta' ? 'vuelta' : 'ida',""")
# formulario
cambia(L, """minimo: 0, sorteo: 'rotar' };
  const f = ligaForm;""", """minimo: 0, sorteo: 'rotar', hoyos: 18, mitad: 'ida' };
  const f = ligaForm;""")
for a, b in [('10 · Grupos de salida', '11 · Grupos de salida'), ('9 · Mínimo para clasificar', '10 · Mínimo para clasificar'),
             ('8 · Rondas que cuentan', '9 · Rondas que cuentan'), ('7 · Formato', '8 · Formato'), ('6 · Salida', '7 · Salida')]:
    cambia(L, "'<div class=\"conv-eyebrow\">" + a + "</div>'", "'<div class=\"conv-eyebrow\">" + b + "</div>'")
cambia(L, """    + '<div class="conv-eyebrow">7 · Salida</div>'""", """    + '<div class="conv-eyebrow">6 · Hoyos</div>'
    + '<div class="lg-dos">' + [[18, '18 hoyos', 'Vuelta completa'], [9, '9 hoyos', 'Media vuelta']].map(c => '<button type="button" class="lg-opc lg-opc2' + ((f.hoyos === 9 ? 9 : 18) === c[0] ? ' on' : '') + '" data-hoyos="' + c[0] + '">' + c[1] + '<small>' + c[2] + '</small></button>').join('') + '</div>'
    + (f.hoyos === 9
        ? '<div class="lg-dos" style="margin-top:8px;">' + [['ida', 'Ida (1 al 9)'], ['vuelta', 'Vuelta (10 al 18)']].map(c => '<button type="button" class="lg-opc' + ((f.mitad === 'vuelta' ? 'vuelta' : 'ida') === c[0] ? ' on' : '') + '" data-mitad="' + c[0] + '">' + c[1] + '</button>').join('') + '</div>'
          + '<div class="lg-aviso">Cada ronda se juega a 9 hoyos y cuenta solo para la clasificación de esta liga. No cuenta para el hándicap de los jugadores. Se usa medio hándicap.</div>'
        : '')
    + '<div class="conv-eyebrow">7 · Salida</div>'""")
cambia(L, """  body.querySelectorAll('[data-sorteo]').forEach(""", """  body.querySelectorAll('[data-hoyos]').forEach(b => b.addEventListener('click', ()=>{ f.hoyos = Number(b.dataset.hoyos) === 9 ? 9 : 18; repintar(); }));
  body.querySelectorAll('[data-mitad]').forEach(b => b.addEventListener('click', ()=>{ f.mitad = b.dataset.mitad === 'vuelta' ? 'vuelta' : 'ida'; repintar(); }));
  body.querySelectorAll('[data-sorteo]').forEach(""")
cambia(L, """+ f.jornadas + ' rondas (' + (f.formato""", """+ f.jornadas + ' rondas de ' + (f.hoyos === 9 ? '9 hoyos (' + (f.mitad === 'vuelta' ? 'vuelta, del 10 al 18' : 'ida, del 1 al 9') + ')' : '18 hoyos') + ' (' + (f.formato""")
# clasificación: solo los hoyos que se juegan (9 en las rondas de 9 hoyos)
cambia(L, """      if(golpes.length < 18) return; // solo cuentan las tarjetas completas""", """      const nH = curso && curso.nueve ? 9 : 18; // rondas de 9 hoyos: media tarjeta
      if(golpes.length < nH) return; // solo cuentan las tarjetas completas""")
cambia(L, """      for(let h = 1; h <= 18; h++){
        const gol = Number(sc[h]); const par = curso && curso.par ? Number(curso.par[h - 1]) : 4;
        const rec = typeof strokesForHole === 'function' && curso && curso.hcp ? strokesForHole(recibidos, curso.hcp[h - 1]) : 0;""",
"""      for(let h = 1; h <= nH; h++){
        const gol = Number(sc[h]); const par = curso && curso.par ? Number(curso.par[h - 1]) : 4;
        const rec = nH === 9 ? (curso && curso.hcp ? Math.floor(recibidos / 9) + ((recibidos % 9) >= curso.hcp[h - 1] ? 1 : 0) : 0)
          : (typeof strokesForHole === 'function' && curso && curso.hcp ? strokesForHole(recibidos, curso.hcp[h - 1]) : 0);""")
cambia(L, """const suma = (a, k) => a.slice(18 - k).reduce((x, y) => x + y, 0);""", """const suma = (a, k) => a.slice(nH - k).reduce((x, y) => x + y, 0);""")
cambia(L, """const cb = [9, 12, 15, 16, 17].map(k => l.formato === 'stableford' ? -suma(ptsHoyo, k) : suma(golHoyo, k) - recibidos * k / 18);""",
"""const cb = (nH === 9 ? [6, 3, 2, 1] : [9, 12, 15, 16, 17]).map(k => l.formato === 'stableford' ? -suma(ptsHoyo, k) : suma(golHoyo, k) - recibidos * k / nH);""")
# la partida de la jornada (partido al tiro): campo de 9 hoyos y marca de 9 hoyos
C = 'pruebas/js/convocatoria.js'
cambia(C, """    const course = convCourse(conv.courseId);
    const groups = normalizeMatchGroups(withPlayers.map(x => ({
      hoyoSalida: x.hoyo || undefined,""", """    const course = (window.acgolfLigaCurso && window.acgolfLigaCurso(conv)) || convCourse(conv.courseId);
    const groups = normalizeMatchGroups(withPlayers.map(x => ({
      hoyoSalida: x.hoyo || undefined,
      nueve: course.nueve ? true : undefined,""")
# Crear partida: se borra la mitad elegida al abrirla de nuevo
cambia('pruebas/js/partida-rapida.js', """    prDesde = null;
    prPaso = 1;""", """    prDesde = null; window.acgolfMitad = null;
    prPaso = 1;""")
# Cada jornada puede elegir sus hoyos (18, o 9: ida o vuelta); si no, usa los de la liga
cambia(L, """hoyoInicio: Number(j.hoyoInicio || l.hoyoInicio) || 1,
    hoyos: ligaSalidas(""", """hoyoInicio: Number(j.hoyoInicio || l.hoyoInicio) || 1,
    nh: Number(j.nh || l.hoyos) === 9 ? 9 : 18, mitad: (j.mitad || l.mitad) === 'vuelta' ? 'vuelta' : 'ida',
    hoyos: ligaSalidas(""")
cambia(L, """        + '<div class="conv-eyebrow">Campo</div>'
        + ligaBotonesCampo(cfg.courseId, 'data-c', false)""", """        + '<div class="conv-eyebrow">Hoyos de esta jornada</div>'
        + '<div class="lg-dos">' + [[18, '18 hoyos'], [9, '9 hoyos']].map(x => '<button type="button" class="lg-opc' + (cfg.nh === x[0] ? ' on' : '') + '" data-nh="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>'
        + (cfg.nh === 9 ? '<div class="lg-dos" style="margin-top:8px;">' + [['ida', 'Ida (1 al 9)'], ['vuelta', 'Vuelta (10 al 18)']].map(x => '<button type="button" class="lg-opc' + (cfg.mitad === x[0] ? ' on' : '') + '" data-mi="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' : '')
        + '<div class="lg-aviso">Solo cambia esta jornada. Las demás siguen como las creaste.</div>'
        + '<div class="conv-eyebrow">Campo</div>'
        + ligaBotonesCampo(cfg.courseId, 'data-c', false)""")
cambia(L, """    body.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', ()=>{ leer(); cfg.salida = b.dataset.s; pintar(); }));""",
"""    body.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', ()=>{ leer(); cfg.salida = b.dataset.s; pintar(); }));
    body.querySelectorAll('[data-nh]').forEach(b => b.addEventListener('click', ()=>{ leer(); cfg.nh = Number(b.dataset.nh) === 9 ? 9 : 18; pintar(); }));
    body.querySelectorAll('[data-mi]').forEach(b => b.addEventListener('click', ()=>{ leer(); cfg.mitad = b.dataset.mi === 'vuelta' ? 'vuelta' : 'ida'; pintar(); }));""")
cambia(L, """  j.date = cfg.date; j.courseId = cfg.courseId;
""", """  j.date = cfg.date; j.courseId = cfg.courseId;
  if(cfg.nh){
    if(cfg.nh !== (l.hoyos === 9 ? 9 : 18)) j.nh = cfg.nh; else delete j.nh;
    if(cfg.nh === 9 && cfg.mitad !== (l.mitad === 'vuelta' ? 'vuelta' : 'ida')) j.mitad = cfg.mitad; else delete j.mitad;
  }
""")
cambia(L, """txt = ligaCampoCorto(j.courseId) + ' · ' + (j.salida""", """txt = ligaCampoCorto(j.courseId) + ((j.nh || l.hoyos) === 9 ? ' · 9 hoyos ' + (((j.mitad || l.mitad) === 'vuelta') ? '(vuelta)' : '(ida)') : '') + ' · ' + (j.salida""")
# Partida cerrada (más de 12 horas): si alguien intenta cambiar un golpe, se le avisa de que no se ha guardado
cambia('pruebas/js/rondas-compartidas.js', """      } catch(e){
        console.error('No se pudo guardar solo el grupo; se guarda la partida entera', e);
        try {
          await client.from('rounds').update({
            match_groups: matchGroups,
            updated_at: new Date().toISOString(),
          }).eq('id', currentRoundId);
        } catch(e2){ console.error('No se pudo guardar la partida', e2); }
      }""", """      } catch(e){
        if(/cerrada|entregada|ya no se puede/i.test(String((e && e.message) || e))){ if(window.acgolfAvisoCerrada) window.acgolfAvisoCerrada(); setTimeout(()=>{ suppressRemoteEcho = false; }, 400); return; }
        console.error('No se pudo guardar solo el grupo; se guarda la partida entera', e);
        try {
          const r2 = await client.from('rounds').update({
            match_groups: matchGroups,
            updated_at: new Date().toISOString(),
          }).eq('id', currentRoundId);
          if(r2 && r2.error && /cerrada|entregada|ya no se puede/i.test(String(r2.error.message || ''))){ if(window.acgolfAvisoCerrada) window.acgolfAvisoCerrada(); }
        } catch(e2){ console.error('No se pudo guardar la partida', e2); }
      }""")
EOF

# Caddie: el aviso antiguo «Tu caddie» (caddie-protector.js) ya no se ve (lo sustituye Curro): no se descarga en pruebas
sed -i '/js\/caddie-protector.js/d' pruebas/index.html
rm -f pruebas/js/caddie-protector.js
if grep -q "caddie-protector" pruebas/index.html; then echo "ERROR: sigue el aviso antiguo del caddie"; exit 1; fi

echo "Versión de pruebas generada en pruebas/"

# --- Compartir la clasificación de la liga al WhatsApp (imagen como la de El hoyo 19) ---
python3 - <<'EOF'
def cambia(p, a, b):
    s = open(p, encoding='utf-8').read()
    assert s.count(a) == 1, (p, a[:70])
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
L = 'pruebas/js/ligas.js'
cambia(L, """  const clasif = ligaTabla(l, res, reglaVista);
  const hayPuntos = clasif.some(c => c.jugadas);""", """  const clasif = ligaTabla(l, res, reglaVista);
  const hayPuntos = clasif.some(c => c.jugadas);
  // datos para la imagen de WhatsApp (nombre completo, solo quien entra en la clasificación)
  (() => { const jug = l.jornadas.filter(j => (res[j.n] || []).length), ult = jug[jug.length - 1];
    let pos = 0; const filas = hayPuntos ? clasif.filter(c => c.entra).map(c => ({ n: c.jugador, p: c.puntos })) : [];
    window.acgolfLigaComp = { nombre: l.nombre, stb: l.formato === 'stableford', filas,
      linea: jug.length + (jug.length === 1 ? ' ronda jugada' : ' rondas jugadas') + ' de ' + l.jornadas.length + (ult ? ' · ' + ligaCampoCorto(ult.courseId) : '') + (l.hoyos === 9 ? ' · 9 hoyos (' + (l.mitad === 'vuelta' ? 'vuelta' : 'ida') + ')' : '') }; })();""")
cambia(L, """    + '</tbody></table></div>'
    + '<div class="lg-aviso">PR = rondas válidas.""", """    + '</tbody></table></div>'
    + (hayPuntos ? '<button type="button" class="lg-comp" id="lgComp">Compartir al WhatsApp</button><div class="lg-comp-n">Se crea la imagen en tu móvil y eliges el grupo</div>' : '')
    + '<div class="lg-aviso">PR = rondas válidas.""")
cambia(L, """  body.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', ()=>{ ligaVerRegla = b.dataset.ver || null; ligaVer(l.code); }));""",
"""  body.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', ()=>{ ligaVerRegla = b.dataset.ver || null; ligaVer(l.code); }));
  const botComp = body.querySelector('#lgComp'); if(botComp) botComp.onclick = () => window.acgolfLigaCompartir && window.acgolfLigaCompartir();""")
EOF

# --- Rondas de 9 hoyos: 95 % del hándicap en juego individual (Federación) y «Dif. hcp» sobre 18 puntos ---
python3 - <<'EOF'
def cambia(p, a, b):
    s = open(p, encoding='utf-8').read()
    assert s.count(a) == 1, (p, a[:70])
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
P = 'pruebas/js/players.js'
cambia(P, "function hcpCampo(h, curso, barra){", "function hcpCampo(h, curso, barra, pct){ // pct: porcentaje (0.95 en 9 hoyos individual); se redondea una sola vez al final")
cambia(P, "return Math.round(v * mitad * d.slope / 113 + (d.rating * vueltas - par));", "return Math.round((v * mitad * d.slope / 113 + (d.rating * vueltas - par)) * (pct || 1));")
cambia(P, "const v = hcpCampo(h, null, barra);", "const c9 = (typeof selectedCourse !== 'undefined' ? selectedCourse : null);\n    const v = hcpCampo(h, null, barra, c9 && c9.nueve && modoPartida() === 'individual' ? 0.95 : undefined);")
cambia('pruebas/js/partida-rapida.js', "return typeof hcpCampo === 'function' ? hcpCampo(prHcp(n), campo, prBarra(n)) : Math.round(prHcp(n));", "return typeof hcpCampo === 'function' ? hcpCampo(prHcp(n), campo, prBarra(n), campo && campo.nueve && !prParejas() ? 0.95 : undefined) : Math.round(prHcp(n));")
L = 'pruebas/js/ligas.js'
cambia(L, "hcpCampo(hcp, curso, typeof barraDe === 'function' ? barraDe(g, i) : undefined)", "hcpCampo(hcp, curso, typeof barraDe === 'function' ? barraDe(g, i) : undefined, curso && curso.nueve ? 0.95 : undefined)")
cambia(L, "filas.push({ jugador: n, bruto, neto: bruto - recibidos, hcp, stb, cb });", "filas.push({ jugador: n, bruto, neto: bruto - recibidos, hcp, stb, cb, nH });")
cambia(L, "rs.push({ n: j.n, v: f.puntos, stb: f.stb, neto: f.neto, pos: f.pos })", "rs.push({ n: j.n, v: f.puntos, stb: f.stb, neto: f.neto, pos: f.pos, nH: f.nH || 18 })")
cambia(L, "dif: media == null ? null : media - 36,", "dif: stb.length ? rs.filter(x => x.stb != null).reduce((a, x) => a + x.stb - 2 * x.nH, 0) / stb.length : null,")
EOF

# --- Firmar la tarjeta: bloqueo hoyo a hoyo, pantalla grande de firma, cartel rojo en el Inicio (marcador.js v8, hoyo19.js v5) ---
python3 - <<'EOF'
p = 'pruebas/index.html'
s = open(p, encoding='utf-8').read()
for a, b in [('marcador.js?v=7', 'marcador.js?v=8'), ('hoyo19.js?v=4', 'hoyo19.js?v=5'),
             ('<link rel="stylesheet" href="liga-compartir.css?v=1">\n</head>', '<link rel="stylesheet" href="liga-compartir.css?v=1">\n<link rel="stylesheet" href="tarjeta-firma.css?v=1">\n</head>')]:
    assert s.count(a) == 1, a
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
EOF

# --- Hoyo 19: sin votación al mejor jugador (hoyo19-hilo.js v9) ---
python3 - <<'EOF'
p = 'pruebas/index.html'
s = open(p, encoding='utf-8').read()
assert s.count('hoyo19-hilo.js?v=8') == 1
open(p, 'w', encoding='utf-8').write(s.replace('hoyo19-hilo.js?v=8', 'hoyo19-hilo.js?v=9'))
EOF

# --- Lista del administrador de tarjetas sin cerrar (marcador.js v9, tarjeta-firma.css v2) ---
python3 - <<'EOF'
p = 'pruebas/index.html'
s = open(p, encoding='utf-8').read()
for a, b in [('marcador.js?v=8', 'marcador.js?v=12'), ('tarjeta-firma.css?v=1', 'tarjeta-firma.css?v=2')]:
    assert s.count(a) == 1, a
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
EOF
# --- La hora de salida de cada grupo se guarda en la partida (para el cartel «sales a las 08:40») ---
python3 - <<'EOF'
def cambia(p, a, b):
    s = open(p, encoding='utf-8').read()
    assert s.count(a) == 1, (p, a[:60])
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
cambia('pruebas/js/convocatoria.js', "      hoyoSalida: x.hoyo || undefined,\n", "      hoyoSalida: x.hoyo || undefined,\n      hora: (!x.hoyo && /^\\d{1,2}:\\d{2}$/.test(String(x.t || ''))) ? String(x.t) : undefined,\n")
cambia('pruebas/js/rondas-compartidas.js', "      return out;\n    });\n  }\n\n  function getLocalRoundHistory", "      if(g && /^\\d{1,2}:\\d{2}$/.test(String(g.hora || ''))) out.hora = String(g.hora); // hora de salida del grupo\n      return out;\n    });\n  }\n\n  function getLocalRoundHistory")
EOF
# --- Reforma del marcador: flechas grandes, cartel de grupo, hoja de golpes (marcador-reforma.js/.css) ---
python3 - <<'EOF'
p = 'pruebas/index.html'
s = open(p, encoding='utf-8').read()
assert s.count('</head>') == 1 and s.count('<div class="pr-banda">Pruebas</div>') == 1
s = s.replace('</head>', '<link rel="stylesheet" href="marcador-reforma.css?v=1">\n</head>', 1)
s = s.replace('<div class="pr-banda">Pruebas</div>', '<script src="marcador-reforma.js?v=1"></script>\n<div class="pr-banda">Pruebas</div>', 1)
open(p, 'w', encoding='utf-8').write(s)
EOF
# --- Mesa para elegir marcador, sin administrador (marcador-mesa.js/.css; marcador.js v13) ---
python3 - <<'EOF'
p = 'pruebas/index.html'
s = open(p, encoding='utf-8').read()
assert s.count('</head>') == 1 and s.count('<div class="pr-banda">Pruebas</div>') == 1 and s.count('marcador.js?v=12') == 1
s = s.replace('marcador.js?v=12', 'marcador.js?v=15')
s = s.replace('</head>', '<link rel="stylesheet" href="marcador-mesa.css?v=1">\n</head>', 1)
s = s.replace('<div class="pr-banda">Pruebas</div>', '<script src="marcador-mesa.js?v=1"></script>\n<div class="pr-banda">Pruebas</div>', 1)
s = s.replace('<div class="pr-banda">Pruebas</div>', '<script src="marcador-tarjeta.js?v=1"></script>\n<div class="pr-banda">Pruebas</div>', 1)
s = s.replace('marcador-reforma.css?v=1', 'marcador-reforma.css?v=4')
open(p, 'w', encoding='utf-8').write(s)
EOF

# --- «Me retiro» (marcador-retiro.js/.css) ---
python3 - <<'EOF'
p = 'pruebas/index.html'
s = open(p, encoding='utf-8').read()
assert s.count('</head>') == 1 and s.count('<div class="pr-banda">Pruebas</div>') == 1
s = s.replace('</head>', '<link rel="stylesheet" href="marcador-retiro.css?v=1">\n</head>', 1)
s = s.replace('<div class="pr-banda">Pruebas</div>', '<script src="marcador-retiro.js?v=1"></script>\n<div class="pr-banda">Pruebas</div>', 1)
assert s.count('marcador.js?v=15') == 1
s = s.replace('marcador.js?v=15', 'marcador.js?v=18')
assert s.count('marcador-reforma.css?v=4') == 1
s = s.replace('marcador-reforma.css?v=4', 'marcador-reforma.css?v=7')
open(p, 'w', encoding='utf-8').write(s)
EOF

# --- Textos entregar y nombres completos en la flecha de grupo (versiones nuevas) ---
python3 - <<'EOF'
p = 'pruebas/index.html'
s = open(p, encoding='utf-8').read()
for a, b in [('hoyo19.js?v=5', 'hoyo19.js?v=6'), ('styles.css?v=83', 'styles.css?v=84'), ('js/players.js?v=3410', 'js/players.js?v=3412')]:
    assert s.count(a) == 1, a
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
EOF

# --- Cada jugador ve solo su grupo (marcador-solo-grupo.js) ---
python3 - <<'EOF'
p = 'pruebas/index.html'
s = open(p, encoding='utf-8').read()
assert s.count('<div class="pr-banda">Pruebas</div>') == 1
s = s.replace('<div class="pr-banda">Pruebas</div>', '<script src="marcador-solo-grupo.js?v=1"></script>\n<div class="pr-banda">Pruebas</div>', 1)
open(p, 'w', encoding='utf-8').write(s)
EOF

# --- Hoyo 19: botón WhatsApp en las fotos (hoyo19-hilo.js v10, css v7) ---
python3 - <<'EOF'
p = 'pruebas/index.html'
s = open(p, encoding='utf-8').read()
for a, b in [('hoyo19-hilo.js?v=9', 'hoyo19-hilo.js?v=10'), ('hoyo19-hilo.css?v=6', 'hoyo19-hilo.css?v=7')]:
    assert s.count(a) == 1, a
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
EOF

# --- Norma de la Federación en los marcadores (auditoría 12-nov-2026) ---
#  · 95 % del hándicap de campo en juego individual (stroke play y Stableford), también en 18 hoyos (partidas desde el 13-nov-2026)
#  · Mejor bola 85 % / 90 % con UN solo redondeo; medio golpe exacto bien redondeado
#  · Match Play: el de menos golpes juega con cero y los demás reciben la diferencia
#  · Hándicap de juego negativo (plus): devuelve golpes en los hoyos más fáciles
#  · 9 hoyos en un campo sin slope: medio hándicap
python3 - <<'EOF'
def cambia(p, a, b):
    s = open(p, encoding='utf-8').read()
    assert s.count(a) == 1, (p, a[:70])
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
P = 'pruebas/js/players.js'
# 1) golpes por hoyo, también con hándicap de juego negativo
cambia(P, "if(isNaN(handicap) || handicap <= 0) return 0;\n    const h = Math.round(handicap);", "if(isNaN(handicap) || Math.round(handicap) === 0) return 0;\n    const h = Math.round(handicap);")
cambia(P, "    return Math.floor(h / base) + ((h % base) >= strokeIndex ? 1 : 0);", "    if(h < 0){ const a = -h; return -(Math.floor(a / base) + ((a % base) >= (base + 1 - strokeIndex) ? 1 : 0)); } // plus: devuelve golpes en los hoyos más fáciles\n    return Math.floor(h / base) + ((h % base) >= strokeIndex ? 1 : 0);")
# 2) hándicap de campo: un solo redondeo, medio golpe exacto, 9 hoyos sin slope
cambia(P, "if(!d || !Array.isArray(c.par)) return v;", "if(!d || !Array.isArray(c.par)) return v * (c && c.nueve ? 0.5 : 1) * (pct || 1); // sin datos del campo: el hándicap tal cual (en 9 hoyos, la mitad)")
cambia(P, "(d.rating * vueltas - par)) * (pct || 1));", "(d.rating * vueltas - par)) * (pct || 1) + 1e-9); // +1e-9: el medio golpe exacto sube, como en la base de datos")
# 3) porcentaje de cada modalidad (un solo sitio) y hándicap de juego
cambia(P, """  function ajusteHcp(h, barra){
    const c9 = (typeof selectedCourse !== 'undefined' ? selectedCourse : null);
    const v = hcpCampo(h, null, barra, c9 && c9.nueve && modoPartida() === 'individual' ? 0.95 : undefined);
    const f = factorHcpModo();
    return f === 1 ? v : Math.round(v * f * 10) / 10;
  }""", """  // Porcentaje del hándicap de campo (sin redondear) según la Federación: individual 95 % (stroke play y Stableford),
  // mejor bola 85 % (90 % en Match Play), Match Play individual 100 %. Parejas y Scramble traen ya sus golpes calculados.
  // En 18 hoyos el 95 % vale para las partidas desde el 13-nov-2026 (las anteriores se quedan como se jugaron).
  const DESDE_95_18 = '2026-11-13T00:00:00+01:00';
  function pctJuego(modo, scoring, nueve, fecha){
    modo = modo || 'individual';
    if(modo === 'fourball') return scoring === 'matchplay' ? 0.9 : 0.85;
    if(modo !== 'individual' || scoring === 'matchplay') return undefined;
    if(nueve) return 0.95;
    const t = fecha ? Date.parse(fecha) : NaN;
    return (isNaN(t) || t >= Date.parse(DESDE_95_18)) ? 0.95 : undefined;
  }
  function ajusteHcp(h, barra){
    const c9 = (typeof selectedCourse !== 'undefined' ? selectedCourse : null);
    return hcpCampo(h, null, barra, pctJuego(modoPartida(), typeof scoringType !== 'undefined' ? scoringType : undefined, !!(c9 && c9.nueve), window.acgolfRondaCreada));
  }""")
cambia(P, """    return ajusteHcp(playerHandicaps[pIndex], barraDe(g, pIndex));
  }""", """    let v = ajusteHcp(playerHandicaps[pIndex], barraDe(g, pIndex));
    // Match Play: el de menos golpes juega con cero y los demás reciben la diferencia (en los hoyos más difíciles)
    if(g && typeof scoringType !== 'undefined' && scoringType === 'matchplay'){
      const todos = (playerHandicaps || []).map((hh, i) => (g.players && g.players[i]) ? ajusteHcp(hh, barraDe(g, i)) : null).filter(x => x != null);
      if(todos.length > 1) v -= Math.min.apply(null, todos);
    }
    return v;
  }""")
# 4) fecha de la partida (para el 95 % en 18 hoyos): una partida nueva vale hoy; una abierta con código, su fecha
cambia('pruebas/js/interactions.js', "    currentRoundId = null; // ronda nueva: cortar cualquier guardado que aún apunte a la partida anterior", "    currentRoundId = null; // ronda nueva: cortar cualquier guardado que aún apunte a la partida anterior\n    window.acgolfRondaCreada = null;")
cambia('pruebas/js/rondas-compartidas.js', "      currentRoundId = data.id;\n      leagueHandicapUpdateScheduled = false; // ronda distinta", "      currentRoundId = data.id;\n      window.acgolfRondaCreada = data.created_at || null;\n      leagueHandicapUpdateScheduled = false; // ronda distinta")
# 5) lo que enseña cada pantalla: golpes que da el hándicap (también negativos) sin recortar a 0
T = 'pruebas/js/tarjetas.js'
cambia(T, "const rec = isNaN(si) ? 0 : Math.max(0, strokesForHole(hcp, si));", "const rec = isNaN(si) ? 0 : strokesForHole(hcp, si);")
cambia(T, "const rec = Math.max(0, strokesForHole(hcpJuego(pIndex), parseInt(inp.dataset.strokeIndex, 10)));", "const rec = strokesForHole(hcpJuego(pIndex), parseInt(inp.dataset.strokeIndex, 10));")
cambia('pruebas/js/vista-hoyo.js', "par: par, tuPar: par != null ? par + Math.max(0, recibidos) : null,", "par: par, tuPar: par != null ? par + recibidos : null,")
cambia('pruebas/js/tarjeta-blanca.js', "try { return Math.max(0, strokesForHole(hcpJ, si)); } catch(e){ return 0; }", "try { return strokesForHole(hcpJ, si); } catch(e){ return 0; }")
# 6) pantallas que calculaban su propio hándicap de juego
cambia('pruebas/js/partida-rapida.js', "campo && campo.nueve && !prParejas() ? 0.95 : undefined)", "pctJuego(modoDesdeTexto(prModal), prPunt, !!(campo && campo.nueve)))")
L = 'pruebas/js/ligas.js'
cambia(L, "select('code, course_id, match_groups').in('code', rc)", "select('code, course_id, match_groups, scoring_type, created_at').in('code', rc)")
cambia(L, "curso && curso.nueve ? 0.95 : undefined)", "pctJuego((g && g.modo) || 'individual', (r && r.scoring_type) || 'stableford', !!(curso && curso.nueve), r && r.created_at))")
# 7) texto de ayuda
cambia('pruebas/js/handicap.js', "tu hándicap × slope ÷ 113 + (rating − par)", "tu hándicap × slope ÷ 113 + (rating − par), y en juego individual el 95 % de eso (norma de la Federación)")
EOF
python3 - <<'EOF'
def cambia(p, a, b):
    s = open(p, encoding='utf-8').read()
    assert s.count(a) == 1, (p, a[:70])
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
E = 'pruebas/en-vivo.js'
cambia(E, "if(typeof hcpCampo === 'function') return hcpCampo(h, c, barra, nHoyos(g) === 9 && (!g.modo || g.modo === 'individual') ? 0.95 : undefined); // 9 hoyos individual: 95 % (Federación)",
          "if(typeof hcpCampo === 'function') return Math.round(hcpCampo(h, c, barra, typeof pctJuego === 'function' ? pctJuego(g.modo || 'individual', round.scoring_type, nHoyos(g) === 9, round.created_at) : undefined) + 1e-9); // % de la Federación según la modalidad")
cambia(E, "rec = nHoyos(g) === 9 ? Math.floor(hc / 9) + ((hc % 9) >= (si[h - 1] || 9) ? 1 : 0) : golpesRegalo(hc, si[h - 1] || 18), diff",
          "rec = recibeEV(hc, si[h - 1] || nHoyos(g), nHoyos(g)), diff")
cambia(E, "  function hcpDe(round, g, p, pares){", """  // Golpes que recibe un hándicap de juego en un hoyo de dificultad «si» entre n hoyos (también negativos: plus)
  function recibeEV(hc, si, n){
    hc = Math.round(Number(hc) || 0); if(!hc) return 0;
    if(hc < 0){ const a = -hc; return -(Math.floor(a / n) + ((a % n) >= (n + 1 - si) ? 1 : 0)); }
    return Math.floor(hc / n) + ((hc % n) >= si ? 1 : 0);
  }
  function hcpDe(round, g, p, pares){""")
R = 'pruebas/ryder.js'
cambia(R, ": d.tipo === 'fourball' ? Math.round(hc(b.hcp) * 0.9) : hc(b.hcp);", ": d.tipo === 'fourball' ? (typeof hcpCampo === 'function' ? hcpCampo(b.hcp == null ? 0 : b.hcp, campo, BARRA, 0.9) : Math.round(hc(b.hcp) * 0.9)) : hc(b.hcp);")
EOF
# --- Pantalla «Mi hándicap»: revisión como la Federación (tabla de pocas tarjetas, limitación y tope) ---
python3 - <<'EOF'
p = 'pruebas/js/handicap.js'
s = open(p, encoding='utf-8').read()
def cambia(a, b):
    global s
    assert s.count(a) == 1, a[:80]
    s = s.replace(a, b)

cambia("""    const casillas = tarjetas.map(x => ({ d: Number(x.diferencial), tipo: 'tarjeta', t: x }));
    while(casillas.length < 20) casillas.push({ d: base, tipo: 'salida' });
    const orden = casillas.map((c, i) => ({ i, d: c.d })).sort((a, b) => a.d - b.d);
    const mejores = new Set(orden.slice(0, 8).map(x => x.i));
    const media = orden.slice(0, 8).reduce((s, x) => s + x.d, 0) / 8;
    const corte = orden[7].d; // la peor de las 8 que cuentan: para bajar hay que mejorarla
    const hist = hcpHistorial(jug.name);
    const ultimo = hist[hist.length - 1] || null;
    return { jug, base, casillas, mejores, media, corte, hist, ultimo, n: tarjetas.length, tarjetas };""",
"""    const casillas = tarjetas.map(x => ({ d: Number(x.diferencial), tipo: 'tarjeta', t: x }));
    const n = casillas.length;
    // Tabla de la Federación para pocas tarjetas: cuántas se cogen (k) y el ajuste (aj). Con menos de 3 no se revisa.
    const k = n < 3 ? 0 : n <= 5 ? 1 : n <= 8 ? 2 : n <= 11 ? 3 : n <= 14 ? 4 : n <= 16 ? 5 : n <= 18 ? 6 : n === 19 ? 7 : 8;
    const aj = n === 3 ? -2 : (n === 4 || n === 6) ? -1 : 0;
    while(casillas.length < 20) casillas.push({ d: null, tipo: 'vacia' });
    const orden = casillas.map((c, i) => ({ i, d: c.d })).filter(x => x.d != null).sort((a, b) => a.d - b.d);
    const mejores = new Set(orden.slice(0, k).map(x => x.i));
    const media = k ? orden.slice(0, k).reduce((s, x) => s + x.d, 0) / k + aj : null;   // cuenta base
    const corte = k ? orden[k - 1].d : null; // la peor de las que cuentan: para bajar hay que mejorarla
    const hist = hcpHistorial(jug.name);
    const ultimo = hist[hist.length - 1] || null;
    // Hándicap más bajo de los últimos 12 meses (igual que la base de datos: salida, actual e historial)
    const hace = Date.now() - 365 * 864e5;
    let bajo = Math.min(Number(jug.hcp), base);
    hcpDatos.historial.filter(x => hClave(x.player_name) === hClave(jug.name) && new Date(x.cambiado_en).getTime() >= hace).forEach(x => { bajo = Math.min(bajo, Number(x.hcp_despues)); });
    return { jug, base, casillas, mejores, media, corte, hist, ultimo, n, tarjetas, k, aj, bajo };""")

cambia("""      + '<div class="hp-expl">Se miran tus <b>últimas 20 tarjetas</b> de la liga. Llevas <b>' + c.n + '</b>; las ' + (20 - c.n) + ' que faltan cuentan como tu hándicap de salida (' + hNum(c.base) + '). De las 20 se cogen las <b>8 mejores</b> (en verde) y se hace la media.</div>'""",
"""      + '<div class="hp-expl">' + (c.n < 3
          ? 'Llevas <b>' + c.n + '</b> tarjetas. Hasta tener <b>3</b> tu hándicap se queda como está (' + hNum(c.jug.hcp) + '). Después se revisa como lo hace la Federación.'
          : 'Se miran tus <b>últimas 20 tarjetas</b> de la app. Llevas <b>' + c.n + '</b>. ' + (c.n < 20
              ? 'Con ' + c.n + ' la Federación coge las <b>' + c.k + ' mejores</b> (en verde), hace la media' + (c.aj ? ' y ' + (c.aj < 0 ? 'resta <b>' + (-c.aj) + '</b>' : 'suma <b>' + c.aj + '</b>') : '') + '.'
              : 'Se cogen las <b>8 mejores</b> (en verde) y se hace la media.')) + '</div>'""")

cambia("(x.tipo === 'tarjeta' ? hFecha(x.t.played_at) : 'salida') + '</small></div>'", "(x.tipo === 'tarjeta' ? hFecha(x.t.played_at) : '') + '</small></div>'")

cambia("""      + '<div class="hp-suma">Media de las 8 mejores = <b>' + hNum(c.media) + '</b></div>'""",
"""      + (c.media == null ? '' : '<div class="hp-suma">Media de las ' + c.k + ' mejores' + (c.aj ? (c.aj < 0 ? ' − ' + (-c.aj) : ' + ' + c.aj) : '') + ' = <b>' + hNum(c.media) + '</b></div>')
      + (c.media == null ? '' : hcpFreno(c))""")

cambia("""      + '<div class="hp-sec-t">Para bajar tu hándicap</div>'
      + '<div class="hp-expl">Necesitas una tarjeta mejor que la peor de tus 8 que cuentan (' + hNum(c.corte) + '). En golpes, más o menos:</div>'
      + '<div class="hp-objs">' + objetivo + '</div>'
      + '<div class="hp-nota">Son golpes «ajustados»: en cada hoyo, como mucho cuenta doble bogey más tus golpes de regalo.</div>'""",
"""      + (c.corte == null ? '' : '<div class="hp-sec-t">Para bajar tu hándicap</div>'
      + '<div class="hp-expl">Necesitas una tarjeta mejor que la peor de las que cuentan (' + hNum(c.corte) + '). En golpes, más o menos:</div>'
      + '<div class="hp-objs">' + objetivo + '</div>'
      + '<div class="hp-nota">Son golpes «ajustados»: en cada hoyo, como mucho cuenta doble bogey más tus golpes de regalo.</div>')""")

cambia("""'<li><b>Tu hándicap.</b> La media de tus 8 mejores diferenciales de las últimas 20 tarjetas. Se recalcula solo después de cada partida y nadie puede tocarlo a mano.</li>'""",
"""'<li><b>Tu hándicap.</b> La media de tus 8 mejores diferenciales de las últimas 20 tarjetas. Con menos tarjetas se cogen menos (con 3, la mejor menos 2; con 6, las 2 mejores menos 1; con 8, las 2 mejores; con 12, las 4 mejores…). Para esto tus golpes se cuentan con el hándicap completo (100 %), aunque se juegue al 95 %. Se recalcula solo después de cada partida y nadie puede tocarlo a mano.</li>'
      + '<li><b>El freno.</b> Tu hándicap no puede subir de golpe: si la cuenta sale más de 3 sobre tu hándicap más bajo del último año, lo que pasa de 3 cuenta la mitad, y nunca más de 5 por encima. Mientras tengas menos de 20 tarjetas, además, tu hándicap no baja más de 1 punto cada vez, para que el cambio sea poco a poco.</li>'""")

cambia("  function hcpPintar(){", """  // Cuadro «Freno de la Federación»: limitación (+3 la mitad) y tope (+5)
  function hcpFreno(c){
    const f = (a, b, t) => '<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid #2a2e33' + (t ? ';color:#C6F24E;font-weight:800' : '') + '"><span style="' + (t ? '' : 'color:#9AA3AB') + '">' + a + '</span><b style="white-space:nowrap">' + b + '</b></div>';
    const sube = c.media > c.bajo + 3;
    const tras = sube ? Math.min(c.bajo + 3 + (c.media - c.bajo - 3) / 2, c.bajo + 5) : c.media;
    return '<div class="hp-sec-t">Freno de la Federación</div><div style="background:#1B1E22;border:1px solid ' + (sube ? '#4A5058' : '#33383E') + ';border-radius:16px;padding:8px 14px;font-size:15px">'
      + f('Tu hándicap más bajo del último año', hNum(c.bajo))
      + (sube
          ? f('Cuenta base (la media de arriba)', hNum(c.media)) + f('Sobre tu más bajo', '+' + hNum(c.media - c.bajo)) + f('Los primeros 3 cuentan enteros', hNum(c.bajo + 3))
            + f('Lo que pasa de 3 cuenta la mitad', '+' + hNum((c.media - c.bajo - 3) / 2)) + f('Tope (tu más bajo + 5)', hNum(c.bajo + 5)) + f('Resultado', hNum(tras), true)
          : '<div style="padding:6px 0 2px;color:#C6F24E">No se aplica el freno: tu número no sube más de 3 sobre tu más bajo.</div>')
      + (c.n < 20 && Math.abs(tras - Number(c.jug.hcp)) >= 0.05
          ? f('Resultado de la Federación', hNum(tras)) + '<div style="padding:6px 0 2px;color:#9AA3AB">Mientras tengas menos de 20 tarjetas, tu hándicap no baja más de 1 punto cada vez. Va hacia ese número poco a poco.</div>' : '')
      + '</div>';
  }

  function hcpPintar(){""")

cambia("// Regla: últimas 20 tarjetas; si hay menos, las que faltan cuentan como el hándicap de salida; media de las 8 mejores.",
       "// Regla de la Federación: últimas 20 tarjetas; si hay menos, las que haya (tabla de pocas tarjetas); limitación +3 y tope +5 sobre el más bajo del año.")
open(p, 'w', encoding='utf-8').write(s)
EOF
# --- Versiones nuevas para que los móviles cojan los cambios de la norma de la Federación ---
python3 - <<'EOF'
import re
p = 'pruebas/index.html'
s = open(p, encoding='utf-8').read()
for f in ['js/players.js', 'js/tarjetas.js', 'js/vista-hoyo.js', 'js/tarjeta-blanca.js', 'js/partida-rapida.js', 'js/ligas.js', 'js/handicap.js', 'js/interactions.js', 'js/rondas-compartidas.js', 'en-vivo.js', 'ryder.js']:
    rx = re.compile('(' + re.escape(f) + r'\?v=)(\d+)')
    assert len(rx.findall(s)) == 1, f
    s = rx.sub(lambda m: m.group(1) + str(int(m.group(2)) + 1), s)
# Revisión del hándicap como la Federación (13-nov-2026): una versión más para que los móviles recarguen la pantalla «Mi hándicap»
rx = re.compile(r'(js/handicap\.js\?v=)(\d+)')
s = rx.sub(lambda m: m.group(1) + str(int(m.group(2)) + 3), s)
open(p, 'w', encoding='utf-8').write(s)
EOF
