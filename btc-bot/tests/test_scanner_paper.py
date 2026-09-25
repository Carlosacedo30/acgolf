from datetime import datetime, timedelta, timezone

import pytest

from btcbot.app import Bot, build_parser
from btcbot.markets import ABOVE, TOUCH, UPDOWN, Market
from btcbot.paper import PaperBook
from btcbot.scanner import ScanConfig, evaluate, fair_probability, find_arbitrage, scan

NOW = datetime(2026, 9, 25, 12, 0, tzinfo=timezone.utc)


def mk(strike, bid, ask, kind=ABOVE, minutes=60, mid=None, **kw):
    return Market(mid or f"m{strike}{kind}", f"Bitcoin {kind} {strike}", kind,
                  NOW + timedelta(minutes=minutes), bid, ask, strike, **kw)


def test_evaluate_buys_cheap_yes_and_cheap_no():
    cfg = ScanConfig(min_edge=0.03)
    sig = evaluate(mk(100_000, 0.38, 0.40), 0.50, cfg, NOW)
    assert (sig.side, sig.price) == ("YES", 0.40) and sig.edge == pytest.approx(0.10)
    sig = evaluate(mk(100_000, 0.60, 0.62), 0.50, cfg, NOW)
    assert (sig.side, sig.price) == ("NO", pytest.approx(0.40)) and sig.edge == pytest.approx(0.10)
    assert evaluate(mk(100_000, 0.49, 0.51), 0.50, cfg, NOW) is None


def test_evaluate_respects_fee_spread_and_time():
    assert evaluate(mk(100_000, 0.38, 0.40), 0.50, ScanConfig(min_edge=0.03, fee=0.08), NOW) is None
    assert evaluate(mk(100_000, 0.10, 0.40), 0.50, ScanConfig(min_edge=0.03), NOW) is None
    assert evaluate(mk(100_000, 0.38, 0.40, minutes=0.5), 0.50, ScanConfig(min_edge=0.03), NOW) is None


def test_crossed_ladder_is_arbitrage():
    # "encima de 99k" debería valer más que "encima de 101k", pero cotiza más barato
    ladder = [mk(99_000, 0.28, 0.30), mk(101_000, 0.40, 0.42)]
    arbs = find_arbitrage(ladder, 100_000, ScanConfig(), NOW)
    assert len(arbs) == 1
    a = arbs[0]
    assert a.buy_yes.strike == 99_000 and a.buy_no.strike == 101_000
    assert a.profit == pytest.approx(0.10)


def test_consistent_ladder_has_no_arbitrage():
    ladder = [mk(99_000, 0.70, 0.72), mk(100_000, 0.48, 0.50), mk(101_000, 0.25, 0.27)]
    assert find_arbitrage(ladder, 100_000, ScanConfig(), NOW) == []


def test_updown_needs_reference_once_started():
    m = mk(0, 0.5, 0.52, kind=UPDOWN, minutes=10, start=NOW - timedelta(minutes=5))
    assert fair_probability(m, 100_000, 0.5, NOW) is None
    assert fair_probability(m, 100_500, 0.5, NOW, ref_price=100_000) > 0.9
    future = mk(0, 0.5, 0.52, kind=UPDOWN, minutes=20, start=NOW + timedelta(minutes=5), mid="f")
    assert fair_probability(future, 100_000, 0.5, NOW) == 0.5


def test_scan_ranks_signals_by_edge():
    markets = [mk(100_000, 0.30, 0.32), mk(100_000, 0.40, 0.42, minutes=61)]
    _, signals, _ = scan(markets, 100_000, 0.5, NOW, ScanConfig())
    assert [s.market.yes_ask for s in signals] == [0.32, 0.42]


def test_paper_settles_winners_and_losers(tmp_path):
    book = PaperBook(cash=1000, max_stake=50, kelly=1.0)
    win = evaluate(mk(99_000, 0.50, 0.52, mid="win"), 0.80, ScanConfig(), NOW)
    lose = evaluate(mk(101_000, 0.50, 0.52, mid="lose"), 0.80, ScanConfig(), NOW)
    p1, p2 = book.on_signal(win, NOW), book.on_signal(lose, NOW)
    assert p1.cost == pytest.approx(50) and book.on_signal(win, NOW) is None  # sin duplicar
    assert book.mark(100_000, NOW) == []  # aún no vence
    closed = book.mark(100_000, NOW + timedelta(hours=2))
    assert len(closed) == 2 and not book.positions
    assert book.realized == pytest.approx(p1.shares - p1.cost - p2.cost)
    path = tmp_path / "book.json"
    book.save(str(path))
    assert PaperBook.load(str(path)).realized == pytest.approx(book.realized)


def test_paper_touch_settles_early_when_barrier_hit():
    book = PaperBook(cash=1000, kelly=1.0)
    m = mk(101_000, 0.20, 0.22, kind=TOUCH, direction=1, mid="t")
    book.on_signal(evaluate(m, 0.40, ScanConfig(), NOW), NOW)
    assert book.mark(100_500, NOW, prev_spot=100_000) == []
    closed = book.mark(101_200, NOW + timedelta(minutes=1), prev_spot=100_500)
    assert len(closed) == 1 and closed[0].pnl > 0


def test_arbitrage_pays_in_every_scenario():
    ladder = [mk(99_000, 0.28, 0.30), mk(101_000, 0.40, 0.42)]
    arb = find_arbitrage(ladder, 100_000, ScanConfig(), NOW)[0]
    for final in (98_000, 100_000, 102_000):
        book = PaperBook(cash=1000, arb_stake=100)
        assert book.on_arbitrage(arb, NOW)
        book.mark(final, NOW + timedelta(hours=2))
        assert book.realized > 0


def test_demo_bot_runs_without_network():
    bot = Bot(build_parser().parse_args(["--demo", "--seed", "4", "--book", ""]))
    for _ in range(200):
        bot.tick()
    assert len(bot.markets) >= 50
    assert bot.state.price > 0
    text = bot.render()
    assert "BTC ARB SCANNER" in text and "Cartera de papel" in text


def test_arbitrage_never_opens_a_single_leg():
    ladder = [mk(99_000, 0.28, 0.30), mk(101_000, 0.40, 0.42)]
    arb = find_arbitrage(ladder, 100_000, ScanConfig(), NOW)[0]
    book = PaperBook(cash=1.5, arb_stake=100)  # no llega para las dos patas con ≥ 1 $ cada una
    assert not book.on_arbitrage(arb, NOW)
    assert book.positions == {} and book.cash == 1.5


def test_demo_arbitrage_never_loses():
    for seed in (1, 2):
        bot = Bot(build_parser().parse_args(["--demo", "--seed", str(seed), "--book", ""]))
        for _ in range(1500):
            bot.tick()
        by_pair = sum(t.pnl for t in bot.book.trades if t.tag == "arbitraje")
        assert by_pair >= -1e-6
