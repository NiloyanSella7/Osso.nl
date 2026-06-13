from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from dependencies import require_role
from models import AuditLog, Makelaar, Property, PropertyImage, User
from schemas import MakelaarOut, PropertyCreate, PropertyOut, PropertyUpdate

router = APIRouter(prefix="/api/properties", tags=["properties"])


def _build_property_out(prop: Property, makelaar: Makelaar | None = None) -> PropertyOut:
    images = [img.url for img in sorted(prop.images, key=lambda i: i.sort_order)]
    return PropertyOut(
        id=prop.id,
        seller_id=prop.seller_id,
        address=prop.address,
        postal_code=prop.postal_code,
        city=prop.city,
        description=prop.description,
        asking_price=float(prop.asking_price),
        status=prop.status,
        rooms=prop.rooms,
        area_m2=prop.area_m2,
        energy_label=prop.energy_label,
        created_at=prop.created_at,
        images=images,
        makelaar=MakelaarOut.model_validate(makelaar) if makelaar else None,
    )


def _get_makelaar_for_seller(db, seller_id: int) -> Makelaar | None:
    return db.query(Makelaar).filter(Makelaar.user_id == seller_id).first()


@router.get("/", response_model=list[PropertyOut])
def list_properties(
    db: Annotated[Session, Depends(get_db)],
    status_filter: str | None = None,
):
    q = db.query(Property).options(joinedload(Property.images), joinedload(Property.auction))
    if status_filter:
        q = q.filter(Property.status == status_filter)
    properties = q.all()
    return [_build_property_out(p, _get_makelaar_for_seller(db, p.seller_id)) for p in properties]


@router.get("/{property_id}", response_model=PropertyOut)
def get_property(
    property_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    prop = (
        db.query(Property)
        .options(joinedload(Property.images), joinedload(Property.auction))
        .filter(Property.id == property_id)
        .first()
    )
    if not prop:
        raise HTTPException(status_code=404, detail="Woning niet gevonden")
    return _build_property_out(prop, _get_makelaar_for_seller(db, prop.seller_id))


@router.post("/", response_model=PropertyOut, status_code=status.HTTP_201_CREATED)
def create_property(
    body: PropertyCreate,
    current_user: Annotated[User, Depends(require_role("seller", "makelaar", "admin"))],
    db: Annotated[Session, Depends(get_db)],
):
    prop = Property(
        seller_id=current_user.id,
        address=body.address,
        postal_code=body.postal_code,
        city=body.city,
        description=body.description,
        asking_price=body.asking_price,
        rooms=body.rooms,
        area_m2=body.area_m2,
        energy_label=body.energy_label,
        status="draft",
    )
    db.add(prop)
    db.flush()

    for idx, url in enumerate(body.images):
        db.add(PropertyImage(property_id=prop.id, url=url, sort_order=idx))

    db.commit()
    db.refresh(prop)

    db.add(AuditLog(
        action_type="property.create",
        user_id=current_user.id,
        entity_type="property",
        entity_id=prop.id,
    ))
    db.commit()
    return _build_property_out(prop, _get_makelaar_for_seller(db, prop.seller_id))


@router.put("/{property_id}", response_model=PropertyOut)
def update_property(
    property_id: int,
    body: PropertyUpdate,
    current_user: Annotated[User, Depends(require_role("seller", "makelaar", "admin"))],
    db: Annotated[Session, Depends(get_db)],
):
    prop = db.get(Property, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Woning niet gevonden")

    if current_user.role not in ("makelaar", "admin") and prop.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Geen toegang tot deze woning")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(prop, field, value)

    db.commit()
    db.refresh(prop)
    return _build_property_out(prop, _get_makelaar_for_seller(db, prop.seller_id))


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    property_id: int,
    current_user: Annotated[User, Depends(require_role("makelaar", "admin"))],
    db: Annotated[Session, Depends(get_db)],
):
    prop = db.get(Property, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Woning niet gevonden")
    db.delete(prop)
    db.commit()
