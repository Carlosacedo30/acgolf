"""Bucle principal: cada segundo sincroniza el precio, escanea todos los mercados y pinta el panel."""
import argparse
import asyncio
import os
import sys
import time
from collections import deque
from datetime import datetime, timezone
from typing import Dict, List, Optional

from .feed import BinanceFeed, PriceState
from .markets import UPDOWN, Market, fetch_polymarket_btc
from .paper import PaperBook
from .scanner import ScanConfig, scan
from .sim import SimClock, SimWorld
from .volatility import RollingVol

GREEN, RED, YELLOW, CYAN, DIM, BOLD, RESET = ("\x1b[32m", "\x1b[31m", "\x1b[33m", "\x1b[36m",
                                               "\x1b[2m", "\x1b[1m", "\x1b[0m")


def fmt_left(seconds: float) -> str:
    seconds = max(0, int(seconds))
    if seconds >= 86400:
        return f"{seconds // 86400}d{seconds % 86400 // 3600:02d}h"
    if seconds >= 3600:
        return f"{seconds // 3600}h{seconds % 3600 // 60:02d}m"
    return f"{seconds // 60}m{seconds % 60:02d}s"


def money(x: float) -> str:
    color = GREEN if x > 0 else RED if x < 0 else ""
    return f"{color}{x:+,.2f}{RESET if color else ''}"


