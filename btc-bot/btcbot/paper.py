"""Cartera simulada: abre posiciones con las señales y las liquida al vencer. Nunca envía órdenes reales."""
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

from .markets import ABOVE, BELOW, BETWEEN, TOUCH, UPDOWN, Market
from .scanner import Arbitrage, Signal


@dataclass
class Position:
    market_id: str
    question: str
    kind: str
    side: str
    shares: float
    entry: float
    fair_at_entry: float
    opened: str
    expiry: str
    strike: float
    strike_hi: float = 0.0
    ref: Optional[float] = None
    touched: bool = False
    tag: str = "modelo"

    @property
    def cost(self) -> float:
        return self.shares * self.entry


@dataclass
class Trade:
    question: str
    side: str
    shares: float
    entry: float
    payout: float
    pnl: float
    closed: str
    tag: str


@dataclass
class PaperBook:
    cash: float = 1000.0
    start_cash: float = 1000.0
    kelly: float = 0.25          # fracción de Kelly (1 = Kelly completo, muy agresivo)
    max_stake: float = 50.0      # máximo por operación
    arb_stake: float = 100.0     # tamaño de cada arbitraje
    positions: Dict[str, Position] = field(default_factory=dict)
    trades: List[Trade] = field(default_factory=list)

    # ---------- apertura ----------
    def _key(self, market_id: str, side: str) -> str:
        return f"{market_id}:{side}"

    def holds(self, market_id: str) -> bool:
        return any(p.market_id == market_id for p in self.positions.values())

    def stake_for(self, sig: Signal) -> float:
        # Kelly para una apuesta binaria comprada a precio p con probabilidad q: (q - p) / (1 - p)
        f = max(0.0, (sig.fair - sig.price) / (1 - sig.price)) if sig.price < 1 else 0.0
        return min(self.max_stake, self.cash, self.kelly * f * self.equity_estimate())

    def equity_estimate(self) -> float:
        return self.cash + sum(p.cost for p in self.positions.values())

    def _open(self, m: Market, side: str, price: float, fair: float, stake: float,
              now: datetime, ref: Optional[float], tag: str) -> Optional[Position]:
        if stake < 1 or price <= 0 or stake > self.cash + 1e-9:
            return None
        pos = Position(m.id, m.question, m.kind, side, stake / price, price, fair,
                       now.isoformat(timespec="seconds"), m.expiry.isoformat(), m.strike,
                       m.strike_hi, ref, tag=tag)
        self.cash = max(0.0, self.cash - stake)
        self.positions[self._key(m.id, side)] = pos
        return pos

    def on_signal(self, sig: Signal, now: datetime, ref: Optional[float] = None) -> Optional[Position]:
        if self.holds(sig.market.id):
            return None
        return self._open(sig.market, sig.side, sig.price, sig.fair, self.stake_for(sig), now, ref, "modelo")

    def on_arbitrage(self, arb: Arbitrage, now: datetime) -> bool:
        if self.holds(arb.buy_yes.id) or self.holds(arb.buy_no.id):
            return False
        yes_price, no_price = arb.buy_yes.yes_ask, 1 - arb.buy_no.yes_bid
        shares = min(self.arb_stake, self.cash) / (yes_price + no_price)
        yes_stake, no_stake = shares * yes_price, shares * no_price
        # Las dos patas o ninguna: una sola pata ya no es un arbitraje, es una apuesta
        if min(yes_stake, no_stake) < 1 or yes_stake + no_stake > self.cash + 1e-9:
            return False
        self._open(arb.buy_yes, "YES", yes_price, 1.0, yes_stake, now, None, "arbitraje")
        self._open(arb.buy_no, "NO", no_price, 1.0, min(no_stake, self.cash), now, None, "arbitraje")
        return True

    # ---------- seguimiento y liquidación ----------
    @staticmethod
    def yes_wins(p: Position, spot: float) -> Optional[bool]:
        if p.kind == ABOVE:
            return spot > p.strike
        if p.kind == BELOW:
            return spot < p.strike
        if p.kind == BETWEEN:
            return p.strike <= spot < p.strike_hi
        if p.kind == TOUCH:
            return p.touched
        if p.kind == UPDOWN:
            return None if p.ref is None else spot >= p.ref
        return None

    def mark(self, spot: float, now: datetime, prev_spot: Optional[float] = None) -> List[Trade]:
        """Actualiza barreras tocadas y liquida lo vencido. Devuelve las operaciones cerradas."""
        closed = []
        lo = min(spot, prev_spot or spot)
        hi = max(spot, prev_spot or spot)
        for key, p in list(self.positions.items()):
            if p.kind == TOUCH and lo <= p.strike <= hi:
                p.touched = True
            expired = now >= datetime.fromisoformat(p.expiry)
            if not expired and not (p.kind == TOUCH and p.touched):
                continue
            yes = self.yes_wins(p, spot)
            if yes is None:
                payout = p.cost  # sin referencia para liquidar: se devuelve lo invertido
            else:
                won = yes if p.side == "YES" else not yes
                payout = p.shares if won else 0.0
            self.cash += payout
            t = Trade(p.question, p.side, p.shares, p.entry, payout, payout - p.cost,
                      now.isoformat(timespec="seconds"), p.tag)
            self.trades.append(t)
            closed.append(t)
            del self.positions[key]
        return closed

    def unrealized(self, prices: Dict[str, Market]) -> float:
        """Valor de liquidación hoy (vendiendo al bid) menos coste."""
        total = 0.0
        for p in self.positions.values():
            m = prices.get(p.market_id)
            if not m:
                continue
            bid = m.yes_bid if p.side == "YES" else 1 - m.yes_ask
            total += p.shares * bid - p.cost
        return total

    @property
    def realized(self) -> float:
        return sum(t.pnl for t in self.trades)

    @property
    def win_rate(self) -> Optional[float]:
        if not self.trades:
            return None
        return sum(1 for t in self.trades if t.pnl > 0) / len(self.trades)

    # ---------- persistencia ----------
    def save(self, path: str) -> None:
        data = asdict(self)
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=1, ensure_ascii=False)

    @classmethod
    def load(cls, path: str) -> "PaperBook":
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        book = cls(**{k: v for k, v in data.items() if k not in ("positions", "trades")})
        book.positions = {k: Position(**v) for k, v in data.get("positions", {}).items()}
        book.trades = [Trade(**t) for t in data.get("trades", [])]
        return book
