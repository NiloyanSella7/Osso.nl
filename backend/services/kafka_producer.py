import json
import logging

from aiokafka import AIOKafkaProducer

from config import settings

logger = logging.getLogger(__name__)


class KafkaProducerService:
    def __init__(self):
        self._producer: AIOKafkaProducer | None = None
        self._available = False

    async def start(self):
        try:
            self._producer = AIOKafkaProducer(
                bootstrap_servers=settings.kafka_bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
            )
            await self._producer.start()
            self._available = True
            logger.info(f"Kafka producer gestart ({settings.kafka_bootstrap_servers})")
        except Exception as e:
            logger.warning(f"Kafka niet beschikbaar — producer uitgeschakeld: {e}")
            self._producer = None
            self._available = False

    async def stop(self):
        if self._producer:
            await self._producer.stop()
            self._available = False

    async def publish(self, topic: str, value: dict, key: str | None = None) -> bool:
        if not self._producer or not self._available:
            return False
        try:
            await self._producer.send_and_wait(topic, value=value, key=key)
            return True
        except Exception as e:
            logger.error(f"Kafka publish fout (topic={topic}): {e}")
            return False

    @property
    def available(self) -> bool:
        return self._available


kafka_producer = KafkaProducerService()
