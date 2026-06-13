from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Auction, IndexedBid, Property
from schemas import BlockchainEntry

router = APIRouter(prefix="/api/blockchain", tags=["blockchain"])


@router.get("/feed", response_model=list[BlockchainEntry])
def blockchain_feed(
    db: Annotated[Session, Depends(get_db)],
    limit: int = 100,
):
    """
    Live blockchain-feed: alle geïndexeerde biedingen gesorteerd op tijdstip.
    Bedragen worden NOOIT meegestuurd — alleen metadata.
    """
    bids = (
        db.query(IndexedBid)
        .join(Auction, IndexedBid.auction_id == Auction.id)
        .join(Property, Auction.property_id == Property.id)
        .order_by(IndexedBid.indexed_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for bid in bids:
        auction = db.get(Auction, bid.auction_id)
        prop = db.get(Property, auction.property_id) if auction else None
        result.append(
            BlockchainEntry(
                id=bid.id,
                tx_hash=bid.tx_hash,
                block_number=bid.block_number,
                bidder_wallet=bid.bidder_wallet,
                auction_id=bid.auction_id,
                property_address=prop.address if prop else "Onbekend",
                financing_condition=bid.financing_condition,
                indexed_at=bid.indexed_at,
            )
        )
    return result
