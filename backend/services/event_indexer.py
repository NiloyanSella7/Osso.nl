"""
Event indexer: luistert naar BidPlaced-events van OssoBidRegistry
en schrijft de relevante data weg naar MySQL als leescache.
De blockchain blijft de bron van waarheid.
"""
import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from database import SessionLocal
from models import IndexedBid

logger = logging.getLogger(__name__)


async def run_event_indexer(poll_interval: int = 10) -> None:
    """
    Achtergrondtaak die continu BidPlaced-events ophaalt uit OssoBidRegistry
    en indexeert naar MySQL. Draait als asyncio-taak naast de FastAPI server.
    """
    try:
        from blockchain.client import blockchain_client
        if not blockchain_client.is_connected or not blockchain_client.registry:
            logger.warning("Blockchain niet beschikbaar — event indexer gestopt")
            return
    except Exception as e:
        logger.warning(f"Blockchain client initialisatiefout: {e}")
        return

    last_block = 0
    logger.info("Event indexer gestart — luistert naar OssoBidRegistry.BidPlaced")

    while True:
        try:
            current_block = blockchain_client.w3.eth.block_number

            if current_block > last_block:
                from_block = max(last_block + 1, current_block - 1000)

                events = (
                    blockchain_client.registry.events
                    .BidPlaced()
                    .get_logs(from_block=from_block, to_block=current_block)
                )

                if events:
                    db = SessionLocal()
                    try:
                        for event in events:
                            await _index_bid_placed(event, db)
                    finally:
                        db.close()

                last_block = current_block

        except Exception as e:
            logger.error(f"Event indexer fout: {e}")

        await asyncio.sleep(poll_interval)


async def _index_bid_placed(event: dict, db: Session) -> None:
    """Verwerkt een BidPlaced-event en slaat het op in MySQL."""
    args = event["args"]
    tx_hash = "0x" + event["transactionHash"].hex()

    if db.query(IndexedBid).filter(IndexedBid.tx_hash == tx_hash).first():
        return  # Al geïndexeerd

    bid = IndexedBid(
        auction_id=args["auctionId"],
        bidder_wallet=args["bidderWallet"].lower(),
        amount_usdc=None,  # Bedrag wordt NOOIT opgeslagen in MySQL — alleen op blockchain
        financing_condition=args["financingCondition"],
        tx_hash=tx_hash,
        block_number=event["blockNumber"],
        indexed_at=datetime.now(timezone.utc),
    )
    db.add(bid)
    db.commit()
    logger.info(f"Bod geïndexeerd via event: tx={tx_hash} auction={args['auctionId']}")
