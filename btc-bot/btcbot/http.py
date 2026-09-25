"""GET de JSON con la librería estándar (sin dependencias)."""
import json
import urllib.request

USER_AGENT = "btcbot/0.1 (+paper-trading scanner)"


def get_json(url: str, timeout: float = 10.0):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))
