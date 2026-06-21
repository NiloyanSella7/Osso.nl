import asyncio

_pending: dict[str, asyncio.Event] = {}
_results: dict[str, dict] = {}


# Registreert een nieuw wachtend bod en geeft het event terug om op te wachten
def create(bid_key: str) -> asyncio.Event:
    event = asyncio.Event()
    _pending[bid_key] = event
    return event


# Slaat het resultaat op en maakt het wachtende event los (signaal naar wachtende request)
def resolve(bid_key: str, result: dict) -> bool:
    event = _pending.get(bid_key)
    if event:
        _results[bid_key] = result
        event.set()
        return True
    return False


# Haalt het resultaat op en verwijdert het direct uit het geheugen
def pop_result(bid_key: str) -> dict | None:
    return _results.pop(bid_key, None)


# Verwijdert een wachtend bod, bv. na timeout
def remove(bid_key: str):
    _pending.pop(bid_key, None)