class Bot:
    def __init__(self, args):
        self.args = args
        self.cfg = ScanConfig(min_edge=args.min_edge, fee=args.fee, max_spread=args.max_spread,
                              min_seconds=args.min_seconds)
        self.state = PriceState(RollingVol(window_seconds=900, prior=0.5))
        self.stop = asyncio.Event()
        self.log: deque = deque(maxlen=8)
        self.markets: List[Market] = []
        self.refs: Dict[str, float] = {}
        self.market_error = ""
        self.markets_updated: Optional[float] = None
        self.last_scan_ms = 0.0
        self.scans = 0
        self.prev_spot: Optional[float] = None
        self.book = self._load_book()
        self.demo = args.demo
        if self.demo:
            self.clock = SimClock(speed=args.speed)
            self.world = SimWorld(self.clock, seed=args.seed, n_markets=args.sim_markets)
            self.state.vol.prior = 0.6
            self.state.update(self.world.spot, source="Simulador")
        else:
            self.clock = None
            self.feed = BinanceFeed()

    def now(self) -> datetime:
        return self.clock.now() if self.clock else datetime.now(timezone.utc)

    def _load_book(self) -> PaperBook:
        path = self.args.book
        if path and os.path.exists(path) and not self.args.reset:
            try:
                return PaperBook.load(path)
            except Exception:
                pass
        return PaperBook(cash=self.args.bankroll, start_cash=self.args.bankroll,
                         kelly=self.args.kelly, max_stake=self.args.max_stake)

    def note(self, text: str) -> None:
        self.log.appendleft(f"{DIM}{self.now():%H:%M:%S}{RESET} {text}")

    # ---------- fuentes de datos ----------
    async def refresh_markets(self) -> None:
        while not self.stop.is_set():
            try:
                markets = await asyncio.to_thread(fetch_polymarket_btc)
                refs = {}
                now = self.now()
                for m in markets:
                    if m.kind == UPDOWN and m.start and m.start <= now:
                        ref = self.refs.get(m.id)
                        if ref is None:
                            ref = await asyncio.to_thread(self._safe_open, m.start)
                        if ref:
                            refs[m.id] = ref
                self.markets, self.refs = markets, refs
                self.markets_updated = time.time()
                self.market_error = ""
            except Exception as err:
                self.market_error = f"Polymarket: {err}"
            await asyncio.sleep(self.args.refresh)

    def _safe_open(self, when):
        try:
            return self.feed.open_price_at(when)
        except Exception:
            return None

    async def seed_vol(self) -> None:
        try:
            self.state.vol.prior = await asyncio.to_thread(self.feed.recent_vol)
            self.note(f"Volatilidad inicial (velas 1m, 4h): {self.state.vol.prior:.0%}")
        except Exception as err:
            self.note(f"{YELLOW}Sin velas de Binance ({err}); volatilidad previa 50%{RESET}")

    # ---------- escaneo ----------
    def tick(self) -> None:
        if self.demo:
            self.clock.tick(1.0)
            self.state.update(self.world.step_price(self.clock.speed), source="Simulador")
            self.world.expire_and_refill()
            self.markets = self.world.markets
            self.refs = self.world.refs
            self.markets_updated = time.time()

        now = self.now()
        spot = self.state.price
        if spot <= 0:
            return
        self.state.sample(now.timestamp())
        sigma = self.state.vol.value()

        t0 = time.perf_counter()
        valuations, signals, arbs = scan(self.markets, spot, sigma, now, self.cfg,
                                         ref_lookup=lambda m: self.refs.get(m.id))
        self.last_scan_ms = (time.perf_counter() - t0) * 1000
        self.scans += 1
        self.valuations, self.signals, self.arbs = valuations, signals, arbs

        for t in self.book.mark(spot, now, self.prev_spot):
            icon = "✅" if t.pnl > 0 else "❌"
            self.note(f"{icon} Cierre {t.side} {t.question[:48]} → {money(t.pnl)}")
        self.prev_spot = spot

        if self.args.trade:
            for arb in arbs:
                if self.book.on_arbitrage(arb, now):
                    self.note(f"{CYAN}⚡ Arbitraje{RESET} {arb.reason} (+{arb.profit:.3f}/acción asegurado)")
            for sig in signals:
                pos = self.book.on_signal(sig, now, self.refs.get(sig.market.id))
                if pos:
                    self.note(f"{GREEN}▲ Compra {sig.side}{RESET} {sig.market.question[:46]} "
                              f"a {sig.price:.3f} (justo {sig.fair:.3f}, {pos.cost:.0f}$)")
        if self.args.book and self.scans % 10 == 0:
            self.book.save(self.args.book)

    # ---------- panel ----------
    def render(self) -> str:
        now = self.now()
        s = self.state
        mode = f"{YELLOW}DEMO x{self.clock.speed:g}{RESET}" if self.demo else f"{GREEN}EN VIVO{RESET}"
        feed_age = "" if self.demo or s.price <= 0 else f" · hace {s.age:.1f}s"
        lines = [
            f"{BOLD}₿ BTC ARB SCANNER{RESET}  {mode}  {DIM}(solo papel — no envía órdenes){RESET}",
            f"BTC {BOLD}{s.price:,.2f}{RESET} $ · {s.source}{feed_age} · vol {s.vol.value():.0%} · "
            f"{len(self.markets)} mercados · escaneo {self.last_scan_ms:.1f} ms · {now:%Y-%m-%d %H:%M:%S} UTC",
        ]
        if not self.demo and s.price <= 0:
            lines.append(f"{RED}Sin precio de Binance todavía (¿red bloqueada? prueba --demo){RESET}")
        if self.market_error:
            lines.append(f"{RED}{self.market_error}{RESET}")
        lines.append("")
        lines.append(f"{BOLD}Errores de precio (ventaja ≥ {self.cfg.min_edge:.2f}){RESET}")
        lines.append(f"{DIM}{'ventaja':>7} {'lado':<4} {'precio':>6} {'justo':>6} {'queda':>7}  mercado{RESET}")
        for sig in getattr(self, "signals", [])[: self.args.top]:
            m = sig.market
            lines.append(f"{GREEN}{sig.edge:+7.3f}{RESET} {sig.side:<4} {sig.price:6.3f} {sig.fair:6.3f} "
                         f"{fmt_left(m.seconds_left(now)):>7}  {m.question[:70]}")
        if not self.markets:
            lines.append(f"{DIM}  (esperando mercados…){RESET}")
        elif not getattr(self, "signals", []):
            lines.append(f"{DIM}  (nada por ahora: el mercado está bien valorado){RESET}")

        arbs = getattr(self, "arbs", [])
        if arbs:
            lines.append("")
            lines.append(f"{BOLD}{CYAN}Arbitrajes sin modelo{RESET}")
            for a in arbs[:3]:
                lines.append(f"  +{a.profit:.3f}/acción  {a.reason}  ({fmt_left(a.buy_yes.seconds_left(now))})")

        b = self.book
        by_id = {m.id: m for m in self.markets}
        unreal = b.unrealized(by_id)
        equity = b.cash + sum(p.cost for p in b.positions.values()) + unreal
        wr = f"{b.win_rate:.0%}" if b.win_rate is not None else "—"
        lines += ["",
                  f"{BOLD}Cartera de papel{RESET}  capital {equity:,.2f} $ ({money(equity - b.start_cash)}) · "
                  f"realizado {money(b.realized)} · abierto {money(unreal)} · "
                  f"{len(b.positions)} posiciones · {len(b.trades)} cerradas · aciertos {wr}",
                  ""]
        lines += list(self.log)
        return "\n".join(lines)

    async def run(self) -> None:
        tasks = []
        # Los cortes de conexión del websocket ya se gestionan con reintentos; que no ensucien el panel
        asyncio.get_running_loop().set_exception_handler(lambda loop, ctx: None)
        if not self.demo:
            await self.seed_vol()
            tasks.append(asyncio.create_task(self.feed.run(self.state, self.stop)))
            tasks.append(asyncio.create_task(self.refresh_markets()))
            # espera al primer precio y a la primera lista de mercados
            for _ in range(20):
                if self.state.price > 0 and self.markets_updated:
                    break
                await asyncio.sleep(0.5)
        try:
            while not self.stop.is_set():
                started = time.monotonic()
                self.tick()
                if self.args.once:
                    print(self.render())
                    break
                sys.stdout.write("\x1b[H\x1b[2J" + self.render() + "\n")
                sys.stdout.flush()
                await asyncio.sleep(max(0.0, 1.0 - (time.monotonic() - started)))
        finally:
            self.stop.set()
            for t in tasks:
                t.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            if self.args.book:
                self.book.save(self.args.book)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="btcbot", description="Escáner de errores de precio en mercados de BTC (papel).")
    p.add_argument("--demo", action="store_true", help="mercados y precio simulados (funciona sin internet)")
    p.add_argument("--speed", type=float, default=10, help="demo: segundos simulados por segundo real")
    p.add_argument("--seed", type=int, default=None, help="demo: semilla para repetir la simulación")
    p.add_argument("--sim-markets", type=int, default=60, help="demo: número de mercados simulados")
    p.add_argument("--once", action="store_true", help="un solo escaneo, imprime y sale")
    p.add_argument("--no-trade", dest="trade", action="store_false", help="solo detectar, no operar en papel")
    p.add_argument("--min-edge", type=float, default=0.04, help="ventaja mínima por acción (0.04 = 4 cts)")
    p.add_argument("--fee", type=float, default=0.0, help="comisión por acción a descontar")
    p.add_argument("--max-spread", type=float, default=0.10)
    p.add_argument("--min-seconds", type=float, default=60, help="ignora mercados que cierran antes")
    p.add_argument("--refresh", type=float, default=15, help="en vivo: segundos entre descargas de mercados")
    p.add_argument("--top", type=int, default=12, help="oportunidades a mostrar")
    p.add_argument("--bankroll", type=float, default=1000)
    p.add_argument("--kelly", type=float, default=0.25, help="fracción de Kelly para dimensionar")
    p.add_argument("--max-stake", type=float, default=50)
    p.add_argument("--book", default="paper_book.json", help="archivo de la cartera ('' para no guardar)")
    p.add_argument("--reset", action="store_true", help="empieza la cartera de cero")
    return p


def main(argv=None) -> None:
    args = build_parser().parse_args(argv)
    try:
        asyncio.run(Bot(args).run())
    except KeyboardInterrupt:
        print("\nHasta luego. Cartera guardada en", args.book or "(sin guardar)")
