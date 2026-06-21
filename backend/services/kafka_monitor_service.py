import asyncio
from collections import deque
from datetime import datetime, timezone
from uuid import uuid4


# Houdt een rollend overzicht bij van recente Kafka-berichten, voor monitoring/dashboard
class KafkaMonitorService:
    def __init__(self, max_messages: int = 300):
        self._messages: deque[dict] = deque(maxlen=max_messages)
        self._subscribers: list[asyncio.Queue] = []

    # Slaat een Kafka-bericht op en stuurt het door naar alle live-subscribers
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

    # Registreert een nieuwe queue om live updates op te ontvangen (bv. SSE/websocket)
    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._subscribers.append(q)
        return q

    # Verwijdert een queue uit de lijst van live-subscribers
    def unsubscribe(self, q: asyncio.Queue):
        try:
            self._subscribers.remove(q)
        except ValueError:
            pass

    # Geeft de meest recente berichten terug, max `limit` stuks
    def get_recent(self, limit: int = 100) -> list[dict]:
        return list(self._messages)[-limit:]

    # Berekent het totaal aantal berichten en de verdeling per topic
    @property
    def stats(self) -> dict:
        msgs = list(self._messages)
        by_topic: dict[str, int] = {}
        for m in msgs:
            by_topic[m["topic"]] = by_topic.get(m["topic"], 0) + 1
        return {"total": len(msgs), "by_topic": by_topic}


kafka_monitor = KafkaMonitorService()
