import hashlib
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from dependencies import create_access_token, get_current_user
from models import AuditLog, Makelaar, User
from schemas import (
    IdinCallbackRequest,
    IdinStartRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Annotated[Session, Depends(get_db)]):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="E-mailadres is al in gebruik")

    if body.role == "makelaar" and not body.company_name:
        raise HTTPException(status_code=400, detail="Bedrijfsnaam is verplicht voor makelaars")

    # Makelaars wachten op NVM-goedkeuring, bieders wachten op makelaar-uitnodiging
    if body.role == "admin":
        initial_status = "active"
    elif body.role == "makelaar":
        initial_status = "pending_nvm"
    else:
        initial_status = "invited"

    user = User(
        email=body.email,
        full_name=body.full_name,
        password_hash=_hash_password(body.password),
        role=body.role,
        status=initial_status,
    )
    db.add(user)
    db.flush()

    # Makelaar-profiel aanmaken
    if body.role == "makelaar":
        initials = "".join(w[0].upper() for w in body.full_name.split()[:2])
        makelaar = Makelaar(
            user_id=user.id,
            company_name=body.company_name,
            contact_name=body.full_name,
            email=body.email,
            logo_initials=initials,
            logo_color="#1B4F72",
        )
        db.add(makelaar)

    db.commit()
    db.refresh(user)

    db.add(AuditLog(action_type="user.register", user_id=user.id, entity_type="user", entity_id=user.id))
    db.commit()
    return user


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.password_hash or not _verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Onjuist e-mailadres of wachtwoord",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": str(user.id), "role": user.role})
    db.add(AuditLog(action_type="user.login", user_id=user.id, entity_type="user", entity_id=user.id))
    db.commit()
    return {"access_token": token, "token_type": "bearer"}


@router.post("/idin/start")
def idin_start(
    body: IdinStartRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Start iDIN-verificatiestroom. In PoC-modus retourneert dit een mock-redirect URL.
    In productie stuurt dit door naar de iDIN-provider van de bank.
    """
    from config import settings

    if not settings.idin_mock:
        raise HTTPException(status_code=501, detail="iDIN productie-integratie nog niet geïmplementeerd")

    current_user.wallet_address = body.wallet_address
    db.commit()

    return {
        "redirect_url": f"http://localhost:8000/api/auth/idin/mock-callback?user_id={current_user.id}",
        "message": "iDIN mock-modus actief. Gebruik de callback endpoint om verificatie te voltooien.",
    }


@router.post("/idin/callback")
def idin_callback(
    body: IdinCallbackRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Verwerkt de iDIN-callback na succesvolle identiteitsverificatie.
    Slaat de SHA-256 hash van de iDIN-identifier op en whitelists het wallet-adres.
    """
    idin_hash = hashlib.sha256(body.idin_identifier.encode()).hexdigest()

    current_user.idin_hash = idin_hash
    current_user.idin_verified = True
    current_user.status = "verified"
    current_user.verified_at = datetime.now(timezone.utc)

    if body.wallet_address:
        current_user.wallet_address = body.wallet_address.lower()
        current_user.status = "active"

    if body.full_name:
        current_user.full_name = body.full_name

    db.commit()
    db.refresh(current_user)

    # Probeer wallet op KYCGate whitelist te zetten
    if current_user.wallet_address:
        try:
            from blockchain.client import blockchain_client
            blockchain_client.add_to_whitelist(current_user.wallet_address)
        except Exception:
            pass  # KYC-contract niet beschikbaar in dev

    db.add(AuditLog(
        action_type="idin.verified",
        user_id=current_user.id,
        wallet_address=current_user.wallet_address,
        entity_type="user",
        entity_id=current_user.id,
        details={"idin_hash": idin_hash},
    ))
    db.commit()

    return {"message": "iDIN-verificatie succesvol", "status": current_user.status}


@router.get("/idin/mock-callback")
def idin_mock_callback(user_id: int, db: Annotated[Session, Depends(get_db)]):
    """Mock iDIN-callback pagina — alleen beschikbaar in PoC-modus."""
    from config import settings
    if not settings.idin_mock:
        raise HTTPException(status_code=404)

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")

    return {
        "message": "iDIN mock verificatie geslaagd. Stuur een POST naar /api/auth/idin/callback om te voltooien.",
        "user_id": user_id,
        "example_callback_body": {
            "idin_identifier": f"mock-idin-{user_id}-identifier",
            "wallet_address": user.wallet_address or "0x0000000000000000000000000000000000000001",
            "full_name": user.full_name,
        },
    }


@router.post("/nvm/approve")
def nvm_approve(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Mock NVM-goedkeuring voor makelaars.
    In productie zou dit door een NVM-medewerker worden geactiveerd.
    """
    if current_user.role not in ("makelaar", "seller"):
        raise HTTPException(status_code=400, detail="Alleen makelaars kunnen NVM-goedkeuring aanvragen")

    if current_user.status == "active":
        return {"message": "Account is al goedgekeurd", "status": "active"}

    current_user.status = "active"
    current_user.verified_at = datetime.now(timezone.utc)

    db.add(AuditLog(
        action_type="nvm.approved",
        user_id=current_user.id,
        entity_type="user",
        entity_id=current_user.id,
        details={"mock": True},
    ))
    db.commit()
    db.refresh(current_user)

    return {"message": "NVM-goedkeuring geslaagd (mock)", "status": current_user.status}
