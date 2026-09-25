import pytest

from btcbot.markets import ABOVE, BELOW, BETWEEN, TOUCH, UPDOWN, classify, market_from_gamma, parse_amount


@pytest.mark.parametrize("question,group,expected", [
    ("Will the price of Bitcoin be above $110,000 on September 26?", "", (ABOVE, 110_000, 0, 0)),
    ("Bitcoin above 110,000 on September 26?", "110,000", (ABOVE, 110_000, 0, 0)),
    ("Will Bitcoin be less than $100k on October 1?", "", (BELOW, 100_000, 0, 0)),
    ("Will the price of Bitcoin be between $108,000 and $110,000 on September 26?", "",
     (BETWEEN, 108_000, 110_000, 0)),
    ("Will Bitcoin reach $150,000 in September?", "↑ 150,000", (TOUCH, 150_000, 0, 1)),
    ("Will Bitcoin dip to $90,000 in September?", "↓ 90,000", (TOUCH, 90_000, 0, -1)),
    ("What price will Bitcoin hit in September?", "↓ 95,000", (TOUCH, 95_000, 0, -1)),
    ("Bitcoin Up or Down - September 25, 3PM ET", "", (UPDOWN, 0, 0, 0)),
])
def test_classify(question, group, expected):
    assert classify(question, group) == expected


def test_classify_ignores_other_assets_and_unpriceable():
    assert classify("Will Ethereum be above $5,000 on Friday?") is None
    assert classify("Will a Bitcoin ETF be approved in 2026?") is None


def test_parse_amount():
    assert parse_amount("1.5", "m") == 1_500_000
    assert parse_amount("120", "k") == 120_000


def test_market_from_gamma():
    raw = {
        "id": "123", "question": "Will the price of Bitcoin be above $110,000 on September 26?",
        "endDate": "2026-09-26T16:00:00Z", "bestBid": 0.41, "bestAsk": 0.43,
        "outcomes": '["Yes", "No"]', "outcomePrices": '["0.42", "0.58"]', "liquidityNum": 5000,
        "active": True, "closed": False,
    }
    m = market_from_gamma(raw, {"id": "ev1", "slug": "bitcoin-above-on-september-26"})
    assert m.kind == ABOVE and m.strike == 110_000
    assert (m.yes_bid, m.yes_ask) == (0.41, 0.43)
    assert m.expiry.isoformat() == "2026-09-26T16:00:00+00:00"
    assert m.url.endswith("bitcoin-above-on-september-26")


def test_market_from_gamma_falls_back_to_outcome_prices_and_skips_closed():
    raw = {"id": "1", "question": "Bitcoin above 100,000 on October 1?", "endDate": "2026-10-01T16:00:00Z",
           "outcomePrices": '["0.7", "0.3"]'}
    assert market_from_gamma(raw).yes_ask == 0.7
    assert market_from_gamma({**raw, "closed": True}) is None
