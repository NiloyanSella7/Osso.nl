"""
Seed script: vult de database met dezelfde demo-data als de frontend mockData.ts.
Gebruik: python3.13 seed.py
"""
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from database import SessionLocal
from models import Auction, IndexedBid, Makelaar, Property, PropertyImage, User

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = SessionLocal()

try:
    # ── Makelaars / verkopers ─────────────────────────────────────────────────
    m1_user = User(
        email="info@vdberg-makelaardij.nl",
        full_name="Thomas van der Berg",
        password_hash=pwd.hash("Demo1234!"),
        role="makelaar",
        status="active",
        idin_verified=True,
    )
    m2_user = User(
        email="info@degrootpartners.nl",
        full_name="Sandra de Groot",
        password_hash=pwd.hash("Demo1234!"),
        role="makelaar",
        status="active",
        idin_verified=True,
    )
    db.add_all([m1_user, m2_user])
    db.flush()

    m1 = Makelaar(
        user_id=m1_user.id,
        company_name="Van der Berg Makelaardij",
        contact_name="Thomas van der Berg",
        email="info@vdberg-makelaardij.nl",
        phone="020-555-1234",
        logo_initials="VdB",
        logo_color="#1B4F72",
    )
    m2 = Makelaar(
        user_id=m2_user.id,
        company_name="De Groot & Partners",
        contact_name="Sandra de Groot",
        email="info@degrootpartners.nl",
        phone="070-444-5678",
        logo_initials="DG",
        logo_color="#4A148C",
    )
    db.add_all([m1, m2])
    db.flush()

    # ── Bidder (demo koper) ───────────────────────────────────────────────────
    bidder = User(
        email="jan.de.vries@email.nl",
        full_name="Jan de Vries",
        password_hash=pwd.hash("Demo1234!"),
        role="bidder",
        status="active",
        idin_verified=True,
        wallet_address="0xa1b2c3d4e5f6789012345678901234567890abcd",
        verified_at=datetime.now(timezone.utc),
        registered_by=m1_user.id,
    )
    db.add(bidder)
    db.flush()

    # ── Properties ────────────────────────────────────────────────────────────
    now = datetime.now(timezone.utc)

    p1 = Property(
        seller_id=m1_user.id,
        address="Langswater 137",
        postal_code="1068 LS",
        city="Amsterdam",
        description="3-kamerwoning op de 1e verdieping in Amsterdam Nieuw-West. Woonkamer, dichte keuken, 2 slaapkamers, badkamer en toilet. Balkon op het zuiden met uitzicht op groen.",
        asking_price=290000,
        status="active",
        rooms=3,
        area_m2=61,
        energy_label="D",
    )
    p2 = Property(
        seller_id=m1_user.id,
        address="Wilhelminastraat 45",
        postal_code="3581 KL",
        city="Utrecht",
        description="Ruime gezinswoning in rustige buurt. Tuin op het zuiden, garage, 5 slaapkamers. Nabij uitvalswegen en openbaar vervoer.",
        asking_price=620000,
        status="active",
        rooms=5,
        area_m2=185,
        energy_label="A",
    )
    p3 = Property(
        seller_id=m2_user.id,
        address="Binnenhof 7",
        postal_code="2513 AA",
        city="Den Haag",
        description="Stijlvol appartement op steenworp van het centrum. Volledig gerenoveerd, 2 slaapkamers, eigen parkeerplaats.",
        asking_price=430000,
        status="active",
        rooms=2,
        area_m2=89,
        energy_label="A+",
    )
    p4 = Property(
        seller_id=m1_user.id,
        address="Havenstraat 22",
        postal_code="3011 BB",
        city="Rotterdam",
        description="Modern loft in voormalig havengebouw. Hoge plafonds, open keuken, industrieel design. Dichtbij de Erasmusbrug.",
        asking_price=510000,
        status="active",
        rooms=3,
        area_m2=118,
        energy_label="B",
    )
    db.add_all([p1, p2, p3, p4])
    db.flush()

    # Images voor p1
    db.add(PropertyImage(property_id=p1.id, url="https://cloud.funda.nl/valentina_media/214/971/505.jpg?options=width=720", sort_order=0))
    db.add(PropertyImage(property_id=p1.id, url="https://cloud.funda.nl/valentina_media/214/971/507.jpg?options=width=1440", sort_order=1))

    # Koppel bidder aan p1
    bidder.assigned_property_id = p1.id

    # ── Auctions ──────────────────────────────────────────────────────────────
    a1 = Auction(
        property_id=p1.id,
        start_date=now - timedelta(days=8),
        deadline=now + timedelta(days=8),
        status="open",
    )
    a2 = Auction(
        property_id=p2.id,
        start_date=now - timedelta(days=6),
        deadline=now + timedelta(days=10),
        status="open",
    )
    a3 = Auction(
        property_id=p3.id,
        start_date=now - timedelta(days=14),
        deadline=now - timedelta(days=7),
        status="closed",
        winner_wallet="0xabc123def456789012345678901234567890abcd",
    )
    a4 = Auction(
        property_id=p4.id,
        start_date=now - timedelta(days=4),
        deadline=now + timedelta(days=10),
        status="open",
    )
    db.add_all([a1, a2, a3, a4])
    db.flush()

    # ── Bids ──────────────────────────────────────────────────────────────────
    bids_data = [
        # auction 1 (open)
        dict(auction_id=a1.id, bidder_wallet="0xa1b2c3d4e5f6789012345678901234567890abcd",
             amount_usdc=295000, tx_hash="0x" + "a" * 64, block_number=58421001,
             bidder_name="Jan de Vries", bidder_email="jan.devries@email.nl", financing_condition=True),
        dict(auction_id=a1.id, bidder_wallet="0x9abc000000000000000000000000000000000001",
             amount_usdc=300000, tx_hash="0x" + "b" * 64, block_number=58421145,
             bidder_name="Sarah Bakker", bidder_email="s.bakker@gmail.com", financing_condition=False),
        dict(auction_id=a1.id, bidder_wallet="0x5f6a000000000000000000000000000000000002",
             amount_usdc=305000, tx_hash="0x" + "c" * 64, block_number=58422301,
             bidder_name="Mark Jansen", bidder_email="mark.jansen@outlook.com", financing_condition=True),
        # auction 3 (closed) — meerdere bieders
        dict(auction_id=a3.id, bidder_wallet="0xa1b2000000000000000000000000000000000003",
             amount_usdc=445000, tx_hash="0x" + "d" * 64, block_number=58300100,
             bidder_name="Sophie van Dam", financing_condition=True),
        dict(auction_id=a3.id, bidder_wallet="0xe5f6000000000000000000000000000000000004",
             amount_usdc=432000, tx_hash="0x" + "e" * 64, block_number=58300250,
             bidder_name="Lucas Mulder", financing_condition=False),
        dict(auction_id=a3.id, bidder_wallet="0xabc1000000000000000000000000000000000005",
             amount_usdc=460000, tx_hash="0x" + "f" * 64, block_number=58301800,
             bidder_name="Robin van der Berg", financing_condition=False),
    ]
    for b in bids_data:
        db.add(IndexedBid(
            indexed_at=now - timedelta(hours=len(bids_data) - bids_data.index(b)),
            **b
        ))

    db.commit()
    print("✓ Seed succesvol!")
    print(f"  Makelaars:   {m1_user.email} / {m2_user.email}  (wachtwoord: Demo1234!)")
    print(f"  Bieder:      {bidder.email}  (wachtwoord: Demo1234!)")
    print(f"  Properties:  {p1.id}, {p2.id}, {p3.id}, {p4.id}")
    print(f"  Auctions:    {a1.id} (open), {a2.id} (open), {a3.id} (gesloten), {a4.id} (open)")

except Exception as e:
    db.rollback()
    print(f"✗ Seed mislukt: {e}")
    raise
finally:
    db.close()
