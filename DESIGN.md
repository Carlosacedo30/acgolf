# DESIGN.md — única fuente del diseño de acgolf

## Reglas para quien construya el diseño (Fable u otro)
- Todo el diseño viene de ESTE archivo. No inventes valores: si falta uno, se pregunta a Carlos.
- No cambies la funcionalidad, solo el estilo.
- No añadas dependencias, librerías ni abstracciones.
- Al terminar: abre cada pantalla en el navegador y verifica visualmente (captura en 390×844 y 360×640).
- Si una pantalla no encaja con el resto, corrígela. No pares hasta que todas sean consistentes.
- **Estilo Iscariotes (azul, oro, rojo) SOLO en las pantallas que NO son de marcar golpes.** Las pantallas de marcar (anotar golpes en el campo, tarjeta, clasificación mientras se marca, quién marca a quién) NO se tocan: siguen con fondo blanco y los colores de resultado de `tarjeta-blanca.css`.
- Se construye solo en pruebas (`pruebas-src/` y `bash tools/hacer-pruebas.sh`). A acgolf.es solo con permiso de Carlos.
- Todo en español sencillo para Carlos.


Carlos es jubilado, no sabe inglés: todo en español sencillo. Muchos jugadores tienen más de 55 años y vista cansada: letra grande.

## 1. Estructura (4 pestañas abajo)
- **Inicio** = lo de hoy. Escudo y nombre del grupo arriba (SIN nombre de liga ni campo ahí). Botón rojo «Crear partida» y debajo botón dorado «Organizar partidos». Luego bloques: Ahora (tarjeta pendiente) · Lo próximo (próximo partido + Apuntarme) · Tu liga (nombre de la liga + posición).
- **Jugar** = todo lo de una partida: Crear partida, Con tu grupo (Organizar partidos, Próximos partidos), Otras formas de jugar (Cartas, Ryder Cup), Antes de salir (Campos de golf).
- **Liga** = clasificación (top 3 + «Ver la clasificación completa»), Premios (Ganadores de la semana, Salón de campeones, Medallas) y, aparte en recuadro de puntos, «Solo administrador» (Ligas).
- **Mi cuenta** = todo lo mío, en 3 pantallas: Mi golf (hándicap, últimas partidas, ¿Cómo jugué?) + Mi perfil (foto, contraseña y datos) · Mi grupo (mis grupos, invitar amigos; admin: miembros y portada) + Avisos · Ayuda y club (Reglas, Manual, App Hato Verde, Soporte) + Síguenos + Sesión (Cerrar sesión; Borrar mi cuenta pequeño).
- **Se eliminan:** Historia del golf, Consejos de golf y la pestaña «Grupo» (sus botones se reparten).
- Reglas: cada cosa en un solo sitio · lo urgente arriba · un botón principal por pantalla · lo de administrador aparte en recuadro de puntos · máximo 6 cosas por bloque · «Volver» siempre arriba · puntito rojo en la pestaña si hay algo que hacer.
- Las pantallas de marcar golpes NO cambian de estructura: siguen con fondo blanco y colores de resultado fijos (norma de tarjeta-blanca.css).

## 2. Colores (estilo Iscariotes, solo para pantallas que NO son de marcar)
Fondo `#0A0C10` · tarjetas azul `linear-gradient(160deg,#17233D,#0F1626)` con borde `rgba(217,190,122,.45)` · filas `#121620` borde `#242B38` · texto `#F4F1E8` · texto suave `#9AA3B0` / `#B5BFD0` · dorado `#E9CF8C` (botón `#EBD08A→#C9A54A`, texto encima `#16120A`) · rojo botón principal `#B3262E→#8A1A21` · alerta `#4A1A20→#2A0C10` borde `rgba(179,38,46,.8)` · puntito rojo `#D8333D`.
Foto del campo (Hato Verde) arriba en Inicio, con degradado hacia el fondo.

## 3. Letras
Archivo 800–900 (títulos, botones, etiquetas en mayúsculas con espaciado) · Barlow 600 (texto normal) · Playfair Display cursiva SOLO para subtítulos decorativos dorados. Siempre con respaldo `system-ui, Arial` (sin él sale letra con serifa).
Tamaños mínimos: texto normal 15–16 px, filas 17–18 px, títulos de pantalla 30 px, botones 17–20 px. Nunca bajar de 14 px (salvo etiquetas de sección en mayúsculas de 12–13 px).

## 4. Formas y medidas
Botones en pastilla (`border-radius:999px`), altura 42–72 px (principal 58–72). Tarjetas 20–24 px de esquina. Márgenes laterales 16 px. Barra inferior con 4 pestañas, la activa en pastilla dorada. Al pulsar: `transform:scale(.97)`.
Pantalla de referencia 390×844; debe funcionar también en 360×640 (móvil pequeño) sin cortar nada.

