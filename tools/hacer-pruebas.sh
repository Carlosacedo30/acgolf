#!/usr/bin/env bash
# © 2026 Carlos Acedo Domínguez. Todos los derechos reservados.
# Genera la versión de pruebas (carpeta pruebas/) a partir de la app de la liga + lo de pruebas-src/.
# La app de la liga no se modifica: solo se lee.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf pruebas
mkdir pruebas
for f in *; do
  case "$f" in pruebas|pruebas-src|tools|README.md|LICENSE|app-golf-movil.html) continue ;; esac
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

# index.html: almacén separado, cuentas y banda de "VERSIÓN DE PRUEBAS"
python3 - <<'EOF'
import re
p = 'pruebas/index.html'
s = open(p, encoding='utf-8').read()
s = s.replace('<title>App de Golf</title>', '<title>App de Golf · PRUEBAS</title>\n<meta name="robots" content="noindex">\n<script src="almacen.js?v=1"></script>', 1)
s = s.replace('</head>', '<link rel="stylesheet" href="cuenta.css?v=8">\n</head>', 1)
s = re.sub(r'(<script src="js/rondas-compartidas\.js\?v=\d+"></script>)', r'\1\n<script src="portada.js?v=1"></script>\n<script src="cuenta.js?v=5"></script>', s, count=1)
s = s.replace('</body>', '<script src="cuenta-ajustes.js?v=1"></script>\n<script src="grupos.js?v=1"></script>\n<script src="marcador.js?v=1"></script>\n<script src="enlace-partida.js?v=2"></script>\n<script src="aviso-partida.js?v=2"></script>\n<div class="pr-banda">Pruebas</div>\n</body>', 1)
assert 'js/ligas.js' in s and 'cuenta-ajustes.js' in s and 'cuenta.js' in s and 'almacen.js' in s and 'grupos.js' in s
open(p, 'w', encoding='utf-8').write(s)
m = 'pruebas/manifest.json'
t = open(m, encoding='utf-8').read().replace('"App de Golf"', '"App de Golf · PRUEBAS"').replace('"App Golf"', '"Golf PRUEBAS"')
open(m, 'w', encoding='utf-8').write(t)
EOF
echo "Versión de pruebas generada en pruebas/"
