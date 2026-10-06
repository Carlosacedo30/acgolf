#!/usr/bin/env bash
# © 2026 Carlos Acedo Domínguez. Todos los derechos reservados.
# Genera la web de acgolf.es (repositorio acgolf-app) a partir de la versión de pruebas.
# La app de la liga no se toca.
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="${1:-../acgolf-app}"
bash tools/hacer-pruebas.sh >/dev/null
[ -d "$DEST/.git" ] || { echo "ERROR: no encuentro el repositorio acgolf-app en $DEST"; exit 1; }
find "$DEST" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R pruebas/. "$DEST/"
cp acgolf-es/manifest.json acgolf-es/sw.js acgolf-es/instalar.js acgolf-es/instalar.css acgolf-es/icon-*.png "$DEST/"
echo "acgolf.es" > "$DEST/CNAME"
touch "$DEST/.nojekyll"
# Las direcciones de pruebas pasan a ser acgolf.es
grep -rl "carlosacedo30.github.io/acgolf/pruebas/" "$DEST" --include=*.js --include=*.html | xargs -r sed -i "s#https://carlosacedo30.github.io/acgolf/pruebas/#https://acgolf.es/#g"
python3 - "$DEST/index.html" <<'PY'
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
s = s.replace('<title>App de Golf · PRUEBAS</title>', '<title>acgolf</title>', 1)
s = s.replace('<meta name="apple-mobile-web-app-title" content="App Golf">', '<meta name="apple-mobile-web-app-title" content="acgolf">', 1)
s = s.replace('<meta name="theme-color" content="#0E1F3D">', '<meta name="theme-color" content="#111316">', 1)
s = s.replace('<link rel="apple-touch-icon" href="icon-180.png">', '<link rel="apple-touch-icon" href="icon-180.png?v=2">\n<link rel="icon" href="icon-192.png" type="image/png">', 1)
s = s.replace('</head>', '<link rel="stylesheet" href="instalar.css?v=2">\n<script src="instalar.js?v=2"></script>\n</head>', 1)
assert 'instalar.js' in s and '<title>acgolf</title>' in s
open(p, 'w', encoding='utf-8').write(s)
PY
grep -rq "carlosacedo30.github.io/acgolf/pruebas" "$DEST" --include=*.js && { echo "ERROR: quedan direcciones antiguas"; exit 1; }
echo "Web de acgolf.es generada en $DEST"