## 5. Centrado y orden (obligatorio, se comprueba antes de enseñar)
- Todo el contenido centrado en la pantalla con los mismos márgenes a izquierda y derecha; nada pegado al borde ni desbordado (sin barra horizontal).
- Ningún texto fuera de su botón o tarjeta: el texto dentro de botones va centrado en horizontal y vertical, y si no cabe se parte en dos líneas (nunca se corta con «…» ni se sale).
- Los botones principales ocupan todo el ancho útil.
- Nada tapado por la barra inferior: dejar espacio abajo para que el último bloque se vea entero al desplazar.
- Nombres de jugadores: nombre completo en marcación; en listas «nombre(s) y primer apellido».
- Comprobación: sacar captura en 390×844 y en 360×640 de CADA pantalla y mirarlas; si algo se corta, se descentra o se superpone, se arregla antes de enseñárselo a Carlos.

## 6. Otras normas que siguen vigentes
Resultado neto con hándicap · hoyo de salida (`hoyoSalida`) · nombres de grupos y ligas (la referencia de la liga es el nombre que se puso al crearla) · Solo mi grupo · bases de datos REAL/PRUEBAS sin mezclar · primero dibujo a Carlos, luego pruebas, y publicar solo con permiso.
Al adoptar este estilo hay que actualizar la norma «Grafito deportivo» de CLAUDE.md (lo hace Claude cuando Carlos dé el visto bueno final en pruebas).


## 7. Pantalla de marcar golpes — diseño aprobado por Carlos (15-nov-2026)
Referencia visual exacta: `diseno-ref/marcar.html` y capturas `diseno-ref/marcar.png` (390×844) y `diseno-ref/marcar-pequeno.png` (360×640). Es el modelo para TODAS las pantallas de marcar: mismo lenguaje Iscariotes pero con fondo blanco.
- Arriba: botón «‹ Salir» (pastilla con borde azul), escudo pequeño centrado, «Hoyo 7 de 18» a la derecha. Título «HOYO 7» (Archivo 900, azul oscuro), debajo «Par 4 · 352 m» en Playfair cursiva oro oscuro `#8A6A1F`, y barra de 18 rayitas (jugados azul oscuro, actual dorado, pendientes gris).
- Tarjeta «Marcas a»: azul oscuro con borde dorado y sombra suave, nombre completo en blanco, a la derecha el resultado ya anotado con su color fijo.
- Teclado 3×3 con números lisos lo más grandes posible. La tecla del par va en dorado con el rótulo **«SU PAR»** (se marca a otro jugador). La tecla pulsada va en azul oscuro con número blanco. Sin más colores ni nombres de resultado.
- «Tu grupo»: lista con nombre completo y resultado con colores fijos; fila del jugador al que marcas con borde dorado; aviso rojo «Falta N por marcar» y la fila pendiente con borde rojo de rayas y la palabra «Falta».
- Abajo: «‹ Hoyo 6» (pastilla con borde dorado) y «SIGUIENTE HOYO ›» (pastilla roja, texto blanco).
- Colores añadidos por este diseño: gris `#4A5568` (etiqueta «Hoyo»), `#A8873A` (sombra tecla dorada).
- En 360×640 se compacta (teclas de unos 61 px) y sigue todo visible sin cortes.

## 8. Estilo «fino y elegante» y pantalla Inicio — aprobado por Carlos (15-nov-2026)
Referencia visual exacta: `diseno-ref/inicio.html`, `inicio.png` (390×844), `inicio-pequeno.png` (360×640). Este estilo fino vale para TODAS las pantallas (también las de marcar, sobre fondo blanco). Corrige a lo anterior donde choque:
- Bordes de 1 px en oro suave; sin sombras gordas en tarjetas; sin brillo en botones. Esquinas de tarjeta de 18 px (16 px en móvil pequeño); botones en pastilla.
- Letra: Archivo 700 para secundarios; 800–900 solo en nombre del grupo, botón principal y pestaña activa. Letra GRANDE igualmente (nada por debajo de 15 px salvo etiquetas en mayúsculas de 12–13 px). Playfair cursiva dorada para toques de club (fecha de la jornada, posición «2.º»).
- Botones: «Crear partida» rojo y «Organizar partidos» dorado relleno; **«Apuntarme» también dorado relleno** (decisión de Carlos). Aviso rojo con círculo fino con «!» y flecha ›.
- Inicio: foto de Hato Verde con degradado, escudo con aro dorado fino y «LOS ISCARIOTES» (sin liga ni campo); bloques Ahora · Lo próximo («Hato Verde · 4 apuntados» en la misma línea) · Tu liga (nombre de la liga y «2.º» en cursiva dorada con una rayita fina); barra inferior baja y lisa con puntito rojo en Inicio.
- Valores añadidos: `#E8C9CC` (texto suave del aviso rojo), `#141820` (fondo de barra inferior y borde del puntito), sombras suaves `rgba(0,0,0,.4–.6)` solo en escudo y título, `rgba(179,38,46,.2)` bajo el botón rojo.
- Las capturas de referencia usan letras de respaldo porque Archivo/Barlow/Playfair no están instaladas en el equipo de dibujo; en la app real se cargan las verdaderas.
