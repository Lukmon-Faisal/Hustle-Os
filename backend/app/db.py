import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy .env.example to .env and paste your "
        "Supabase connection string in."
    )

# Supabase's pooled connection (pgbouncer) doesn't support some prepared
# statement behavior SQLAlchemy uses by default -> disable it to be safe.
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"options": "-c timezone=utc"})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
