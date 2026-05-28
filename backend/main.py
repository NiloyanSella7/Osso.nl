import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import Base, engine
from routers import auth, auctions, bids, blockchain, makelaars, properties, users

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Osso.nl API",
    description="Transparant woningbiedplatform met blockchain-integratie",
    version="1.0.0",
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


@app.on_event("startup")
async def startup():
    import models  # noqa: F401 — registreert alle modellen bij Base
    Base.metadata.create_all(bind=engine)
    _run_seed_if_empty()
    asyncio.create_task(_start_indexer())


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


async def _start_indexer():
    try:
        from services.event_indexer import run_event_indexer
        await run_event_indexer()
    except Exception as e:
        logger.warning(f"Event indexer kon niet starten: {e}")


@app.get("/api/health")
def health():
    try:
        from blockchain.client import blockchain_client
        chain_ok = blockchain_client.is_connected
    except Exception:
        chain_ok = False

    return {
        "status": "ok",
        "blockchain_connected": chain_ok,
        "version": "1.0.0",
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
