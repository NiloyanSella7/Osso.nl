import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import Base, engine
from routers import auth, auctions, bids, blockchain, makelaars, properties, users
from routers.kafka_monitor import router as kafka_monitor_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Osso.nl API",
    description="Transparant woningbiedplatform met blockchain en Kafka integratie",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(properties.router)
app.include_router(auctions.router)
app.include_router(bids.router)
app.include_router(makelaars.router)
app.include_router(blockchain.router)
app.include_router(kafka_monitor_router)


@app.on_event("startup")
async def startup():
    import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _run_seed_if_empty()
    _clear_stale_bids_if_blockchain_reset()

    # Kafka services starten
    asyncio.create_task(_start_kafka_services())


def _run_seed_if_empty():
    from sqlalchemy import text
    from database import SessionLocal
    db = SessionLocal()
    try:
        count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
        if count == 0:
            logger.info("Lege database gedetecteerd — seed wordt uitgevoerd...")
            from seed import run_seed
            run_seed()
            logger.info("Seed voltooid.")
    except Exception as e:
        logger.warning(f"Seed overgeslagen: {e}")
    finally:
        db.close()


def _clear_stale_bids_if_blockchain_reset():
    from database import SessionLocal
    from models import IndexedBid
    db = SessionLocal()
    try:
        indexed_count = db.query(IndexedBid).count()
        if indexed_count == 0:
            return
        from blockchain.client import blockchain_client
        chain_bids = blockchain_client.get_all_bids()
        if len(chain_bids) == 0:
            deleted = db.query(IndexedBid).delete()
            db.commit()
            if deleted:
                logger.info(f"Blockchain reset gedetecteerd — {deleted} verouderde biedingen verwijderd.")
    except Exception as e:
        logger.warning(f"Controle blockchain reset mislukt: {e}")
    finally:
        db.close()


async def _start_kafka_services():
    from services.kafka_producer import kafka_producer
    await kafka_producer.start()

    if kafka_producer.available:
        asyncio.create_task(_run_blockchain_transaction_service())
        asyncio.create_task(_run_event_indexer())
    else:
        logger.warning("Kafka niet beschikbaar — transacties verlopen via directe blockchain calls (fallback)")


async def _run_blockchain_transaction_service():
    try:
        from services.blockchain_transaction_service import run_blockchain_transaction_service
        await run_blockchain_transaction_service()
    except Exception as e:
        logger.error(f"Blockchain Transaction Service crashte: {e}")


async def _run_event_indexer():
    try:
        from services.event_indexer import run_event_indexer
        await run_event_indexer()
    except Exception as e:
        logger.error(f"Event Indexer crashte: {e}")


@app.on_event("shutdown")
async def shutdown():
    from services.kafka_producer import kafka_producer
    await kafka_producer.stop()
    logger.info("Kafka producer gestopt")


@app.get("/api/health")
def health():
    try:
        from blockchain.client import blockchain_client
        chain_ok = blockchain_client.is_connected
    except Exception:
        chain_ok = False

    from services.kafka_producer import kafka_producer

    return {
        "status": "ok",
        "blockchain_connected": chain_ok,
        "kafka_available": kafka_producer.available,
        "version": "2.0.0",
    }


@app.get("/api/blockchain/status")
def blockchain_status():
    try:
        from blockchain.client import blockchain_client
        connected = blockchain_client.is_connected
        block = blockchain_client.w3.eth.block_number if connected else None
    except Exception:
        connected = False
        block = None

    return {
        "connected": connected,
        "provider": settings.web3_provider_url,
        "latest_block": block,
        "auction_manager": settings.auction_manager_address,
        "bid_escrow": settings.bid_escrow_address,
        "kyc_gate": settings.kyc_gate_address,
    }
