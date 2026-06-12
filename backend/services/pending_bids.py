import asyncio

_pending: dict[str, asyncio.Event] = {}
_results: dict[str, dict] = {}


def create(bid_key: str) -> asyncio.Event:
    event = asyncio.Event()
    _pending[bid_key] = event
    return event


def resolve(bid_key: str, result: dict) -> bool:
    event = _pending.get(bid_key)
    if event:
        _results[bid_key] = result
        event.set()
        return True
    return False


def pop_result(bid_key: str) -> dict | None:
    return _results.pop(bid_key, None)


def remove(bid_key: str):
    _pending.pop(bid_key, None)
