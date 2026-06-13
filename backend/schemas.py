from datetime import datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ─────────────────────────────────────────────────────────────────────


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Literal["bidder", "seller", "makelaar"] = "bidder"
    company_name: str | None = None  # Verplicht bij makelaar-registratie


# ── iDIN ─────────────────────────────────────────────────────────────────────


class IdinStartRequest(BaseModel):
    wallet_address: str

    @field_validator("wallet_address")
    @classmethod
    def validate_wallet(cls, v: str) -> str:
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Ongeldig wallet-adres")
        return v.lower()


class IdinCallbackRequest(BaseModel):
    idin_identifier: str
    wallet_address: str
    full_name: str | None = None


# ── User ─────────────────────────────────────────────────────────────────────


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    wallet_address: str | None
    role: str
    status: str
    idin_verified: bool
    assigned_property_id: int | None
    verified_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = None
    wallet_address: str | None = None


class InviteRequest(BaseModel):
    email: EmailStr
    full_name: str
    property_id: int | None = None


# ── Makelaar ──────────────────────────────────────────────────────────────────


class MakelaarOut(BaseModel):
    id: int
    company_name: str
    contact_name: str
    email: str
    phone: str | None
    logo_initials: str | None
    logo_color: str

    model_config = {"from_attributes": True}


# ── Property ─────────────────────────────────────────────────────────────────


class PropertyCreate(BaseModel):
    address: str
    postal_code: str | None = None
    city: str | None = None
    description: str | None = None
    asking_price: float
    rooms: int | None = None
    area_m2: int | None = None
    energy_label: str | None = None
    images: list[str] = []


class PropertyOut(BaseModel):
    id: int
    seller_id: int
    address: str
    postal_code: str | None
    city: str | None
    description: str | None
    asking_price: float
    status: str
    rooms: int | None
    area_m2: int | None
    energy_label: str | None
    images: list[str] = []
    makelaar: "MakelaarOut | None" = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PropertyUpdate(BaseModel):
    address: str | None = None
    postal_code: str | None = None
    city: str | None = None
    description: str | None = None
    asking_price: float | None = None
    rooms: int | None = None
    area_m2: int | None = None
    energy_label: str | None = None
    status: Literal["draft", "active", "sold"] | None = None


# ── Auction ──────────────────────────────────────────────────────────────────


class AuctionCreate(BaseModel):
    property_id: int
    start_date: datetime
    deadline: datetime


class AuctionOut(BaseModel):
    id: int
    property_id: int
    contract_auction_id: int | None
    start_date: datetime
    deadline: datetime
    status: str
    winner_wallet: str | None
    bid_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class AuctionStatus(BaseModel):
    id: int
    status: str
    deadline: datetime
    bid_count: int
    winner_wallet: str | None


# ── Bid ──────────────────────────────────────────────────────────────────────


class BidCreate(BaseModel):
    """
    Frontend stuurt alleen bedrag en voorbehoud.
    De backend verwerkt de blockchain-transactie en bepaalt tx_hash + block_number.
    """

    amount_usdc: float
    financing_condition: bool = False


class BidOut(BaseModel):
    id: int
    auction_id: int
    bidder_wallet: str
    amount_usdc: float | None = (
        None  # Alleen gevuld na deadline, gelezen van blockchain
    )
    tx_hash: str
    block_number: int
    financing_condition: bool
    bidder_name: str | None
    bidder_email: str | None
    bidder_phone: str | None
    indexed_at: datetime

    model_config = {"from_attributes": True}


# ── Blockchain verify ─────────────────────────────────────────────────────────


class BlockchainBid(BaseModel):
    bidder_wallet: str
    amount_usdc: float
    block_number: int
    tx_hash: str


class VerifyResponse(BaseModel):
    on_chain_bids: list[BlockchainBid]
    indexed_bids: list[BidOut]
    match: bool


# ── Blockchain feed ───────────────────────────────────────────────────────────


class BlockchainEntry(BaseModel):
    id: int
    tx_hash: str
    block_number: int
    bidder_wallet: str
    auction_id: int
    property_address: str
    financing_condition: bool
    indexed_at: datetime
