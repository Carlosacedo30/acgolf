"""Modo demo: un BTC simulado y más de 50 mercados con creadores de mercado imperfectos.

Los creadores de mercado del simulador cotizan con un precio de BTC retrasado
unos segundos, una volatilidad mal estimada y algo de ruido; de vez en cuando
alguno se equivoca de verdad ("dedo gordo"). Así se puede ver al bot trabajar
sin conexión y sin arriesgar nada.
"""
import math
import random
from collections import deque
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from . import pricing
from .markets import ABOVE, BELOW, BETWEEN, TOUCH, UPDOWN, Market
from .scanner import fair_probability


class SimClock:
    """Reloj acelerado: `speed` segundos simulados por cada segundo real."""

    def __init__(self, speed: float = 10.0, start: Optional[datetime] = None):
        self.speed = speed
        self._now = start or datetime.now(timezone.utc).replace(microsecond=0)

    def now(self) -> datetime:
        return self._now

    def tick(self, real_seconds: float = 1.0) -> None:
        self._now += timedelta(seconds=real_seconds * self.speed)


class SimWorld:
    def __init__(self, clock: SimClock, spot: float = 100_000.0, true_vol: float = 0.6,
                 n_markets: int = 60, seed: Optional[int] = None):
        self.clock = clock
        self.rng = random.Random(seed)
        self.spot = spot
        self.true_vol = true_vol
        self.n_markets = n_markets
        self.history: deque = deque(maxlen=600)   # (datetime, spot) para el retraso de los creadores
        self.refs: Dict[str, float] = {}          # precio de apertura de cada Up/Down
        self.markets: List[Market] = []
        self._next_id = 1
        self._mm_bias: Dict[str, float] = {}
        self._mm_volerr: Dict[str, float] = {}
        self.history.append((clock.now(), spot))
        while len(self.markets) < n_markets:
            self._spawn()
        self.requote(force=True)

    # ---------- precio ----------
    def step_price(self, sim_seconds: float) -> float:
        dt = sim_seconds / pricing.SECONDS_PER_YEAR
        # GBM con saltos ocasionales para que haya emoción
        shock = self.rng.gauss(0, 1) * self.true_vol * math.sqrt(dt)
        if self.rng.random() < 0.003:
            shock += self.rng.choice([-1, 1]) * self.rng.uniform(0.002, 0.006)
        prev = self.spot
        self.spot *= math.exp(shock - 0.5 * self.true_vol ** 2 * dt)
        self.history.append((self.clock.now(), self.spot))
        # Una barrera tocada resuelve el mercado al instante (como en Polymarket)
        lo, hi = min(prev, self.spot), max(prev, self.spot)
        self.markets = [m for m in self.markets if not (m.kind == TOUCH and lo <= m.strike <= hi)]
        return self.spot

    def spot_at(self, when: datetime) -> float:
        best = self.history[0][1]
        for ts, px in self.history:
            if ts > when:
                break
            best = px
        return best

    # ---------- mercados ----------
    def _new_id(self) -> str:
        mid = f"sim-{self._next_id}"
        self._next_id += 1
        return mid

    def _spawn(self) -> None:
        now = self.clock.now()
        r = self.rng.random()
        horizon = self.rng.choice([5, 10, 15, 30, 60, 120])  # minutos
        expiry = now + timedelta(minutes=horizon)
        step = max(50, round(self.spot * self.true_vol * math.sqrt(horizon / 525_600) / 50) * 50)
        mid = self._new_id()
        if r < 0.45:
            # Escalera "¿BTC encima de K?" de 5 strikes con el mismo vencimiento
            base = round(self.spot / step) * step
            for k in range(-2, 3):
                strike = base + k * step
                self._add(Market(mid if k == -2 else self._new_id(),
                                 f"Bitcoin above ${strike:,.0f} at {expiry:%H:%M} UTC?",
                                 ABOVE, expiry, 0, 1, strike, event=mid))
        elif r < 0.6:
            lo = round(self.spot / step) * step + self.rng.choice([-1, 0]) * step
            self._add(Market(mid, f"Bitcoin between ${lo:,.0f} and ${lo + step:,.0f} at {expiry:%H:%M} UTC?",
                             BETWEEN, expiry, 0, 1, lo, lo + step))
        elif r < 0.7:
            strike = round(self.spot / step) * step - step
            self._add(Market(mid, f"Bitcoin below ${strike:,.0f} at {expiry:%H:%M} UTC?",
                             BELOW, expiry, 0, 1, strike))
        elif r < 0.85:
            direction = self.rng.choice([1, -1])
            for k in (1, 2, 3):
                barrier = round(self.spot / step) * step + direction * k * step
                verb = "reach" if direction > 0 else "dip to"
                self._add(Market(mid if k == 1 else self._new_id(),
                                 f"Will Bitcoin {verb} ${barrier:,.0f} by {expiry:%H:%M} UTC?",
                                 TOUCH, expiry, 0, 1, barrier, start=now, direction=direction, event=mid))
        else:
            start = now + timedelta(minutes=self.rng.choice([0, 0, 5]))
            end = start + timedelta(minutes=self.rng.choice([5, 15]))
            self._add(Market(mid, f"Bitcoin Up or Down {start:%H:%M}-{end:%H:%M} UTC",
                             UPDOWN, end, 0, 1, start=start))

    def _add(self, m: Market) -> None:
        if any(o.kind == m.kind and o.expiry == m.expiry and o.strike == m.strike for o in self.markets):
            return  # evita duplicados exactos al generar varias escaleras a la vez
        m.liquidity = round(self.rng.uniform(500, 20_000))
        self._mm_bias[m.id] = self.rng.gauss(0, 0.01)
        self._mm_volerr[m.id] = self.rng.uniform(0.85, 1.15)
        self.markets.append(m)

    def ref_for(self, m: Market) -> Optional[float]:
        return self.refs.get(m.id)

    def requote(self, force: bool = False) -> None:
        """Los creadores de mercado actualizan (con retraso y errores) sus cotizaciones."""
        now = self.clock.now()
        # La mayoría de las veces ven el precio actual; a veces el del tick anterior (latencia)
        lag_spot = self.spot if self.rng.random() < 0.7 else self.history[-2][1] if len(self.history) > 1 else self.spot
        for m in self.markets:
            if m.kind == UPDOWN and m.start and now >= m.start and m.id not in self.refs:
                self.refs[m.id] = self.spot_at(m.start)
            if not force and m.yes_ask < 1 and self.rng.random() > 0.9:
                continue  # cotización rancia: aquí es donde aparecen los errores
            vol = self.true_vol * self._mm_volerr[m.id]
            fair = fair_probability(m, lag_spot, vol, now, self.refs.get(m.id))
            if fair is None:
                continue
            p = fair + self._mm_bias[m.id] + self.rng.gauss(0, 0.01)
            if self.rng.random() < 0.002:
                p += self.rng.choice([-1, 1]) * self.rng.uniform(0.08, 0.2)  # dedo gordo
            p = min(0.99, max(0.01, p))
            half = self.rng.choice([0.005, 0.01, 0.015, 0.02])
            m.yes_bid = round(max(0.0, p - half), 3)
            m.yes_ask = round(min(1.0, p + half), 3)

    def expire_and_refill(self) -> None:
        now = self.clock.now()
        self.markets = [m for m in self.markets if m.expiry > now]
        while len(self.markets) < self.n_markets:
            self._spawn()
        self.requote(force=False)
