from datetime import datetime
from sqlalchemy import (
    Boolean, DateTime, Enum, ForeignKey,
    Integer, JSON, Numeric, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    wallet_address: Mapped[str | None] = mapped_column(String(42), unique=True)
    idin_hash: Mapped[str | None] = mapped_column(String(64))
    role: Mapped[str] = mapped_column(
        Enum("bidder", "seller", "makelaar", "admin"), nullable=False, default="bidder"
    )
    registered_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    assigned_property_id: Mapped[int | None] = mapped_column(ForeignKey("properties.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(
        Enum("invited", "verified", "active", "pending_nvm"), nullable=False, default="invited"
    )
    idin_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    properties: Mapped[list["Property"]] = relationship(
        "Property", back_populates="seller", foreign_keys="Property.seller_id"
    )
    bids: Mapped[list["IndexedBid"]] = relationship(
        "IndexedBid", back_populates="bidder", foreign_keys="IndexedBid.bidder_wallet",
        primaryjoin="User.wallet_address == IndexedBid.bidder_wallet", viewonly=True
    )
    makelaar_profile: Mapped["Makelaar | None"] = relationship("Makelaar", back_populates="user")


class Makelaar(Base):
    __tablename__ = "makelaars"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    phone: Mapped[str | None] = mapped_column(String(20))
    logo_initials: Mapped[str | None] = mapped_column(String(5))
    logo_color: Mapped[str] = mapped_column(String(7), default="#1B4F72")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    user: Mapped[User | None] = relationship("User", back_populates="makelaar_profile")


class Property(Base):
    __tablename__ = "properties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    postal_code: Mapped[str | None] = mapped_column(String(10))
    city: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    asking_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("draft", "active", "sold"), nullable=False, default="draft"
    )
    rooms: Mapped[int | None] = mapped_column(Integer)
    area_m2: Mapped[int | None] = mapped_column(Integer)
    energy_label: Mapped[str | None] = mapped_column(String(5))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    seller: Mapped[User] = relationship("User", back_populates="properties", foreign_keys=[seller_id])
    images: Mapped[list["PropertyImage"]] = relationship(
        "PropertyImage", back_populates="property", cascade="all, delete-orphan",
        order_by="PropertyImage.sort_order"
    )
    auction: Mapped["Auction | None"] = relationship("Auction", back_populates="property", uselist=False)


class PropertyImage(Base):
    __tablename__ = "property_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    property: Mapped[Property] = relationship("Property", back_populates="images")


class Auction(Base):
    __tablename__ = "auctions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), nullable=False, unique=True)
    contract_auction_id: Mapped[int | None] = mapped_column(Integer)
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    deadline: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("open", "closed", "settled"), nullable=False, default="open"
    )
    winner_wallet: Mapped[str | None] = mapped_column(String(42))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    property: Mapped[Property] = relationship("Property", back_populates="auction")
    bids: Mapped[list["IndexedBid"]] = relationship(
        "IndexedBid", back_populates="auction", cascade="all, delete-orphan"
    )


class IndexedBid(Base):
    __tablename__ = "indexed_bids"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    auction_id: Mapped[int] = mapped_column(ForeignKey("auctions.id"), nullable=False)
    bidder_wallet: Mapped[str] = mapped_column(String(42), nullable=False)
    amount_usdc: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)  # Nooit opslaan — alleen op blockchain
    tx_hash: Mapped[str] = mapped_column(String(66), nullable=False, unique=True)
    block_number: Mapped[int] = mapped_column(Integer, nullable=False)
    financing_condition: Mapped[bool] = mapped_column(Boolean, default=False)
    bidder_name: Mapped[str | None] = mapped_column(String(255))
    bidder_email: Mapped[str | None] = mapped_column(String(255))
    bidder_phone: Mapped[str | None] = mapped_column(String(20))
    indexed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    auction: Mapped[Auction] = relationship("Auction", back_populates="bids")
    bidder: Mapped[User | None] = relationship(
        "User",
        primaryjoin="foreign(IndexedBid.bidder_wallet) == User.wallet_address",
        viewonly=True,
    )


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    wallet_address: Mapped[str | None] = mapped_column(String(42))
    tx_hash: Mapped[str | None] = mapped_column(String(66))
    entity_type: Mapped[str | None] = mapped_column(String(50))
    entity_id: Mapped[int | None] = mapped_column(Integer)
    details: Mapped[dict | None] = mapped_column(JSON)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
