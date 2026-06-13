from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, require_role
from models import AuditLog, User
from schemas import InviteRequest, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    # Voeg assigned_property_id toe als het een bidder is
    out = UserOut.model_validate(current_user)
    if current_user.role == "bidder":
        # Zoek de woning gekoppeld aan de bieder via indexed_bids of directe koppeling
        # In PoC: de makelaar koppelt een bieder aan een woning via invite
        pass
    return out


@router.put("/me", response_model=UserOut)
def update_me(
    body: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.wallet_address is not None:
        existing = (
            db.query(User)
            .filter(
                User.wallet_address == body.wallet_address.lower(),
                User.id != current_user.id,
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Wallet-adres al in gebruik")
        current_user.wallet_address = body.wallet_address.lower()
        if current_user.status == "verified":
            current_user.status = "active"

    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    current_user: Annotated[User, Depends(require_role("makelaar", "admin"))],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    return user


@router.post("/invite", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def invite_bidder(
    body: InviteRequest,
    current_user: Annotated[User, Depends(require_role("makelaar", "admin", "seller"))],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Makelaar nodigt een bieder uit. De bieder ontvangt een uitnodigingslink
    en krijgt status 'invited' totdat iDIN-verificatie is voltooid.
    """
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="E-mailadres is al geregistreerd")

    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    temp_password = "Bieden123@"

    new_user = User(
        email=body.email,
        full_name=body.full_name,
        password_hash=pwd_context.hash(temp_password),
        role="bidder",
        status="invited",
        registered_by=current_user.id,
        assigned_property_id=body.property_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    db.add(
        AuditLog(
            action_type="user.invite",
            user_id=current_user.id,
            entity_type="user",
            entity_id=new_user.id,
            details={
                "invited_email": body.email,
                "property_id": body.property_id,
                "temp_password": temp_password,  # In productie: stuur per e-mail
            },
        )
    )
    db.commit()

    return new_user


@router.get("/", response_model=list[UserOut])
def list_users(
    current_user: Annotated[User, Depends(require_role("makelaar", "admin"))],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(User).all()
