# Imagen semanal del ganador (WhatsApp)

Formato fijo para anunciar cada semana al ganador de la liga del grupo, con la clasificación,
el premio de 12 bolas de Bolarecuperada, los logos de acgolf y del grupo, y un QR para entrar en la app.

1. Sacar los datos de la semana (base de datos de acgolf.es, como el super administrador con el grupo abierto):
   `premios_semana(lunes)`, la semana de `liga_mes(año, mes)->semanas` y `codigo_invitacion` del grupo.
2. Guardarlos en un `datos.json`: `{"premios": …, "semana": …, "invitacion": "…", "bolas": 12}`
3. `python3 tools/ganador-semana/generar.py datos.json salida.png`

Logos y nombre del premio de cada grupo: tabla `GRUPOS` en `generar.py` (los archivos van en `recursos/`).
