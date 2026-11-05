# Normas para trabajar en acgolf

- Carlos no sabe inglés: todo en español, con lenguaje sencillo y sin tecnicismos.
- **Diseño (norma de Carlos, siempre):** cualquier petición de diseño se adapta al estilo de la app, aunque las instrucciones digan otros colores, letras o formas. El estilo es «Grafito deportivo» (`tema-grafito.css`):
  - Colores: fondo grafito `#111316`, tarjetas `#1B1E22` / `#24282D`, líneas `#33383E` / `#4A5058`, texto `#F2F4F5`, texto suave `#9AA3AB`, acento verde lima `#C6F24E` (texto encima: `#111316`). Elegido: fondo `#2F3A1C` con borde lima.
  - Letra: Archivo (800–900) en botones y títulos; Barlow para el texto normal.
  - Botones en forma de pastilla (`border-radius: 999px`); tarjetas con esquinas de 14–20 px. Botón principal lima; secundario grafito con borde lima suave `rgba(198,242,78,.55)`. Al pulsar: `transform: scale(.97)`.
  - Si una instrucción choca con este estilo, se adapta al estilo y se le explica a Carlos en una línea qué se cambió.
- Los cambios se hacen primero en la versión de pruebas (`pruebas-src/`, luego `bash tools/hacer-pruebas.sh`). Si Carlos pide verlo antes, se le enseña una imagen y no se publica hasta que diga.
- **Resumen y retransmisión (norma de Carlos, para siempre):** todo resumen, marcador en directo, Plató o tele se cuenta según el hoyo por el que salió cada grupo (`hoyoSalida`, si no hay, el 1). El último hoyo es el 18.º que se juega (si se sale por el 10, es el 9). Nunca dar por hecho 1→18 ni «ida 1–9 / vuelta 10–18». Usar `ordenDe(g)`, `posDe(g,h)` en `en-vivo.js` (`pos` en `tabla()` y `momentos()`).
- **Bases de datos (norma permanente de Carlos, un solo criterio):**
  - **REAL** = Supabase `svnkgmbfanwftncopqjg` (ahora se llama «acgolf-REAL»). La usa SOLO acgolf.es. Copia de seguridad cada lunes por correo.
  - **PRUEBAS** = Supabase `qjtsjcfalettgvrlwwnr` (se llama «acgolf-PRUEBAS»). La usa SOLO la web de pruebas (carlosacedo30.github.io/acgolf/pruebas/). Sin datos reales, sin correos ni tareas programadas. Los datos viejos de la liga antigua están guardados en su esquema `archivo_antiguo`.
  - Los scripts `hacer-pruebas.sh` y `hacer-acgolf-es.sh` se paran solos si una web apunta a la base equivocada. Nunca mezclar.
  - La tarea `sincronizar-desde-liga` (cron 1) de la base real está APAUSADA (la liga antigua ya no se usa).
