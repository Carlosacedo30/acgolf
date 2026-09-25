import math
import random

import pytest

from btcbot import pricing
from btcbot.volatility import RollingVol, vol_from_closes

DAY = 1 / 365


def test_at_the_money_is_about_half():
    p = pricing.prob_above(100_000, 100_000, 0.5, DAY)
    assert 0.49 < p < 0.5  # algo menos de 0.5 por la corrección de convexidad


def test_prob_above_is_monotone_in_strike():
    ps = [pricing.prob_above(100_000, k, 0.5, DAY) for k in range(95_000, 105_001, 1_000)]
    assert all(a > b for a, b in zip(ps, ps[1:]))


def test_expired_market_is_binary():
    assert pricing.prob_above(101, 100, 0.5, 0) == 1.0
    assert pricing.prob_above(99, 100, 0.5, 0) == 0.0


def test_between_equals_difference_of_aboves():
    lo, hi = pricing.prob_above(100_000, 99_000, 0.5, DAY), pricing.prob_above(100_000, 101_000, 0.5, DAY)
    assert pricing.prob_between(100_000, 99_000, 101_000, 0.5, DAY) == pytest.approx(lo - hi)


def test_touch_is_about_twice_the_terminal_probability():
    above = pricing.prob_above(100_000, 105_000, 0.5, 7 * DAY)
    touch = pricing.prob_touch(100_000, 105_000, 0.5, 7 * DAY, direction=1)
    assert touch == pytest.approx(2 * above, rel=0.1)
    assert touch > above


def test_touch_already_crossed_is_certain():
    assert pricing.prob_touch(106_000, 105_000, 0.5, DAY, direction=1) == 1.0
    assert pricing.prob_touch(89_000, 90_000, 0.5, DAY, direction=-1) == 1.0
    assert pricing.prob_touch(100_000, 90_000, 0.5, DAY, direction=-1) < 0.2


def test_rolling_vol_recovers_true_vol():
    rng = random.Random(7)
    true_vol, px = 0.6, 100_000.0
    rv = RollingVol(window_seconds=3600, prior=0.1, floor=0.01, cap=5)
    for t in range(3600):
        px *= math.exp(rng.gauss(0, 1) * true_vol * math.sqrt(1 / pricing.SECONDS_PER_YEAR))
        rv.add(float(t), px)
    assert rv.value() == pytest.approx(true_vol, rel=0.1)


def test_vol_from_closes():
    rng = random.Random(3)
    closes, px = [], 100.0
    for _ in range(2000):
        px *= math.exp(rng.gauss(0, 1) * 0.5 * math.sqrt(60 / pricing.SECONDS_PER_YEAR))
        closes.append(px)
    assert vol_from_closes(closes, 60) == pytest.approx(0.5, rel=0.1)
