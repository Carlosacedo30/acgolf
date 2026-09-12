# App de Golf

Prototipo interactivo de una app de golf, pensado para desplegarse en Netlify como página estática.

## Qué incluye

Un único archivo `index.html` (sin dependencias de build) que simula el flujo completo de la app:

1. **Jugar** — buscar o elegir un campo para empezar una partida
2. **Configurar partida** — hoyos, tipo de puntuación, modalidad y barra de salida
3. **Añadir campo** — dar de alta un campo nuevo con par y hándicap por hoyo
4. **Introducir resultados** — anotar golpes por hoyo con cálculo automático del resultado
5. **Diagnóstico post-ronda** — hoyos con mayor pérdida y patrón detectado
6. **Overlay de swing** — comparación de swing propio vs. referencia
7. **Informe semanal** — evolución de hándicap y estadísticas

Usa las flechas de navegación o los puntos superiores para moverte entre pantallas.

## Cómo verlo

Abre `index.html` directamente en un navegador, o despliega la carpeta en [Netlify](https://www.netlify.com/) (no requiere configuración adicional).

## Archivos

- `index.html` — la app completa (HTML, CSS y JS)
- `manifest.json` — manifiesto para instalar la app como PWA
- `icon-180.png`, `icon-512.png` — íconos de la app
