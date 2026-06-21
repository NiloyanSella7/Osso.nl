import asyncio
import logging
from datetime import datetime
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import AuditLog, Auction, IndexedBid, User
from schemas import BidCreate, BidOut, VerifyResponse, BlockchainBid
from services.kafka_topics import BLOCKCHAIN_BID_SUBMIT
from services.kafka_producer import kafka_producer
from services.kafka_monitor_service import kafka_monitor
from services import pending_bids

router = APIRouter(prefix="/api/auctions", tags=["bids"])
logger = logging.getLogger(__name__)


@router.get("/{auction_id}/bids", response_model=list[BidOut])
def list_bids(auction_id: int, db: Annotated[Session, Depends(get_db)]):
    auction = db.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Veiling niet gevonden")

    # haalt geïndexeerde biedingen op uit MySQL, gesorteerd op tijdstip
    indexed = (
        db.query(IndexedBid)
        .filter(IndexedBid.auction_id == auction_id)
        .order_by(IndexedBid.indexed_at.asc())
        .all()
    )

    deadline_passed = datetime.now() > auction.deadline

    # na de deadline mogen de echte bedragen van de blockchain opgehaald worden
    if deadline_passed and indexed:
        try:
            from blockchain.client import blockchain_client

            chain_bids = blockchain_client.get_registry_bids(auction_id)
            amount_by_wallet = {
                b["bidder_wallet"].lower(): b["amount_eur"] for b in chain_bids
            }
            for bid in indexed:
                wallet = (bid.bidder_wallet or "").lower()
                if wallet in amount_by_wallet:
                    bid.amount_usdc = amount_by_wallet[wallet]
        except Exception:
            pass

    return list(reversed(indexed))


