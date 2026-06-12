import asyncio

import pytest

from services import pending_bids


def setup_function():
    pending_bids._pending.clear()
    pending_bids._results.clear()


def test_create_returns_event():
    event = pending_bids.create("bid-001")
    assert isinstance(event, asyncio.Event)
    assert not event.is_set()


def test_resolve_sets_event_and_stores_result():
    event = pending_bids.create("bid-002")
    ok = pending_bids.resolve("bid-002", {"tx_hash": "0xabc", "block_number": 5})
    assert ok is True
    assert event.is_set()


def test_pop_result_returns_and_removes():
    pending_bids.create("bid-003")
    pending_bids.resolve("bid-003", {"tx_hash": "0xdef"})
    result = pending_bids.pop_result("bid-003")
    assert result == {"tx_hash": "0xdef"}
    assert pending_bids.pop_result("bid-003") is None


def test_pop_result_missing_key_returns_none():
    assert pending_bids.pop_result("nonexistent") is None


def test_resolve_missing_key_returns_false():
    ok = pending_bids.resolve("nonexistent", {"tx_hash": "0x000"})
    assert ok is False


def test_remove_cleans_up():
    pending_bids.create("bid-004")
    pending_bids.remove("bid-004")
    assert "bid-004" not in pending_bids._pending


def test_remove_missing_key_does_not_raise():
    pending_bids.remove("does-not-exist")


@pytest.mark.asyncio
async def test_wait_for_resolve():
    event = pending_bids.create("bid-005")

    async def resolve_after_delay():
        await asyncio.sleep(0.05)
        pending_bids.resolve("bid-005", {"tx_hash": "0x123"})

    asyncio.create_task(resolve_after_delay())
    await asyncio.wait_for(event.wait(), timeout=1.0)
    result = pending_bids.pop_result("bid-005")
    assert result == {"tx_hash": "0x123"}
