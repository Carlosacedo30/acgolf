#!/usr/bin/env bash
# © 2026 Carlos Acedo Domínguez. Todos los derechos reservados.
# Genera la web de acgolf.es (repositorio acgolf-app) a partir de la versión de pruebas.
# La app de la liga no se toca.
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="${1:-../acgolf-app}"
bash tools/hacer-pruebas.sh >/dev/null
[ -d "$DEST/.git" ] || { echo "ERROR: no encuentro el repositorio acgolf-app en $DEST"; exit 1; }
find "$DEST" -mindepth 1 -maxdepth 1 ! -name .git ! -name .github ! -name .gitignore ! -name .gitleaks.toml ! -name reels -exec rm -rf {} +
cp -R pruebas/. "$DEST/"
cp acgolf-es/manifest.json acgolf-es/sw.js acgolf-es/instalar.js acgolf-es/instalar.css acgolf-es/instalar.html acgolf-es/app-golf.html acgolf-es/pantalla-*.webp acgolf-es/og-acgolf.jpg acgolf-es/icon-*.png acgolf-es/video.mp4 acgolf-es/robots.txt acgolf-es/sitemap.xml acgolf-es/google*.html "$DEST/"
echo "acgolf.es" > "$DEST/CNAME"
touch "$DEST/.nojekyll"
# Las direcciones de pruebas pasan a ser acgolf.es
grep -rl "carlosacedo30.github.io/acgolf/pruebas/" "$DEST" --include=*.js --include=*.html | xargs -r sed -i "s#https://carlosacedo30.github.io/acgolf/pruebas/#https://acgolf.es/#g"
python3 - "$DEST/index.html" <<'PY'
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
s = s.replace('<title>App de Golf · PRUEBAS</title>\n<meta name="robots" content="noindex">', '''<title>acgolf · App de golf gratis para jugar con amigos: tarjeta, hándicap y liga</title>
<meta name="description" content="App de golf gratis para el móvil: apunta la tarjeta hoyo a hoyo, calcula hándicap y Stableford, organiza partidos y lleva la liga de tu grupo de amigos. Instálala gratis en tu móvil.">
<link rel="canonical" href="https://acgolf.es/">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<meta property="og:site_name" content="acgolf">
<meta property="og:title" content="acgolf · App de golf gratis para jugar con amigos">
<meta property="og:description" content="Tarjeta hoyo a hoyo, hándicap, Stableford, liga del grupo y Curro, el caddie andaluz que comenta cada hoyo.">
<meta property="og:url" content="https://acgolf.es/">
<meta property="og:image" content="https://acgolf.es/og-acgolf.jpg">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"acgolf","url":"https://acgolf.es/","applicationCategory":"SportsApplication","operatingSystem":"iPhone, Android, ordenador (navegador)","inLanguage":"es","description":"App de golf gratis para jugar con amigos: tarjeta hoyo a hoyo, hándicap de juego, Stableford, liga del grupo y estadísticas.","offers":{"@type":"Offer","price":"0","priceCurrency":"EUR"},"image":"https://acgolf.es/icon-512.png"}</script>''', 1)  # acgolf.es SÍ debe salir en Google (el noindex es solo para pruebas)
s = s.replace('<body>', '<body>\n<noscript><p><a href="app-golf.html">acgolf: app de golf gratis para jugar con amigos</a></p></noscript>', 1)
s = s.replace('<div class="pr-banda">Pruebas</div>\n', '', 1)  # en acgolf.es no sale el cartel de PRUEBAS
s = s.replace('<meta name="apple-mobile-web-app-title" content="App Golf">', '<meta name="apple-mobile-web-app-title" content="acgolf">', 1)
s = s.replace('<meta name="theme-color" content="#0E1F3D">', '<meta name="theme-color" content="#111316">', 1)
s = s.replace('<link rel="apple-touch-icon" href="icon-180.png">', '<link rel="apple-touch-icon" href="icon-180.png?v=3">\n<link rel="icon" href="icon-192.png" type="image/png">', 1)
s = s.replace('</head>', '<link rel="stylesheet" href="instalar.css?v=4">\n<script src="instalar.js?v=3"></script>\n</head>', 1)
assert 'instalar.js' in s and 'noindex' not in s and 'rel="canonical"' in s and 'pr-banda' not in s
open(p, 'w', encoding='utf-8').write(s)
PY
grep -rq "carlosacedo30.github.io/acgolf/pruebas" "$DEST" --include=*.js && { echo "ERROR: quedan direcciones antiguas"; exit 1; }
# Empaquetar para que cargue rápido con mala cobertura (esbuild se instala la primera vez)
[ -x tools/node_modules/.bin/esbuild ] || npm install --silent --prefix tools esbuild@0.24.2 >/dev/null
python3 tools/empaquetar.py "$DEST"
node --check "$DEST"/app-*.js || { echo "ERROR: el paquete de código no es válido"; exit 1; }
echo "Web de acgolf.es generada en $DEST"
