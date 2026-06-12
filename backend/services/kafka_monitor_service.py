import asyncio
from collections import deque
from datetime import datetime, timezone
from uuid import uuid4


class KafkaMonitorService:
    def __init__(self, max_messages: int = 300):
        self._messages: deque[dict] = deque(maxlen=max_messages)
        self._subscribers: list[asyncio.Queue] = []

    def record(self, topic: str, data: dict) -> dict:
        entry = {
            "id": str(uuid4()),
            "topic": topic,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._messages.append(entry)
        for q in self._subscribers:
            try:
                q.put_nowait(entry)
            except asyncio.QueueFull:
                pass
        return entry

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        try:
            self._subscribers.remove(q)
        except ValueError:
            pass

    def get_recent(self, limit: int = 100) -> list[dict]:
        return list(self._messages)[-limit:]

    @property
    def stats(self) -> dict:
        msgs = list(self._messages)
        by_topic: dict[str, int] = {}
        for m in msgs:
            by_topic[m["topic"]] = by_topic.get(m["topic"], 0) + 1
        return {"total": len(msgs), "by_topic": by_topic}


kafka_monitor = KafkaMonitorService()
