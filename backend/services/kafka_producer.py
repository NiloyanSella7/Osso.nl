import json
import logging

from aiokafka import AIOKafkaProducer

from config import settings

logger = logging.getLogger(__name__)


# Wrapper rond AIOKafkaProducer die berichten naar Kafka-topics publiceert
class KafkaProducerService:
    def __init__(self):
        self._producer: AIOKafkaProducer | None = None
        self._available = False

    # Start de onderliggende Kafka producer; schakelt zichzelf uit als Kafka niet bereikbaar is
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

    # Sluit de Kafka producer netjes af
    async def stop(self):
        if self._producer:
            await self._producer.stop()
            self._available = False

    # Stuurt een bericht naar het opgegeven topic en wacht op bevestiging; geeft False terug bij falen
    async def publish(self, topic: str, value: dict, key: str | None = None) -> bool:
        if not self._producer or not self._available:
            return False
        try:
            await self._producer.send_and_wait(topic, value=value, key=key)
            return True
        except Exception as e:
            logger.error(f"Kafka publish fout (topic={topic}): {e}")
            return False

    # Geeft aan of de producer succesvol verbonden is met Kafka
    @property
    def available(self) -> bool:
        return self._available


kafka_producer = KafkaProducerService()
