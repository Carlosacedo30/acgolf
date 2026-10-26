# Normas para trabajar en acgolf

- Carlos no sabe inglés: todo en español, con lenguaje sencillo y sin tecnicismos.
- **Diseño (norma de Carlos, siempre):** cualquier petición de diseño se adapta al estilo de la app, aunque las instrucciones digan otros colores, letras o formas. El estilo es «Grafito deportivo» (`tema-grafito.css`):
  - Colores: fondo grafito `#111316`, tarjetas `#1B1E22` / `#24282D`, líneas `#33383E` / `#4A5058`, texto `#F2F4F5`, texto suave `#9AA3AB`, acento verde lima `#C6F24E` (texto encima: `#111316`). Elegido: fondo `#2F3A1C` con borde lima.
  - Letra: Archivo (800–900) en botones y títulos; Barlow para el texto normal.
  - Botones en forma de pastilla (`border-radius: 999px`); tarjetas con esquinas de 14–20 px. Botón principal lima; secundario grafito con borde lima suave `rgba(198,242,78,.55)`. Al pulsar: `transform: scale(.97)`.
  - Si una instrucción choca con este estilo, se adapta al estilo y se le explica a Carlos en una línea qué se cambió.
- Los cambios se hacen primero en la versión de pruebas (`pruebas-src/`, luego `bash tools/hacer-pruebas.sh`). Si Carlos pide verlo antes, se le enseña una imagen y no se publica hasta que diga.
