#!/usr/bin/env python3
# Cambia los carteles del navegador confirm(...) por el aviso del diseño nuevo (acgolfConfirmar) en la copia de pruebas.
# Convierte `confirm(` en `await acgolfConfirmar(` y pone `async` a la función que lo contiene. Después se comprueba la sintaxis.
import re, sys, glob, subprocess, os
SALTAR = ('idioma-en', 'confirmar-nuevo', 'reserva-club')   # reserva-club necesita el cartel síncrono (preventDefault)
PAT = re.compile(r'(?<![.\w$])confirm\(')
def func_abierta(s, i):
    """Posición de la '{' de la función que contiene la posición i, y si ya es async."""
    prof = 0; j = i
    while j > 0:
        j -= 1; c = s[j]
        if c == '}': prof += 1
        elif c == '{':
            if prof: prof -= 1
            else:
                previo = s[max(0, j - 160):j]
                m = re.search(r'(async\s+)?function\s*[\w$]*\s*\([^()]*\)\s*$', previo)
                if m: return j - len(previo) + m.start(), bool(m.group(1)), 'f'
                m = re.search(r'(async\s+)?(\([^()]*\)|[\w$]+)\s*=>\s*$', previo)
                if m: return j - len(previo) + m.start(), bool(m.group(1)), 'a'
        # si no es función (if, for, objeto…) se sigue hacia fuera
    return None, False, None
def procesa(path):
    s = open(path, encoding='utf-8').read(); cambios = 0
    while True:
        m = PAT.search(s)
        if not m: break
        # la función que lo contiene se marca async (si aún no lo es); se hace primero para no mover posiciones
        ini, es_async, tipo = func_abierta(s, m.start())
        if ini is None:
            print('  sin función:', path, s[m.start():m.start()+60].replace('\n', ' ')); s = s[:m.start()] + 'confirm_(' + s[m.end():]; continue
        s = s[:m.start()] + 'await acgolfConfirmar(' + s[m.end():]
        if not es_async: s = s[:ini] + 'async ' + s[ini:]
        cambios += 1
    s = s.replace('confirm_(', 'confirm(')
    if cambios: open(path, 'w', encoding='utf-8').write(s)
    return cambios
total = 0
for p in sorted(glob.glob('pruebas/*.js') + glob.glob('pruebas/js/*.js')):
    if any(x in os.path.basename(p) for x in SALTAR): continue
    n = procesa(p)
    if n:
        total += n
        r = subprocess.run(['node', '-e', "new Function(require('fs').readFileSync(process.argv[1],'utf8'))", p], capture_output=True, text=True)
        if r.returncode: print('ERROR de sintaxis en', p, r.stderr[:300]); sys.exit(1)
print('Avisos pasados al diseño nuevo:', total)
