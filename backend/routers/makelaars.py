from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Makelaar
from schemas import MakelaarOut

router = APIRouter(prefix="/api/makelaars", tags=["makelaars"])


@router.get("/", response_model=list[MakelaarOut])
def list_makelaars(db: Annotated[Session, Depends(get_db)]):
    return db.query(Makelaar).all()


@router.get("/{makelaar_id}", response_model=MakelaarOut)
def get_makelaar(makelaar_id: int, db: Annotated[Session, Depends(get_db)]):
    from fastapi import HTTPException

    m = db.get(Makelaar, makelaar_id)
    if not m:
        raise HTTPException(status_code=404, detail="Makelaar niet gevonden")
    return m
