"""Mercados de predicción sobre BTC: modelo de datos, parser de preguntas y descarga de Polymarket."""
import json
import re
import urllib.parse
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional

from .http import get_json

GAMMA_URL = "https://gamma-api.polymarket.com"

# Tipos de mercado que el bot sabe valorar
ABOVE, BELOW, BETWEEN, TOUCH, UPDOWN = "above", "below", "between", "touch", "updown"


@dataclass
class Market:
    id: str
    question: str
    kind: str
    expiry: datetime
    yes_bid: float
    yes_ask: float
    strike: float = 0.0          # umbral (above/below/touch) o límite inferior (between)
    strike_hi: float = 0.0       # límite superior (between)
    start: Optional[datetime] = None   # inicio de la ventana (updown / touch)
    direction: int = 0           # touch: +1 barrera al alza, -1 a la baja
    event: str = ""              # agrupa mercados del mismo evento (misma fecha)
    liquidity: float = 0.0
    url: str = ""
    extra: dict = field(default_factory=dict)

    @property
    def mid(self) -> float:
        return (self.yes_bid + self.yes_ask) / 2

    @property
    def spread(self) -> float:
        return self.yes_ask - self.yes_bid

    def seconds_left(self, now: datetime) -> float:
        return (self.expiry - now).total_seconds()


_NUM = r"\$?\s*([\d][\d,]*(?:\.\d+)?)\s*([kKmM])?"


def parse_amount(num: str, suffix: Optional[str] = None) -> float:
    value = float(num.replace(",", ""))
    if suffix and suffix.lower() == "k":
        value *= 1_000
    elif suffix and suffix.lower() == "m":
        value *= 1_000_000
    return value


def _amounts(text: str) -> List[float]:
    out = []
    for m in re.finditer(_NUM, text):
        v = parse_amount(m.group(1), m.group(2))
        if v >= 1000:  # descarta fechas, horas, porcentajes
            out.append(v)
    return out


def classify(question: str, group_title: str = ""):
    """Devuelve (tipo, strike, strike_hi, dirección) o None si la pregunta no es valorable.

    Ejemplos que entiende:
      "Will the price of Bitcoin be above $110,000 on September 26?"   -> above
      "Bitcoin above 110,000 on September 26?"                          -> above
      "Will Bitcoin be less than $100k on ...?"                         -> below
      "Will the price of Bitcoin be between $108,000 and $110,000 ...?" -> between
      "Will Bitcoin reach $150,000 in September?"                       -> touch
      "Will Bitcoin dip to $90,000 in September?"                       -> touch
      "Bitcoin Up or Down - September 25, 3PM ET"                       -> updown
    """
    q = question.lower()
    if "bitcoin" not in q and "btc" not in q:
        return None
    if "up or down" in q:
        return (UPDOWN, 0.0, 0.0, 0)

    amounts = _amounts(question) or _amounts(group_title)
    if not amounts:
        return None

    if "between" in q and len(amounts) >= 2:
        lo, hi = sorted(amounts[:2])
        return (BETWEEN, lo, hi, 0)
    arrow = group_title.strip()[:1]
    if re.search(r"\b(dip to|fall to|drop to|crash to)\b", q) or arrow == "↓":
        return (TOUCH, amounts[0], 0.0, -1)
    if re.search(r"\b(reach|hit|touch)\b", q) or arrow == "↑":
        return (TOUCH, amounts[0], 0.0, 1)
    if re.search(r"\b(above|greater than|higher than|over|at least)\b|>", q):
        return (ABOVE, amounts[0], 0.0, 0)
    if re.search(r"\b(below|less than|lower than|under)\b|<", q):
        return (BELOW, amounts[0], 0.0, 0)
    return None


def _parse_dt(value) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _as_list(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except ValueError:
            return []
    return value or []


def market_from_gamma(raw: dict, event: Optional[dict] = None) -> Optional[Market]:
    """Convierte un mercado de la API Gamma de Polymarket en `Market` (o None si no sirve)."""
    if raw.get("closed") or raw.get("active") is False or raw.get("acceptingOrders") is False:
        return None
    question = raw.get("question") or ""
    parsed = classify(question, raw.get("groupItemTitle") or "")
    if not parsed:
        return None
    kind, strike, strike_hi, direction = parsed

    expiry = _parse_dt(raw.get("endDate") or (event or {}).get("endDate"))
    if not expiry:
        return None

    # Precio del "Sí": mejor bid/ask del libro; si no hay, el precio del último cruce
    bid, ask = raw.get("bestBid"), raw.get("bestAsk")
    outcomes = [str(o).lower() for o in _as_list(raw.get("outcomes"))]
    if bid is None or ask is None:
        prices = _as_list(raw.get("outcomePrices"))
        if not prices:
            return None
        p = float(prices[0])
        bid, ask = p, p
    bid, ask = float(bid), float(ask)
    if not (0 < ask <= 1 and 0 <= bid < 1 and bid <= ask):
        return None

    # En los "Up or Down" el primer resultado es "Up": equivale a "encima del precio de apertura"
    if kind == UPDOWN and outcomes and outcomes[0] not in ("up", "yes"):
        return None

    start = _parse_dt(raw.get("eventStartTime") or raw.get("startTime")
                      or (event or {}).get("startTime") or (event or {}).get("startDate"))
    slug = (event or {}).get("slug") or raw.get("slug") or ""
    return Market(
        id=str(raw.get("id")),
        question=question,
        kind=kind,
        expiry=expiry,
        yes_bid=bid,
        yes_ask=ask,
        strike=strike,
        strike_hi=strike_hi,
        start=start,
        direction=direction,
        event=str((event or {}).get("id") or raw.get("id")),
        liquidity=float(raw.get("liquidityNum") or raw.get("liquidity") or 0),
        url=f"https://polymarket.com/event/{slug}" if slug else "",
    )


def fetch_polymarket_btc(max_events: int = 200, timeout: float = 10.0) -> List[Market]:
    """Descarga los eventos activos de Bitcoin de Polymarket y devuelve sus mercados valorables."""
    markets: List[Market] = []
    offset, page = 0, 100
    while offset < max_events:
        query = urllib.parse.urlencode({
            "tag_slug": "bitcoin", "active": "true", "closed": "false",
            "limit": page, "offset": offset, "order": "endDate", "ascending": "true",
        })
        events = get_json(f"{GAMMA_URL}/events?{query}", timeout=timeout)
        if not events:
            break
        for ev in events:
            for raw in ev.get("markets") or []:
                m = market_from_gamma(raw, ev)
                if m:
                    markets.append(m)
        if len(events) < page:
            break
        offset += page
    return markets
