#!/usr/bin/env python3
# © 2026 Carlos Acedo Domínguez. Todos los derechos reservados.
# Imagen semanal del ganador para WhatsApp (formato fijo de acgolf).
# Uso:  python3 tools/ganador-semana/generar.py datos.json [salida.png]
# datos.json = {"premios": <resultado de premios_semana(lunes)>, "semana": <la semana de liga_mes(...)->semanas>,
#               "invitacion": "<codigo_invitacion del grupo>", "bolas": 12}
import json, sys, os, asyncio, datetime
AQUI = os.path.dirname(os.path.abspath(__file__))
MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
# Nombre del premio y logo de cada grupo (el premio lleva el nombre del grupo)
GRUPOS = {
    'los iscariotes': ('Iscariote de la semana', 'logo-iscariotes.svg'),
    'cajapollos':     ('Cajapollo de la semana', 'logo-cajapollos.svg'),
}

def fechas(desde, hasta, campo):
    a = datetime.date.fromisoformat(desde[:10]); b = datetime.date.fromisoformat(hasta[:10])
    txt = f'Semana del {a.day} al {b.day} de {MESES[b.month-1]}' if a.month == b.month else f'Semana del {a.day} de {MESES[a.month-1]} al {b.day} de {MESES[b.month-1]}'
    return txt + (f' · {campo}' if campo else '')

def main():
    entrada = json.load(open(sys.argv[1], encoding='utf-8'))
    salida = sys.argv[2] if len(sys.argv) > 2 else os.path.join(AQUI, 'ganador-semana.png')
    p, sem = entrada['premios'], entrada['semana']
    grupo = p.get('grupo') or 'Mi grupo'
    premio, logo = GRUPOS.get(grupo.strip().lower(), ('Campeón de la semana', None))
    campo = entrada.get('campo', 'Club Hato Verde')
    datos = {
        'grupo': grupo, 'logo': logo, 'premio': premio,
        'fechas': fechas(p['desde'], p['hasta'], campo),
        'ganador': p['iscariote'], 'tarjetas': p.get('tarjetas'),
        'clasificacion': sem['clasificacion'], 'bolas': entrada.get('bolas', 12),
        'invitacion': entrada.get('invitacion', ''),
    }
    open(os.path.join(AQUI, 'datos.js'), 'w', encoding='utf-8').write('window.DATOS = ' + json.dumps(datos, ensure_ascii=False) + ';\n')
    asyncio.run(foto(salida))
    print('Imagen:', salida)

async def foto(salida):
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); pg = await b.new_page(viewport={'width': 1080, 'height': 1350})
        await pg.goto('file://' + os.path.join(AQUI, 'plantilla.html'))
        await pg.wait_for_selector('body[data-listo]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=salida, full_page=True); await b.close()

if __name__ == '__main__':
    main()
