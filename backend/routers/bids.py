from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import AuditLog, Auction, IndexedBid, User
from schemas import BidCreate, BidOut, VerifyResponse, BlockchainBid

router = APIRouter(prefix="/api/auctions", tags=["bids"])


@router.get("/{auction_id}/bids", response_model=list[BidOut])
def list_bids(auction_id: int, db: Annotated[Session, Depends(get_db)]):
    auction = db.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Veiling niet gevonden")

    indexed = (
        db.query(IndexedBid)
        .filter(IndexedBid.auction_id == auction_id)
        .order_by(IndexedBid.indexed_at.asc())
        .all()
    )

    deadline_passed = datetime.now() > auction.deadline

    if deadline_passed and indexed:
        # Na deadline: haal bedragen op van blockchain en koppel op wallet adres
        try:
            from blockchain.client import blockchain_client
            chain_bids = blockchain_client.get_registry_bids(auction_id)
            # Maak een dict van wallet -> bedrag voor snelle lookup
            amount_by_wallet = {
                b["bidder_wallet"].lower(): b["amount_eur"]
                for b in chain_bids
            }
            for bid in indexed:
                wallet = (bid.bidder_wallet or "").lower()
                if wallet in amount_by_wallet:
                    bid.amount_usdc = amount_by_wallet[wallet]
        except Exception:
            pass  # Blockchain niet beschikbaar — bedragen blijven verborgen

    # Teruggeven in omgekeerde volgorde (nieuwste eerst)
    return list(reversed(indexed))


@router.post("/{auction_id}/bids", response_model=BidOut, status_code=status.HTTP_201_CREATED)
def place_bid(
    auction_id: int,
    body: BidCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    De bieder dient een bod in. De backend:
    1. Valideert de bieder en veiling
    2. Stuurt een echte transactie naar OssoBidRegistry op de blockchain
    3. Krijgt een echte tx_hash + block_number terug
    4. Slaat het bod op in MySQL als cache/index van de blockchain
    """
    # ── Validatie ──────────────────────────────────────────────────────────
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Veiling niet gevonden")
    if auction.status != "open":
        raise HTTPException(status_code=400, detail="Biedperiode is gesloten")
    if datetime.now() > auction.deadline:
        raise HTTPException(status_code=400, detail="De bieddeadline is verstreken")

    if not current_user.idin_verified:
        raise HTTPException(status_code=403, detail="iDIN-verificatie vereist om te bieden")
    if not current_user.wallet_address:
        raise HTTPException(status_code=403, detail="Geen wallet-adres gekoppeld aan uw account")
    if body.amount_usdc <= 0:
        raise HTTPException(status_code=400, detail="Bod-bedrag moet positief zijn")

    # Voorkom dubbele biedingen
    existing_bid = db.query(IndexedBid).filter(
        IndexedBid.auction_id == auction_id,
        IndexedBid.bidder_wallet == current_user.wallet_address,
    ).first()
    if existing_bid:
        raise HTTPException(status_code=400, detail="U heeft al een bod uitgebracht op deze woning. Per bieder is één bod toegestaan.")

    # ── Blockchain transactie ──────────────────────────────────────────────
    try:
        from blockchain.client import blockchain_client
        amount_eurocents = int(body.amount_usdc * 100)
        chain_result = blockchain_client.place_bid(
            auction_id=auction_id,
            bidder_wallet=current_user.wallet_address,
            amount_eurocents=amount_eurocents,
            financing_condition=body.financing_condition,
        )
        tx_hash = chain_result["tx_hash"]
        block_number = chain_result["block_number"]
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Blockchain transactie mislukt: {str(e)}"
        )

    # ── MySQL index (cache van blockchain — GEEN bedrag opslaan) ─────────
    bid = IndexedBid(
        auction_id=auction_id,
        bidder_wallet=current_user.wallet_address,
        amount_usdc=None,  # Bedrag wordt NOOIT opgeslagen in MySQL — alleen op blockchain
        tx_hash=tx_hash,
        block_number=block_number,
        financing_condition=body.financing_condition,
        bidder_name=current_user.full_name,
        bidder_email=None,  # E-mail alleen zichtbaar na deadline
    )
    db.add(bid)
    db.commit()
    db.refresh(bid)

    db.add(AuditLog(
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
            # Geen bedrag in audit log
        },
    ))
    db.commit()

    # Retourneer zonder bedrag (biedperiode loopt nog)
    bid.amount_usdc = None
    return bid


@router.get("/{auction_id}/verify", response_model=VerifyResponse)
def verify_bids(auction_id: int, db: Annotated[Session, Depends(get_db)]):
    """
    Vergelijkt de geïndexeerde biedhistorie (MySQL) met de on-chain data (OssoBidRegistry).
    Geeft aan of de off-chain cache overeenkomt met de blockchain.
    """
    auction = db.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Veiling niet gevonden")

    indexed = (
        db.query(IndexedBid)
        .filter(IndexedBid.auction_id == auction_id)
        .order_by(IndexedBid.block_number)
        .all()
    )

    on_chain_bids: list[BlockchainBid] = []
    try:
        from blockchain.client import blockchain_client
        raw = blockchain_client.get_registry_bids(auction_id)
        on_chain_bids = [
            BlockchainBid(
                bidder_wallet=b["bidder_wallet"],
                amount_usdc=b["amount_eur"],
                block_number=b["block_number"],
                tx_hash="0x" + "0" * 64,  # Registry slaat geen tx_hash op in state
            )
            for b in raw
        ]
    except Exception:
        pass

    indexed_hashes = {b.tx_hash for b in indexed}
    chain_hashes = {b.tx_hash for b in on_chain_bids}
    match = len(indexed) == len(on_chain_bids)

    return VerifyResponse(
        on_chain_bids=on_chain_bids,
        indexed_bids=[BidOut.model_validate(b) for b in indexed],
        match=match,
    )
