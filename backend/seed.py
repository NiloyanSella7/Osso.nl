"""
Seed script: twee makelaars waarmee ingelogd kan worden.
Gebruik: python3.13 seed.py
"""
from passlib.context import CryptContext
from database import SessionLocal
from models import Makelaar, User

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def run_seed():
    db = SessionLocal()
    try:
        lars = User(
            email="Lars@osso.nl",
            full_name="Lars",
            password_hash=pwd.hash("Demo1234!"),
            role="makelaar",
            status="active",
            idin_verified=True,
        )
        louis = User(
            email="louisa@osso.nl",
            full_name="Louisa",
            password_hash=pwd.hash("Demo1234!"),
            role="makelaar",
            status="active",
            idin_verified=True,
        )
        db.add_all([lars, louis])
        db.flush()

        db.add(Makelaar(
            user_id=lars.id,
            company_name="Osso.nl",
            contact_name="Lars",
            email="Lars@osso.nl",
            phone="",
            logo_initials="LA",
            logo_color="#1B4F72",
        ))
        db.add(Makelaar(
            user_id=louis.id,
            company_name="Osso.nl",
            contact_name="Louisa",
            email="louisa@osso.nl",
            phone="",
            logo_initials="LO",
            logo_color="#4A148C",
        ))

        db.commit()
        print("✓ Seed succesvol!")
        print("  Lars@osso.nl   (wachtwoord: Demo1234!)")
        print("  louisa@osso.nl  (wachtwoord: Demo1234!)")

    except Exception as e:
        db.rollback()
        print(f"✗ Seed mislukt: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
