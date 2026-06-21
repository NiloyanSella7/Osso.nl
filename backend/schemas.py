from datetime import datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ─────────────────────────────────────────────────────────────────────


# Inloggegevens voor authenticatie
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# JWT-token die na succesvolle login wordt teruggegeven
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Gegevens voor het registreren van een nieuwe gebruiker
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Literal["bidder", "seller", "makelaar"] = "bidder"
    company_name: str | None = None  # Verplicht bij makelaar-registratie


# ── iDIN ─────────────────────────────────────────────────────────────────────


# Verzoek om de iDIN-verificatie te starten met een gekoppeld wallet-adres
class IdinStartRequest(BaseModel):
    wallet_address: str

    # Controleert of het wallet-adres een geldig Ethereum-formaat heeft
    @field_validator("wallet_address")
    @classmethod
    def validate_wallet(cls, v: str) -> str:
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Ongeldig wallet-adres")
        return v.lower()


# Callback-gegevens die na iDIN-verificatie worden ontvangen
class IdinCallbackRequest(BaseModel):
    idin_identifier: str
    wallet_address: str
    full_name: str | None = None


# ── User ─────────────────────────────────────────────────────────────────────


# Volledige gebruikersgegevens zoals teruggegeven door de API
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


# Velden die een gebruiker zelf mag bijwerken
class UserUpdate(BaseModel):
    full_name: str | None = None
    wallet_address: str | None = None


# Gegevens voor het uitnodigen van een nieuwe gebruiker (bv. bieder)
class InviteRequest(BaseModel):
    email: EmailStr
    full_name: str
    property_id: int | None = None


# ── Makelaar ──────────────────────────────────────────────────────────────────


# Gegevens van een makelaar zoals teruggegeven door de API
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


# Gegevens voor het aanmaken van een nieuwe woning
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


# Volledige woninggegevens zoals teruggegeven door de API
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


# Velden die bij het bijwerken van een woning gewijzigd mogen worden
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


# Gegevens voor het aanmaken van een nieuwe veiling
class AuctionCreate(BaseModel):
    property_id: int
    start_date: datetime
    deadline: datetime


# Volledige veilinggegevens zoals teruggegeven door de API
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


# Beknopte status van een veiling, bv. voor polling door de frontend
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


# Volledige bodgegevens zoals teruggegeven door de API
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


# Eén bod zoals rechtstreeks van de blockchain gelezen
class BlockchainBid(BaseModel):
    bidder_wallet: str
    amount_usdc: float
    block_number: int
    tx_hash: str


# Vergelijking tussen on-chain biedingen en geïndexeerde biedingen in de database
class VerifyResponse(BaseModel):
    on_chain_bids: list[BlockchainBid]
    indexed_bids: list[BidOut]
    match: bool


# ── Blockchain feed ───────────────────────────────────────────────────────────


# Eén regel in de live blockchain-feed voor het dashboard
class BlockchainEntry(BaseModel):
    id: int
    tx_hash: str
    block_number: int
    bidder_wallet: str
    auction_id: int
    property_address: str
    financing_condition: bool
    indexed_at: datetime
