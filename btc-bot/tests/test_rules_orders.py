"""Reglas de oro de la Lección 3 y órdenes en lenguaje sencillo."""
from datetime import timedelta

from btcbot.orders import euros, no_trade_reason, signal_order
from btcbot.paper import PaperBook
from btcbot.scanner import ScanConfig, evaluate, find_arbitrage

from test_scanner_paper import NOW, mk


def big_edge(mid="m"):
    # Ventaja enorme: Kelly querría apostar mucho; las reglas lo frenan
    return evaluate(mk(100_000, 0.28, 0.30, mid=mid), 0.80, ScanConfig(), NOW)


def test_never_more_than_5_percent_per_bet():
    book = PaperBook(cash=500, max_stake=1_000, kelly=1.0)
    book.start_day(NOW, 500)
    assert abs(book.on_signal(big_edge(), NOW, equity=500).cost - 25) < 1e-9  # 500 ÷ 20


def test_bet_limited_to_what_is_left_of_the_daily_loss():
    # Ejercicio: 500 $, hoy se han perdido 40 → solo quedan 10 $ hasta el límite de 50
    book = PaperBook(cash=460, max_stake=1_000, kelly=1.0)
    book.start_day(NOW, 500)
    pos = book.on_signal(big_edge(), NOW, equity=460)
    assert abs(pos.cost - 10) < 1e-9


def test_stops_for_the_day_after_losing_10_percent_even_with_great_edge():
    # Ejercicio: 500 $, hoy se han perdido 55 → parado, aunque la ventaja sea +0,15 o más
    book = PaperBook(cash=445, max_stake=1_000, kelly=1.0)
    book.start_day(NOW, 500)
    assert book.stopped(445)
    assert book.on_signal(big_edge(), NOW, equity=445) is None
    arb = find_arbitrage([mk(99_000, 0.28, 0.30), mk(101_000, 0.40, 0.42)], 100_000, ScanConfig(), NOW)[0]
    assert not book.on_arbitrage(arb, NOW, equity=445)
    # Al día siguiente se vuelve a empezar
    tomorrow = NOW + timedelta(days=1)
    book.start_day(tomorrow, 445)
    assert not book.stopped(445)
    assert book.on_signal(big_edge("otro"), tomorrow, equity=445) is not None


def test_plain_language_orders():
    assert euros(1234.5) == "1.234,50"
    book = PaperBook(cash=500, kelly=1.0)
    sig = big_edge()
    text = signal_order(sig, book.on_signal(sig, NOW))
    assert text.startswith("COMPRA SÍ en «Bitcoin above 100000» a 0,30 $")
    assert "vale 0,80, está 0,50 más barata" in text
    assert "PARADO POR HOY" in no_trade_reason(True, True)
    assert "NO HAGAS NADA" in no_trade_reason(False, False)