@router.post(
    "/{auction_id}/bids", response_model=BidOut, status_code=status.HTTP_201_CREATED
)
async def place_bid(
    auction_id: int,
    body: BidCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Bied-indieningsflow via Kafka:
    1. Valideer bieder en veiling
    2. Publiceer naar blockchain.bid.submit (Kafka)
    3. Blockchain Transaction Service pikt het op, voert tx uit, publiceert blockchain.bid.confirmed
    4. Wacht op bevestiging via asyncio.Event (max 30s)
    5. Sla bod op in MySQL als index van de blockchain
    Fallback: als Kafka niet beschikbaar is, directe blockchain call.
    """
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Veiling niet gevonden")
    if auction.status != "open":
        raise HTTPException(status_code=400, detail="Biedperiode is gesloten")
    # valideert dat de deadline nog niet verstreken is voordat een bod wordt geaccepteerd
    if datetime.now() > auction.deadline:
        raise HTTPException(status_code=400, detail="De bieddeadline is verstreken")

    if not current_user.idin_verified:
        raise HTTPException(
            status_code=403, detail="iDIN-verificatie vereist om te bieden"
        )
    if not current_user.wallet_address:
        raise HTTPException(
            status_code=403, detail="Geen wallet-adres gekoppeld aan uw account"
        )
    if body.amount_usdc <= 0:
        raise HTTPException(status_code=400, detail="Bod-bedrag moet positief zijn")

    # voorkomt dat een bieder twee keer bidt op dezelfde woning
    existing_bid = (
        db.query(IndexedBid)
        .filter(
            IndexedBid.auction_id == auction_id,
            IndexedBid.bidder_wallet == current_user.wallet_address,
        )
        .first()
    )
    if existing_bid:
        raise HTTPException(
            status_code=400, detail="U heeft al een bod uitgebracht op deze woning."
        )

    amount_eurocents = int(body.amount_usdc * 100)
    bid_key = str(uuid4())

    # ── Kafka flow ────────────────────────────────────────────────────────────
    bid_data = {
        "bid_key": bid_key,
        "auction_id": auction_id,
        "bidder_wallet": current_user.wallet_address,
        "amount_eurocents": amount_eurocents,
        "financing_condition": body.financing_condition,
    }

    # registreert een wacht-event en publiceert het bod naar Kafka
    event = pending_bids.create(bid_key)
    published = await kafka_producer.publish(
        BLOCKCHAIN_BID_SUBMIT, bid_data, key=bid_key
    )

    if published:
        kafka_monitor.record(BLOCKCHAIN_BID_SUBMIT, bid_data)
        logger.info(
            f"Bid gepubliceerd naar Kafka: bid_key={bid_key[:8]}… auction={auction_id}"
        )

    try:
        if published:
            # Wacht op bevestiging van de Blockchain Transaction Service
            try:
                await asyncio.wait_for(event.wait(), timeout=30.0)
                result = pending_bids.pop_result(bid_key)
                if not result or "error" in result:
                    raise HTTPException(
                        status_code=502,
                        detail=f"Blockchain transactie mislukt: {result.get('error', 'onbekende fout') if result else 'geen resultaat'}",
                    )
                tx_hash = result["tx_hash"]
                block_number = result["block_number"]
            except asyncio.TimeoutError:
                raise HTTPException(
                    status_code=504,
                    detail="Blockchain timeout: transactie kon niet bevestigd worden binnen 30 seconden",
                )
        else:
            # Fallback: directe blockchain call als Kafka niet beschikbaar is
            logger.warning(
                "Kafka niet beschikbaar — directe blockchain call als fallback"
            )
            try:
                from blockchain.client import blockchain_client

                # voert het bod direct op de blockchain uit zonder Kafka
                chain_result = await asyncio.to_thread(
                    blockchain_client.place_bid,
                    auction_id=auction_id,
                    bidder_wallet=current_user.wallet_address,
                    amount_eurocents=amount_eurocents,
                    financing_condition=body.financing_condition,
                )
                tx_hash = chain_result["tx_hash"]
                block_number = chain_result["block_number"]
            except Exception as e:
                raise HTTPException(
                    status_code=502, detail=f"Blockchain transactie mislukt: {str(e)}"
                )
    finally:
        pending_bids.remove(bid_key)

    # ── MySQL index (cache van blockchain — GEEN bedrag opslaan) ─────────────
    bid = IndexedBid(
        auction_id=auction_id,
        bidder_wallet=current_user.wallet_address,
        amount_usdc=None,
        tx_hash=tx_hash,
        block_number=block_number,
        financing_condition=body.financing_condition,
        bidder_name=current_user.full_name,
        bidder_email=None,
    )
    db.add(bid)
    db.commit()
    db.refresh(bid)

    db.add(
        AuditLog(
            action_type="bid.placed",
            user_id=current_user.id,
            wallet_address=current_user.wallet_address,
            tx_hash=tx_hash,
            entity_type="bid",
            entity_id=bid.id,
            details={
                "auction_id": auction_id,
                "block_number": block_number,
                "financing_condition": body.financing_condition,
                "kafka_used": published,
                "bid_key": bid_key,
            },
        )
    )
    db.commit()

    bid.amount_usdc = None
    return bid


@router.get("/{auction_id}/verify", response_model=VerifyResponse)
def verify_bids(auction_id: int, db: Annotated[Session, Depends(get_db)]):
    auction = db.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Veiling niet gevonden")

    # haalt de lokaal geïndexeerde biedingen op om te vergelijken met de blockchain
    indexed = (
        db.query(IndexedBid)
        .filter(IndexedBid.auction_id == auction_id)
        .order_by(IndexedBid.block_number)
        .all()
    )

    on_chain_bids: list[BlockchainBid] = []
    try:
        from blockchain.client import blockchain_client

        # haalt de daadwerkelijke biedingen direct van de blockchain op
        raw = blockchain_client.get_registry_bids(auction_id)
        on_chain_bids = [
            BlockchainBid(
                bidder_wallet=b["bidder_wallet"],
                amount_usdc=b["amount_eur"],
                block_number=b["block_number"],
                tx_hash="0x" + "0" * 64,
            )
            for b in raw
        ]
    except Exception:
        pass

    # vergelijkt aantallen om te controleren of de index overeenkomt met de blockchain
    match = len(indexed) == len(on_chain_bids)

    return VerifyResponse(
        on_chain_bids=on_chain_bids,
        indexed_bids=[BidOut.model_validate(b) for b in indexed],
        match=match,
    )
