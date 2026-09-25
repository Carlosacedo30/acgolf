"""Precio de BTC en vivo desde Binance (websocket con respaldo por REST cada segundo)."""
import asyncio
import json
import time
import urllib.parse
from datetime import datetime
from typing import Dict, Optional

from .http import get_json
from .volatility import RollingVol, vol_from_closes

# api.binance.com bloquea algunos países (p. ej. EE. UU.); data-api.binance.vision es el espejo público
REST_HOSTS = ["https://api.binance.com", "https://data-api.binance.vision"]
WS_HOSTS = ["wss://stream.binance.com:9443", "wss://data-stream.binance.vision"]


class PriceState:
    """Último precio conocido + volatilidad móvil, compartido entre las tareas del bot."""

    def __init__(self, vol: Optional[RollingVol] = None):
        self.price: float = 0.0
        self.ts: float = 0.0
        self.vol = vol or RollingVol()
        self.source = "—"
        self.updates = 0

    def update(self, price: float, ts: Optional[float] = None, source: str = "") -> None:
        self.price = price
        self.ts = ts or time.time()
        self.updates += 1
        if source:
            self.source = source

    def sample(self, ts: Optional[float] = None) -> None:
        """Se llama una vez por segundo: guarda el precio para la volatilidad."""
        if self.price > 0:
            self.vol.add(ts if ts is not None else time.time(), self.price)

    @property
    def age(self) -> float:
        return time.time() - self.ts if self.ts else float("inf")


class BinanceFeed:
    def __init__(self, symbol: str = "BTCUSDT"):
        self.symbol = symbol
        self._open_cache: Dict[int, float] = {}
        self._rest_host = REST_HOSTS[0]

    # ---------- REST ----------
    def _rest(self, path: str, params: dict):
        last_err = None
        for host in [self._rest_host] + [h for h in REST_HOSTS if h != self._rest_host]:
            try:
                data = get_json(f"{host}{path}?{urllib.parse.urlencode(params)}", timeout=5)
                self._rest_host = host
                return data
            except Exception as err:  # prueba el siguiente host
                last_err = err
        raise ConnectionError(f"Binance no responde: {last_err}")

    def ticker(self) -> float:
        return float(self._rest("/api/v3/ticker/price", {"symbol": self.symbol})["price"])

    def recent_vol(self, minutes: int = 240) -> float:
        """Volatilidad anualizada de las últimas `minutes` velas de 1 minuto."""
        rows = self._rest("/api/v3/klines", {"symbol": self.symbol, "interval": "1m", "limit": minutes})
        return vol_from_closes([float(r[4]) for r in rows], 60)

    def open_price_at(self, when: datetime) -> Optional[float]:
        """Precio de apertura de la vela de 1 minuto que empieza en `when` (referencia de los Up/Down)."""
        ms = int(when.timestamp() // 60 * 60 * 1000)
        if ms not in self._open_cache:
            rows = self._rest("/api/v3/klines", {"symbol": self.symbol, "interval": "1m",
                                                 "startTime": ms, "limit": 1})
            if not rows or int(rows[0][0]) != ms:
                return None
            self._open_cache[ms] = float(rows[0][1])
        return self._open_cache[ms]

    # ---------- streaming ----------
    async def run(self, state: PriceState, stop: asyncio.Event) -> None:
        """Mantiene `state` al día. Usa websocket si está disponible y cae a REST si falla."""
        import importlib.util
        has_ws = importlib.util.find_spec("websockets") is not None

        while not stop.is_set():
            if has_ws:
                for host in WS_HOSTS:
                    try:
                        await self._run_ws(host, state, stop)
                    except Exception:
                        continue
                    if stop.is_set():
                        return
            # Respaldo: una consulta REST por segundo durante un minuto y se reintenta el websocket
            deadline = time.time() + 60
            while not stop.is_set() and time.time() < deadline:
                try:
                    px = await asyncio.to_thread(self.ticker)
                    state.update(px, source="Binance REST")
                except Exception:
                    pass
                await asyncio.sleep(1)

    async def _run_ws(self, host: str, state: PriceState, stop: asyncio.Event) -> None:
        import websockets
        url = f"{host}/ws/{self.symbol.lower()}@aggTrade"
        async with websockets.connect(url, open_timeout=5, ping_interval=20) as ws:
            while not stop.is_set():
                msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=15))
                if "p" in msg:
                    state.update(float(msg["p"]), msg.get("T", 0) / 1000 or None, source="Binance WS")
