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

# index.html: almacén separado, cuentas y banda de "VERSIÓN DE PRUEBAS"
python3 - <<'EOF'
import re
p = 'pruebas/index.html'
s = open(p, encoding='utf-8').read()
s = s.replace('<title>App de Golf</title>', '<title>App de Golf · PRUEBAS</title>\n<meta name="robots" content="noindex">\n<script src="almacen.js?v=1"></script>\n<script>window.acgolfBarras = true; /* elegir barra de salida de cada jugador */</script>', 1)
s = s.replace('</head>', '<link rel="stylesheet" href="cuenta.css?v=15">\n<link rel="stylesheet" href="avatares.css?v=1">\n<link rel="stylesheet" href="ryder.css?v=1">\n<link rel="stylesheet" href="contador.css?v=1">\n<link rel="stylesheet" href="faltan-tarjeta.css?v=1">\n<link rel="stylesheet" href="navegacion.css?v=1">\n<link rel="stylesheet" href="inicio-partido.css?v=1">\n<link rel="stylesheet" href="manual.css?v=1">\n<link rel="stylesheet" href="scramble.css?v=1">\n<link rel="stylesheet" href="salon.css?v=2">\n<link rel="stylesheet" href="ver-completa.css?v=1">\n</head>', 1)
s = re.sub(r'(<script src="js/rondas-compartidas\.js\?v=\d+"></script>)', r'\1\n<script src="portada.js?v=6"></script>\n<script src="cuenta.js?v=15"></script>', s, count=1)
# La pantalla blanca y el resumen tienen que ir DESPUÉS del marcador: se quitan de su sitio y se ponen tras él
# El aviso «ahora es acgolf.es» solo va en la app antigua de la liga
s = re.sub(r'<script src="js/aviso-acgolf\.js\?v=\d+"></script>\n', '', s)
s = re.sub(r'<script src="js/(tarjeta-blanca|resumen-jugador)\.js\?v=\d+"></script>\n', '', s)
s = s.replace('</body>', '<script src="cuenta-ajustes.js?v=1"></script>\n<script src="grupos.js?v=1"></script>\n<script src="marcador.js?v=3"></script>\n<script src="js/tarjeta-blanca.js?v=2"></script>\n<script src="js/resumen-jugador.js?v=2"></script>\n<script src="enlace-partida.js?v=2"></script>\n<script src="aviso-partida.js?v=3"></script>\n<script src="avatares.js?v=1"></script>\n<script src="reserva-club.js?v=1"></script>\n<script src="ryder.js?v=1"></script>\n<script src="contador.js?v=1"></script>\n<script src="faltan-tarjeta.js?v=1"></script>\n<script src="patro-cuenta.js?v=1"></script>\n<script src="navegacion.js?v=2"></script>\n<script src="ganadores.js?v=1"></script>\n<script src="inicio-partido.js?v=2"></script>\n<script src="manual.js?v=2"></script>\n<script src="scramble.js?v=2"></script>\n<script src="salon.js?v=1"></script>\n<script src="ver-completa.js?v=2"></script>\n<div class="pr-banda">Pruebas</div>\n</body>', 1)
assert 'js/ligas.js' in s and 'cuenta-ajustes.js' in s and 'cuenta.js' in s and 'almacen.js' in s and 'grupos.js' in s and 'avatares.js' in s and 'avatares.css' in s and 'reserva-club.js' in s and 'ryder.js' in s and 'ryder.css' in s and 'contador.js' in s and 'contador.css' in s and 'faltan-tarjeta.js' in s and 'faltan-tarjeta.css' in s and 'patro-cuenta.js' in s and 'navegacion.js' in s and 'navegacion.css' in s and 'ganadores.js' in s and 'inicio-partido.js' in s and 'inicio-partido.css' in s and 'manual.js' in s and 'manual.css' in s and 'scramble.js' in s and 'scramble.css' in s and 'salon.js' in s and 'ver-completa.js' in s and 'salon.css' in s
open(p, 'w', encoding='utf-8').write(s)
m = 'pruebas/manifest.json'
t = open(m, encoding='utf-8').read().replace('"App de Golf"', '"App de Golf · PRUEBAS"').replace('"App Golf"', '"Golf PRUEBAS"')
open(m, 'w', encoding='utf-8').write(t)
EOF
echo "Versión de pruebas generada en pruebas/"
