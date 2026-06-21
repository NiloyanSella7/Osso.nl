from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import settings

# Database-engine met connectie-pooling naar de MySQL-database
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Basisklasse waarvan alle ORM-modellen erven
class Base(DeclarativeBase):
    pass


# Geeft een databasesessie als FastAPI-dependency en sluit deze daarna altijd af
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
