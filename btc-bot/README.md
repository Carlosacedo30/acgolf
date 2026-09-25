# ₿ BTC Arb Scanner

Bot de terminal que vigila **más de 50 mercados de predicción de Bitcoin** (Polymarket) a la vez,
sincroniza el **precio de BTC de Binance cada segundo** y marca los mercados cuyo precio no cuadra
con lo que dice el spot. Opera **solo en papel**: nunca envía órdenes reales.

```
₿ BTC ARB SCANNER  DEMO x10  (solo papel — no envía órdenes)
BTC 100,040.11 $ · Simulador · vol 60% · 60 mercados · escaneo 0.4 ms · 2026-09-25 13:45:59 UTC

Errores de precio (ventaja ≥ 0.04)
ventaja lado precio  justo   queda  mercado
 +0.097 YES   0.397  0.494  29m50s  Will Bitcoin reach $100,350 by 14:15 UTC?
 +0.064 NO    0.749  0.813   4m50s  Will Bitcoin dip to $99,800 by 13:50 UTC?
 +0.055 YES   0.194  0.249   1h59m  Will Bitcoin dip to $99,000 by 15:45 UTC?

Cartera de papel  capital 991.54 $ (-8.46) · realizado +0.00 · abierto -8.46 · 4 posiciones · …

13:45:59 ▲ Compra YES Will Bitcoin reach $100,350 by 14:15 UTC? a 0.397 (justo 0.494, 40$)
```

## Arrancar

```bash
cd btc-bot
pip install -r requirements.txt     # opcional: websockets + pytest

python -m btcbot --demo             # simulación: sin internet, 60 mercados, tiempo x10
python -m btcbot                    # en vivo: Binance + Polymarket
python -m btcbot --once             # un solo escaneo y sale
python -m pytest                    # tests
```

Sale con `Ctrl+C`. La cartera de papel se guarda en `paper_book.json` y continúa en la siguiente
ejecución (`--reset` para empezar de cero).

## Juego de práctica

`juego.html` es un juego de 10 rondas para entrenar el criterio antes de mirar el bot: decidir si una
apuesta está barata, cuánto apostar según las reglas de oro, detectar precios imposibles y distinguir
patrones fiables del humo. Se abre directamente en el navegador (también desde el móvil).

## Órdenes del bot y reglas de oro

Cada vez que el bot opera, lo explica en lenguaje sencillo en la línea `▶`:

```
▶ 🟢 ORDEN DEL BOT: COMPRA SÍ en «Will Bitcoin reach $99,900 by 03:36 UTC?» a 0,34 $ · apuesta 50,00 $ ·
  motivo: vale 0,40, está 0,06 más barata de lo que debería
▶ NO HAGAS NADA: ninguna apuesta está lo bastante mal de precio. No operar también es decidir.
▶ 🛑 PARADO POR HOY: se ha perdido el 10 % del día. Mañana más (regla de oro 2).
```

Y aplica solo las reglas de gestión del dinero:

1. **Nunca más del 5 % del capital por operación** (`--max-pct 0.05`), ni más de `--max-stake` dólares.
2. **Si en el día se pierde el 10 %, para hasta el día siguiente** (`--daily-stop 0.10`), aunque
   aparezca una oportunidad buenísima. Antes de llegar al límite, cada apuesta se recorta a lo que
   queda hasta él.

La línea "Reglas de oro" del panel muestra cuánto se ha perdido hoy y cuánto queda.

## Cómo decide

Cada segundo:

1. **Precio**: último trade de BTCUSDT por el websocket de Binance (si falla, REST cada segundo;
   si `api.binance.com` está bloqueado en tu país usa el espejo `binance.vision`).
2. **Volatilidad**: realizada con las muestras de cada segundo, arrancando con la de las velas de
   1 minuto de las últimas 4 horas.
3. **Probabilidad justa** de cada mercado con un modelo lognormal (movimiento browniano sin drift):

   | Mercado | Ejemplo | Fórmula |
   |---|---|---|
   | encima / debajo | "Bitcoin above 110,000 on Sep 26?" | `N(d2)` |
   | entre | "between $108,000 and $110,000" | `P(>A) − P(>B)` |
   | toca barrera | "Will Bitcoin reach $150,000 in September?" | principio de reflexión, `≈ 2·P(>K)` |
   | sube o baja | "Bitcoin Up or Down – 3PM ET" | `P(> apertura de la vela)` |

4. **Error de precio** = probabilidad justa − precio de compra (ask del Sí, o 1 − bid para el No),
   menos comisión. Si supera `--min-edge` (4 céntimos por defecto) sale en la tabla y, en papel,
   compra con un **cuarto de Kelly** limitado a `--max-stake`.
5. **Arbitrajes sin modelo**: en una escalera de umbrales con el mismo vencimiento, "encima de 99k"
   *tiene* que valer al menos lo mismo que "encima de 101k". Si cotiza más barato, comprar el Sí del
   primero y el No del segundo cobra ≥ 1 $ por pareja pase lo que pase. Esto no depende de ningún
   modelo: es un error de precio de verdad.
6. **Liquidación**: al vencer, con el precio de Binance (las barreras se cierran en cuanto se tocan).

Opciones útiles: `--min-edge 0.06`, `--fee 0.01`, `--no-trade` (solo mirar), `--refresh 10`
(segundos entre descargas de Polymarket), `--speed 30` (demo más rápida), `--seed 1` (demo repetible).

## Código

| Archivo | Qué hace |
|---|---|
| `btcbot/feed.py` | Precio de Binance (websocket + REST), velas, apertura de cada vela |
| `btcbot/markets.py` | Descarga de Polymarket (API Gamma) y parser de preguntas → tipo, strike, vencimiento |
| `btcbot/pricing.py` | Probabilidades justas |
| `btcbot/volatility.py` | Volatilidad realizada móvil |
| `btcbot/scanner.py` | Señales y arbitrajes entre mercados |
| `btcbot/paper.py` | Cartera simulada, Kelly, reglas de oro, liquidación, guardado |
| `btcbot/orders.py` | Órdenes en lenguaje sencillo |
| `btcbot/sim.py` | Mundo simulado para `--demo` |
| `btcbot/app.py` | Bucle de 1 segundo y panel de terminal |

## La letra pequeña (léela antes de poner dinero)

El texto que inspiró esto ("detecta errores antes de que los humanos lo noten, la ventaja es pura
velocidad") vende la parte bonita. La realidad:

- **No eres el único bot.** Los mercados de BTC de Polymarket los cotizan creadores de mercado
  profesionales con servidores al lado de los exchanges. Un script en Python desde casa con un
  refresco de Polymarket cada 15 s llega tarde a casi cualquier carrera de velocidad.
- **La mayoría de "errores" son el modelo equivocándose, no el mercado.** El lognormal subestima
  las colas y los saltos; Polymarket resuelve con fuentes concretas (Binance a una hora exacta,
  Chainlink en los de 15 min) que no siempre coinciden con el precio que ve el bot.
- **Comisiones, spread y profundidad.** El precio del libro vale para las primeras acciones; los
  mercados de cripto de corto plazo tienen comisiones de taker que se comen ventajas pequeñas.
- **La demo gana porque sus creadores de mercado son torpes a propósito.** Sirve para ver el
  mecanismo, no demuestra nada sobre el mercado real.

Por eso el bot **solo opera en papel**. Déjalo correr en vivo unos días con `--no-trade` o en papel
y mira la columna "aciertos" y el realizado antes de plantearte nada más. Si algo se sostiene, los
arbitrajes de escalera son la parte con fundamento; las señales del modelo, la especulativa.
