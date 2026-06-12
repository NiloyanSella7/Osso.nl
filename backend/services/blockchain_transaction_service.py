"""
Blockchain Transaction Service — Kafka Consumer.

Luistert naar 'blockchain.bid.submit' berichten, voert de Ethereum transactie uit
namens de operator wallet en publiceert het resultaat naar 'blockchain.bid.confirmed'.
Notificeert ook de wachtende Bids Service via asyncio.Event.
"""
import asyncio
import json
import logging

from aiokafka import AIOKafkaConsumer

from config import settings
from services.kafka_topics import BLOCKCHAIN_BID_SUBMIT, BLOCKCHAIN_BID_CONFIRMED
from services.kafka_producer import kafka_producer
from services.kafka_monitor_service import kafka_monitor
from services import pending_bids

logger = logging.getLogger(__name__)


async def run_blockchain_transaction_service() -> None:
    consumer: AIOKafkaConsumer | None = None
    try:
        consumer = AIOKafkaConsumer(
            BLOCKCHAIN_BID_SUBMIT,
            bootstrap_servers=settings.kafka_bootstrap_servers,
            group_id="blockchain-transaction-service",
            auto_offset_reset="latest",
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            session_timeout_ms=30000,
            heartbeat_interval_ms=10000,
        )
        await consumer.start()
        logger.info("Blockchain Transaction Service gestart — luistert naar blockchain.bid.submit")
    except Exception as e:
        logger.warning(f"Blockchain Transaction Service kon niet starten: {e}")
        return

    try:
        async for msg in consumer:
            data: dict = msg.value
            bid_key: str = data.get("bid_key", "")
            auction_id: int = data.get("auction_id", 0)
            bidder_wallet: str = data.get("bidder_wallet", "")
            amount_eurocents: int = data.get("amount_eurocents", 0)
            financing_condition: bool = data.get("financing_condition", False)

            logger.info(f"Blockchain tx verwerken: bid_key={bid_key[:8]}… auction={auction_id}")

            try:
                from blockchain.client import blockchain_client

                chain_result: dict = await asyncio.to_thread(
                    blockchain_client.place_bid,
                    auction_id=auction_id,
                    bidder_wallet=bidder_wallet,
                    amount_eurocents=amount_eurocents,
                    financing_condition=financing_condition,
                )

                tx_hash: str = chain_result["tx_hash"]
                block_number: int = chain_result["block_number"]

                confirmed: dict = {
                    "bid_key": bid_key,
                    "auction_id": auction_id,
                    "bidder_wallet": bidder_wallet,
                    "tx_hash": tx_hash,
                    "block_number": block_number,
                }

                await kafka_producer.publish(BLOCKCHAIN_BID_CONFIRMED, confirmed, key=bid_key)
                kafka_monitor.record(BLOCKCHAIN_BID_CONFIRMED, confirmed)

                pending_bids.resolve(bid_key, {"tx_hash": tx_hash, "block_number": block_number})
                logger.info(f"Blockchain tx bevestigd: tx={tx_hash} block={block_number}")

            except Exception as e:
                logger.error(f"Blockchain tx mislukt voor bid_key={bid_key[:8]}…: {e}")
                error_msg = str(e)
                pending_bids.resolve(bid_key, {"error": error_msg})
                kafka_monitor.record(BLOCKCHAIN_BID_CONFIRMED, {
                    "bid_key": bid_key,
                    "auction_id": auction_id,
                    "bidder_wallet": bidder_wallet,
                    "error": error_msg,
                    "status": "failed",
                })

    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Blockchain Transaction Service fout: {e}")
    finally:
        if consumer:
            await consumer.stop()
        logger.info("Blockchain Transaction Service gestopt")
