"""
Event Indexer: consumeert blockchain.bid.confirmed events van Kafka
en schrijft de relevante data weg naar MySQL als leescache.
De blockchain blijft de bron van waarheid.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone

from aiokafka import AIOKafkaConsumer

from config import settings
from database import SessionLocal
from models import IndexedBid
from services.kafka_topics import BLOCKCHAIN_BID_CONFIRMED
from services.kafka_monitor_service import kafka_monitor

logger = logging.getLogger(__name__)


async def run_event_indexer() -> None:
    """
    Consumeert blockchain.bid.confirmed berichten van Kafka en indexeert ze naar MySQL.
    Werkt samen met de Blockchain Transaction Service: die publiceert de bevestigingen,
    de Event Indexer schrijft ze weg naar de database.
    """
    consumer: AIOKafkaConsumer | None = None
    try:
        consumer = AIOKafkaConsumer(
            BLOCKCHAIN_BID_CONFIRMED,
            bootstrap_servers=settings.kafka_bootstrap_servers,
            group_id="event-indexer",
            auto_offset_reset="latest",
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            session_timeout_ms=30000,
            heartbeat_interval_ms=10000,
        )
        await consumer.start()
        logger.info("Event Indexer gestart — consumeert blockchain.bid.confirmed")
    except Exception as e:
        logger.warning(f"Event Indexer kon niet starten (Kafka niet beschikbaar): {e}")
        return

    try:
        async for msg in consumer:
            data: dict = msg.value

            if data.get("status") == "failed" or "error" in data:
                logger.warning(f"Mislukte transactie ontvangen, niet geïndexeerd: {data}")
                continue

            tx_hash: str = data.get("tx_hash", "")
            auction_id: int = data.get("auction_id", 0)
            bidder_wallet: str = data.get("bidder_wallet", "")
            block_number: int = data.get("block_number", 0)

            if not tx_hash or not auction_id:
                continue

            db = SessionLocal()
            try:
                if db.query(IndexedBid).filter(IndexedBid.tx_hash == tx_hash).first():
                    continue  # Al geïndexeerd door de Bids Router

                bid = IndexedBid(
                    auction_id=auction_id,
                    bidder_wallet=bidder_wallet.lower(),
                    amount_usdc=None,
                    tx_hash=tx_hash,
                    block_number=block_number,
                    indexed_at=datetime.now(timezone.utc),
                )
                db.add(bid)
                db.commit()
                logger.info(f"Bod geïndexeerd via Kafka Event Indexer: tx={tx_hash} auction={auction_id}")
            except Exception as e:
                logger.error(f"Event Indexer DB fout: {e}")
                db.rollback()
            finally:
                db.close()

    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Event Indexer fout: {e}")
    finally:
        if consumer:
            await consumer.stop()
        logger.info("Event Indexer gestopt")
