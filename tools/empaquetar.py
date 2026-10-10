#!/usr/bin/env python3
# © 2026 Carlos Acedo Domínguez. Todos los derechos reservados.
# Empaqueta la web para que cargue rápido con mala cobertura:
#  - junta todos los .css propios en uno y todos los .js propios del final en otro (en el mismo orden),
#  - los comprime con esbuild (sin cambiar nombres de variables),
#  - la librería de Supabase y el paquete se cargan con «defer» (no bloquean el primer dibujo),
#  - pone una pantalla de «Cargando» que se ve al instante,
#  - deja la lista de archivos para que el service worker los guarde en el móvil.
# Uso: empaquetar.py CARPETA_WEB
import hashlib, os, re, subprocess, sys

DEST = sys.argv[1]
ESBUILD = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'node_modules', '.bin', 'esbuild')
html_path = os.path.join(DEST, 'index.html')
html = open(html_path, encoding='utf-8').read()

def local(ref):
    return not re.match(r'https?://', ref)

def leer(ref):
    return open(os.path.join(DEST, ref.split('?')[0]), encoding='utf-8').read()

def comprimir(codigo, loader):
    args = [ESBUILD, '--loader=' + loader, '--log-level=error']
    args += ['--minify'] if loader == 'css' else ['--minify-whitespace', '--minify-syntax', '--charset=utf8']
    r = subprocess.run(args, input=codigo.encode('utf-8'), capture_output=True)
    if r.returncode != 0:
        sys.exit('ERROR al comprimir: ' + r.stderr.decode())
    return r.stdout.decode('utf-8')

def guardar(nombre_base, ext, contenido):
    h = hashlib.sha256(contenido.encode('utf-8')).hexdigest()[:10]
    nombre = f'{nombre_base}-{h}.{ext}'
    open(os.path.join(DEST, nombre), 'w', encoding='utf-8').write(contenido)
    return nombre

# ---- CSS propio: uno solo, en el sitio del primero ----
css_tags = re.findall(r'<link rel="stylesheet" href="([^"]+)">\n?', html)
css_locales = [h for h in css_tags if local(h)]
css = '\n'.join(leer(h) for h in css_locales)
css_nombre = guardar('app', 'css', comprimir(css, 'css'))
primero = True
for h in css_locales:
    tag = f'<link rel="stylesheet" href="{h}">'
    html = html.replace(tag, f'<link rel="stylesheet" href="{css_nombre}">' if primero else '', 1)
    primero = False
# Las fuentes de Google no deben frenar el primer dibujo
html = re.sub(r'<link (rel="stylesheet" )?href="(https://fonts\.googleapis\.com/css2[^"]+)"( rel="stylesheet")?>',
              lambda m: '<link rel="stylesheet" href="' + m.group(2) + '" media="print" onload="this.media=\'all\'">', html)

# ---- JS del final: un solo archivo, pero cada pieza se ejecuta por separado y en orden,
#      exactamente igual que cuando eran archivos sueltos (mismas variables, mismos errores aislados) ----
import json
js_tags = re.findall(r'<script src="([^"]+)"></script>', html)
cabeza = html.index('</head>')
js_cuerpo = [s for s in js_tags if local(s) and html.index(f'<script src="{s}"></script>') > cabeza]
piezas = []
for s in js_cuerpo:
    piezas.append(comprimir(leer(s), 'js') + '\n//# sourceURL=' + s.split('?')[0])
js = ('(function(p){for(var i=0;i<p.length;i++){var s=document.createElement("script");s.text=p[i];document.head.appendChild(s);}'
      'var a=document.getElementById("arranque");if(a)a.remove();})(' + json.dumps(piezas, ensure_ascii=False) + ');\n')
js_nombre = guardar('app', 'js', js)
for i, s in enumerate(js_cuerpo):
    tag = f'<script src="{s}"></script>'
    html = html.replace(tag, f'<script src="{js_nombre}" defer></script>' if i == len(js_cuerpo) - 1 else '', 1)

# La librería de Supabase tampoco bloquea: defer (se ejecuta antes que el paquete, en orden)
html = re.sub(r'(<script src="https://cdn\.jsdelivr\.net/npm/@supabase/[^"]+"[^>]*?)(\s*)></script>', r'\1 defer></script>', html, count=1)

# ---- Pantalla de «Cargando» instantánea (sin depender de nada) ----
arranque = ('<div id="arranque" style="position:fixed;inset:0;z-index:9998;background:#111316;display:flex;flex-direction:column;'
            'align-items:center;justify-content:center;gap:14px;font:700 17px system-ui,sans-serif;color:#9AA3AB">'
            '<img src="icon-192.png" alt="" width="84" height="84" style="border-radius:20px">Cargando acgolf…</div>')
html = html.replace('<body>', '<body>\n' + arranque, 1)

# Líneas vacías que quedan donde estaban las etiquetas
html = re.sub(r'\n{3,}', '\n\n', html)
open(html_path, 'w', encoding='utf-8').write(html)

# ---- Lista para el service worker ----
precache = ['/', '/index.html', '/' + css_nombre, '/' + js_nombre, '/manifest.json', '/icon-192.png', '/icon-512.png', '/instalar.html']
precache += ['/' + s.split('?')[0] for s in js_tags if local(s) and s not in js_cuerpo]
sw_path = os.path.join(DEST, 'sw.js')
sw = open(sw_path, encoding='utf-8').read().replace('__PRECACHE__', repr(precache).replace("'", '"'))
sw = sw.replace('__VERSION__', hashlib.sha256((css_nombre + js_nombre).encode()).hexdigest()[:8])
open(sw_path, 'w', encoding='utf-8').write(sw)

# Ya no hacen falta los sueltos
for ref in css_locales + js_cuerpo:
    p = os.path.join(DEST, ref.split('?')[0])
    if os.path.exists(p): os.remove(p)
print(f'Empaquetado: {len(css_locales)} css -> {css_nombre}, {len(js_cuerpo)} js -> {js_nombre}')
