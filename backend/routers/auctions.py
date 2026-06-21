from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from dependencies import require_role
from models import AuditLog, Auction, Property, User
from schemas import AuctionCreate, AuctionOut, AuctionStatus

router = APIRouter(prefix="/api/auctions", tags=["auctions"])


def _auction_out(auction: Auction, db: Session | None = None) -> AuctionOut:
    # Bereken de effectieve status op basis van de deadline
    deadline_passed = auction.deadline < datetime.now()
    effective_status = (
        "closed" if (auction.status == "open" and deadline_passed) else auction.status
    )

    # Sla de gesloten status op in de DB als dat nog niet het geval is
    if effective_status == "closed" and auction.status == "open" and db:
        auction.status = "closed"
        db.flush()
        db.commit()

    out = AuctionOut(
        id=auction.id,
        property_id=auction.property_id,
        contract_auction_id=auction.contract_auction_id,
        start_date=auction.start_date,
        deadline=auction.deadline,
        status=effective_status,
        winner_wallet=auction.winner_wallet,
        bid_count=len(auction.bids) if auction.bids is not None else 0,
        created_at=auction.created_at,
    )
    return out


@router.get("/", response_model=list[AuctionOut])
def list_auctions(db: Annotated[Session, Depends(get_db)]):
    # haalt alle veilingen op inclusief biedingen
    auctions = db.query(Auction).options(joinedload(Auction.bids)).all()
    return [_auction_out(a, db) for a in auctions]


@router.get("/{auction_id}", response_model=AuctionOut)
def get_auction(auction_id: int, db: Annotated[Session, Depends(get_db)]):
    auction = (
        db.query(Auction)
        .options(joinedload(Auction.bids))
        .filter(Auction.id == auction_id)
        .first()
    )
    if not auction:
        raise HTTPException(status_code=404, detail="Veiling niet gevonden")
    return _auction_out(auction, db)


@router.get("/{auction_id}/status", response_model=AuctionStatus)
def get_auction_status(auction_id: int, db: Annotated[Session, Depends(get_db)]):
    # geeft compacte statusinformatie van een veiling terug (zonder volledige biedlijst)
    auction = (
        db.query(Auction)
        .options(joinedload(Auction.bids))
        .filter(Auction.id == auction_id)
        .first()
    )
    if not auction:
        raise HTTPException(status_code=404, detail="Veiling niet gevonden")
    return AuctionStatus(
        id=auction.id,
        status=auction.status,
        deadline=auction.deadline,
        bid_count=len(auction.bids),
        winner_wallet=auction.winner_wallet,
    )


@router.post("/", response_model=AuctionOut, status_code=status.HTTP_201_CREATED)
def create_auction(
    body: AuctionCreate,
    current_user: Annotated[User, Depends(require_role("seller", "makelaar", "admin"))],
    db: Annotated[Session, Depends(get_db)],
):
    # maakt een nieuwe veiling aan voor een bestaande woning
    prop = db.get(Property, body.property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Woning niet gevonden")

    # voorkomt dat er twee veilingen tegelijk lopen voor dezelfde woning
    if db.query(Auction).filter(Auction.property_id == body.property_id).first():
        raise HTTPException(
            status_code=400, detail="Er is al een veiling actief voor deze woning"
        )

    # valideert dat de deadline na de startdatum ligt
    if body.deadline <= body.start_date:
        raise HTTPException(
            status_code=422, detail="Deadline moet na de startdatum liggen"
        )

    auction = Auction(
        property_id=body.property_id,
        start_date=body.start_date,
        deadline=body.deadline,
        status="open",
    )
    db.add(auction)
    db.flush()

    # Probeer veiling ook op de blockchain aan te maken
    contract_auction_id: int | None = None
    try:
        from blockchain.client import blockchain_client

        contract_auction_id = blockchain_client.create_auction(
            property_id=body.property_id,
            deadline=int(body.deadline.timestamp()),
        )
        auction.contract_auction_id = contract_auction_id
    except Exception:
        pass  # Blockchain niet beschikbaar in dev

    # Woning activeren
    prop.status = "active"

    db.commit()
    db.refresh(auction)

    db.add(
        AuditLog(
            action_type="auction.create",
            user_id=current_user.id,
            entity_type="auction",
            entity_id=auction.id,
            details={"contract_auction_id": contract_auction_id},
        )
    )
    db.commit()
    return _auction_out(auction)


@router.post("/{auction_id}/close", response_model=AuctionOut)
def close_auction(
    auction_id: int,
    current_user: Annotated[User, Depends(require_role("makelaar", "admin"))],
    db: Annotated[Session, Depends(get_db)],
):
    auction = (
        db.query(Auction)
        .options(joinedload(Auction.bids))
        .filter(Auction.id == auction_id)
        .first()
    )
    if not auction:
        raise HTTPException(status_code=404, detail="Veiling niet gevonden")

    if auction.status != "open":
        raise HTTPException(status_code=400, detail="Veiling is al gesloten")

    # valideert dat de deadline al verstreken is voordat de veiling gesloten mag worden
    if datetime.now() < auction.deadline:
        raise HTTPException(status_code=400, detail="Deadline is nog niet verstreken")

    # bepaalt de winnaar als het bod met het hoogste bedrag
    winner_wallet: str | None = None
    if auction.bids:
        winning_bid = max(auction.bids, key=lambda b: b.amount_usdc or 0.0)
        winner_wallet = winning_bid.bidder_wallet

    # statusovergang van open naar closed
    auction.status = "closed"
    auction.winner_wallet = winner_wallet

    # sluit de veiling ook op de blockchain
    try:
        from blockchain.client import blockchain_client

        if auction.contract_auction_id:
            blockchain_client.close_auction(auction.contract_auction_id)
    except Exception:
        pass

    db.commit()
    db.refresh(auction)

    db.add(
        AuditLog(
            action_type="auction.close",
            user_id=current_user.id,
            entity_type="auction",
            entity_id=auction.id,
            details={"winner_wallet": winner_wallet},
        )
    )
    db.commit()
    return _auction_out(auction)
