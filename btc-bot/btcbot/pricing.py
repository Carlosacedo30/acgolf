"""Probabilidades "justas" de cada tipo de mercado a partir del precio spot y la volatilidad.

Modelo: el precio de BTC sigue un movimiento browniano geométrico sin drift
(razonable en horizontes de minutos a días). Con eso:
  - "encima de K al vencimiento"   -> N(d2)
  - "entre A y B al vencimiento"   -> P(>A) - P(>B)
  - "toca K antes del vencimiento" -> principio de reflexión
"""
import math

SECONDS_PER_YEAR = 365 * 24 * 3600


def norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def prob_above(spot: float, strike: float, sigma: float, t_years: float) -> float:
    """P(S_T > K) con volatilidad anual `sigma` y tiempo `t_years` hasta el vencimiento."""
    if strike <= 0:
        return 1.0
    if t_years <= 0 or sigma <= 0:
        return 1.0 if spot > strike else 0.0
    s = sigma * math.sqrt(t_years)
    d2 = (math.log(spot / strike) - 0.5 * s * s) / s
    return norm_cdf(d2)


def prob_below(spot: float, strike: float, sigma: float, t_years: float) -> float:
    return 1.0 - prob_above(spot, strike, sigma, t_years)


def prob_between(spot: float, lo: float, hi: float, sigma: float, t_years: float) -> float:
    return max(0.0, prob_above(spot, lo, sigma, t_years) - prob_above(spot, hi, sigma, t_years))


def prob_touch(spot: float, barrier: float, sigma: float, t_years: float, direction: int = 0) -> float:
    """P(el precio toca `barrier` en algún momento antes del vencimiento).

    Sirve para barreras por encima ("¿llegará a 150k?", direction=+1) y por debajo
    ("¿caerá a 90k?", direction=-1). Si el precio ya está al otro lado de la barrera,
    el mercado está ganado. Sin drift en log-precio: P = 2 * N(-|ln(K/S)| / (sigma*sqrt(T))).
    """
    if barrier <= 0:
        return 1.0
    if spot == barrier or (direction > 0 and spot >= barrier) or (direction < 0 and spot <= barrier):
        return 1.0
    if t_years <= 0 or sigma <= 0:
        return 0.0
    dist = abs(math.log(barrier / spot))
    return min(1.0, 2.0 * norm_cdf(-dist / (sigma * math.sqrt(t_years))))
