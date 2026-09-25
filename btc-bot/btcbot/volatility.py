"""Volatilidad realizada de BTC a partir de las muestras de precio de cada segundo."""
import math
from collections import deque

from .pricing import SECONDS_PER_YEAR


class RollingVol:
    """Volatilidad anualizada sobre una ventana móvil de muestras (ts, precio).

    Al arrancar hay pocas muestras y la estimación es ruidosa, así que se mezcla
    con una volatilidad "previa" (por ejemplo, la de las velas de 1 minuto de
    las últimas horas) hasta que la ventana se llena.
    """

    def __init__(self, window_seconds: int = 900, prior: float = 0.5,
                 floor: float = 0.15, cap: float = 2.5):
        self.window = window_seconds
        self.prior = prior
        self.floor = floor
        self.cap = cap
        self.samples: deque = deque()

    def add(self, ts: float, price: float) -> None:
        if price <= 0:
            return
        if self.samples and ts <= self.samples[-1][0]:
            return
        self.samples.append((ts, price))
        while self.samples and ts - self.samples[0][0] > self.window:
            self.samples.popleft()

    def realized(self):
        """Volatilidad anualizada solo con las muestras, o None si hay muy pocas."""
        if len(self.samples) < 30:
            return None
        var_sum = 0.0
        dt_sum = 0.0
        prev_ts, prev_px = self.samples[0]
        for ts, px in list(self.samples)[1:]:
            r = math.log(px / prev_px)
            var_sum += r * r
            dt_sum += ts - prev_ts
            prev_ts, prev_px = ts, px
        if dt_sum <= 0:
            return None
        return math.sqrt(var_sum / dt_sum * SECONDS_PER_YEAR)

    def value(self) -> float:
        rv = self.realized()
        if rv is None:
            sigma = self.prior
        else:
            span = self.samples[-1][0] - self.samples[0][0]
            w = min(1.0, span / self.window)
            sigma = w * rv + (1 - w) * self.prior
        return min(self.cap, max(self.floor, sigma))


def vol_from_closes(closes, seconds_per_bar: float) -> float:
    """Volatilidad anualizada a partir de cierres de velas (p. ej. velas de 1 minuto)."""
    if len(closes) < 3:
        return 0.5
    rets = [math.log(b / a) for a, b in zip(closes, closes[1:]) if a > 0 and b > 0]
    if not rets:
        return 0.5
    var = sum(r * r for r in rets) / len(rets)
    return math.sqrt(var * SECONDS_PER_YEAR / seconds_per_bar)
