from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# Genereert een JWT-token met vervaldatum op basis van de meegegeven payload
def create_access_token(data: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    return jwt.encode(
        {**data, "exp": expire}, settings.secret_key, algorithm=settings.algorithm
    )


# Decodeert het JWT-token uit de request en haalt de bijbehorende gebruiker uit de database
def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authenticatie vereist",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        user_id: int | None = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    user = db.get(User, int(user_id))
    if user is None:
        raise credentials_exc
    return user


# Geeft een dependency die toegang weigert als de gebruiker niet een van de gegeven rollen heeft
def require_role(*roles: str):
    def checker(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Onvoldoende rechten"
            )
        return current_user

    return checker
