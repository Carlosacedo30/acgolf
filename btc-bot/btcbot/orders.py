"""Traduce las decisiones del bot a órdenes en lenguaje sencillo."""
from .paper import Position
from .scanner import Arbitrage, Signal


def euros(x: float, decimals: int = 2) -> str:
    """Número al estilo español: 1.234,56"""
    text = f"{x:,.{decimals}f}"
    return text.replace(",", "_").replace(".", ",").replace("_", ".")


def signal_order(sig: Signal, pos: Position) -> str:
    lado = "SÍ" if sig.side == "YES" else "NO"
    return (f"COMPRA {lado} en «{sig.market.question}» a {euros(sig.price)} $ · "
            f"apuesta {euros(pos.cost)} $ · motivo: vale {euros(sig.fair)}, "
            f"está {euros(sig.fair - sig.price)} más barata de lo que debería")


def arbitrage_order(arb: Arbitrage, stake: float) -> str:
    return (f"ARBITRAJE · compra SÍ en «{arb.buy_yes.question}» a {euros(arb.buy_yes.yes_ask)} $ "
            f"y NO en «{arb.buy_no.question}» a {euros(1 - arb.buy_no.yes_bid)} $ · "
            f"apuesta {euros(stake)} $ · motivo: precios imposibles, "
            f"ganas al menos {euros(arb.profit)} por pareja pase lo que pase")


def no_trade_reason(stopped: bool, has_signals: bool) -> str:
    if stopped:
        return "🛑 PARADO POR HOY: se ha perdido el 10 % del día. Mañana más (regla de oro 2)."
    if not has_signals:
        return "NO HAGAS NADA: ninguna apuesta está lo bastante mal de precio. No operar también es decidir."
    return "NO HAGAS NADA: las oportunidades que hay ya están en cartera."
