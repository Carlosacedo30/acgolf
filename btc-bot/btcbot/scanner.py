"""El corazón del bot: compara el precio de cada mercado con su probabilidad justa y busca incoherencias."""
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Dict, List, Optional

from . import pricing
from .markets import ABOVE, BELOW, BETWEEN, TOUCH, UPDOWN, Market


@dataclass
class ScanConfig:
    min_edge: float = 0.04        # ventaja mínima (en probabilidad, 0.04 = 4 céntimos por acción)
    fee: float = 0.0              # comisión por acción que se descuenta de la ventaja
    max_spread: float = 0.10      # ignora libros demasiado abiertos
    min_seconds: float = 60       # no entra en mercados a punto de cerrar
    min_price: float = 0.05       # ni en precios extremos (el modelo falla en las colas)
    max_price: float = 0.95
    min_arb_profit: float = 0.01  # beneficio mínimo garantizado en arbitrajes entre mercados


@dataclass
class Signal:
    market: Market
    side: str          # "YES" o "NO"
    price: float       # coste por acción del lado que se compra
    fair: float        # probabilidad justa de que ese lado gane
    edge: float        # fair - price - fee

    @property
    def expected_return(self) -> float:
        return self.edge / self.price if self.price else 0.0


@dataclass
class Arbitrage:
    """Dos mercados cuyos precios se contradicen: comprar ambos gana pase lo que pase."""
    buy_yes: Market
    buy_no: Market
    cost: float        # ask(sí) + (1 - bid(no))
    profit: float      # 1 - cost: beneficio mínimo garantizado por pareja de acciones
    reason: str


@dataclass
class Valuation:
    market: Market
    fair: Optional[float]
    note: str = ""


def fair_probability(m: Market, spot: float, sigma: float, now: datetime,
                     ref_price: Optional[float] = None) -> Optional[float]:
    """Probabilidad justa de que el "Sí" (o "Up") gane."""
    t = max(0.0, m.seconds_left(now)) / pricing.SECONDS_PER_YEAR
    if m.kind == ABOVE:
        return pricing.prob_above(spot, m.strike, sigma, t)
    if m.kind == BELOW:
        return pricing.prob_below(spot, m.strike, sigma, t)
    if m.kind == BETWEEN:
        return pricing.prob_between(spot, m.strike, m.strike_hi, sigma, t)
    if m.kind == TOUCH:
        return pricing.prob_touch(spot, m.strike, sigma, t, m.direction)
    if m.kind == UPDOWN:
        if m.start and now < m.start:
            return 0.5  # la vela aún no ha abierto: moneda al aire
        if not ref_price:
            return None
        return pricing.prob_above(spot, ref_price, sigma, t)
    return None


def evaluate(m: Market, fair: float, cfg: ScanConfig, now: datetime) -> Optional[Signal]:
    if m.seconds_left(now) < cfg.min_seconds or m.spread > cfg.max_spread:
        return None
    best = None
    # Comprar "Sí" al ask
    if cfg.min_price <= m.yes_ask <= cfg.max_price:
        edge = fair - m.yes_ask - cfg.fee
        if edge >= cfg.min_edge:
            best = Signal(m, "YES", m.yes_ask, fair, edge)
    # Comprar "No" = vender "Sí" al bid
    no_price = 1 - m.yes_bid
    if cfg.min_price <= no_price <= cfg.max_price:
        edge = (1 - fair) - no_price - cfg.fee
        if edge >= cfg.min_edge and (best is None or edge > best.edge):
            best = Signal(m, "NO", no_price, 1 - fair, edge)
    return best


def _monotone_arbs(ladder: List[Market], increasing: bool, cfg: ScanConfig, label: str) -> List[Arbitrage]:
    """En una escalera de umbrales ordenada por strike, P(sí) debe ser monótona.

    increasing=False: P(sí) baja al subir el strike ("encima de K", "llega a K" por arriba).
    Si el mercado "más probable" cotiza más barato que el "menos probable", se compra
    el Sí del primero y el No del segundo: pagan al menos 1 en todos los escenarios.
    """
    arbs = []
    ladder = sorted(ladder, key=lambda m: m.strike)
    for i, a in enumerate(ladder):
        for b in ladder[i + 1:]:
            pairs = [(b, a) if increasing else (a, b)]
            if a.strike == b.strike:
                pairs.append(pairs[0][::-1])  # mismo strike: deben valer lo mismo en ambos sentidos
            for likely, unlikely in pairs:
                cost = likely.yes_ask + (1 - unlikely.yes_bid) + 2 * cfg.fee
                profit = 1 - cost
                if profit < cfg.min_arb_profit:
                    continue
                if likely.strike == unlikely.strike:
                    reason = f"{label}: mismo strike {likely.strike:,.0f} a dos precios"
                else:
                    reason = f"{label}: {likely.strike:,.0f} debería valer ≥ {unlikely.strike:,.0f}"
                arbs.append(Arbitrage(likely, unlikely, cost, profit, reason))
    return arbs


def find_arbitrage(markets: List[Market], spot: float, cfg: ScanConfig, now: datetime) -> List[Arbitrage]:
    groups: Dict[tuple, List[Market]] = defaultdict(list)
    for m in markets:
        if m.seconds_left(now) < cfg.min_seconds:
            continue
        key_time = round(m.expiry.timestamp() / 60)
        if m.kind in (ABOVE, BELOW):
            groups[(m.kind, key_time)].append(m)
        elif m.kind == TOUCH:
            up = m.direction > 0 if m.direction else m.strike > spot
            groups[("touch_up" if up else "touch_down", key_time)].append(m)
    arbs = []
    for (kind, _), ladder in groups.items():
        if len(ladder) < 2:
            continue
        if kind == ABOVE:
            arbs += _monotone_arbs(ladder, False, cfg, "Escalera 'encima de'")
        elif kind == BELOW:
            arbs += _monotone_arbs(ladder, True, cfg, "Escalera 'debajo de'")
        elif kind == "touch_up":
            arbs += _monotone_arbs(ladder, False, cfg, "Barreras al alza")
        else:
            arbs += _monotone_arbs(ladder, True, cfg, "Barreras a la baja")
    return sorted(arbs, key=lambda a: -a.profit)


def scan(markets: List[Market], spot: float, sigma: float, now: datetime, cfg: ScanConfig,
         ref_lookup: Optional[Callable[[Market], Optional[float]]] = None):
    """Valora todos los mercados y devuelve (valoraciones, señales, arbitrajes)."""
    valuations, signals = [], []
    for m in markets:
        ref = ref_lookup(m) if (ref_lookup and m.kind == UPDOWN) else None
        fair = fair_probability(m, spot, sigma, now, ref)
        valuations.append(Valuation(m, fair, "" if fair is not None else "sin referencia"))
        if fair is None:
            continue
        sig = evaluate(m, fair, cfg, now)
        if sig:
            signals.append(sig)
    signals.sort(key=lambda s: -s.edge)
    return valuations, signals, find_arbitrage(markets, spot, cfg, now)
