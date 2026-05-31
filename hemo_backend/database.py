from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import hashlib
import os

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    _db_path = os.getenv("DB_PATH", "/tmp/hemo_users.db")
    DATABASE_URL = f"sqlite:///{_db_path}"

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id                     = Column(Integer, primary_key=True, index=True)
    username               = Column(String, unique=True, index=True)
    email                  = Column(String, unique=True, index=True)
    hashed_password        = Column(String)
    created_at             = Column(DateTime, default=datetime.utcnow)
    stripe_customer_id     = Column(String, unique=True, index=True, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    subscription_status    = Column(String, default="inactive")

    # ── Metrics columns ──────────────────────────────────────────────────────
    last_seen              = Column(DateTime, nullable=True)    # last activity timestamp
    total_messages         = Column(Integer, default=0)         # cumulative messages sent
    country                = Column(String, nullable=True)      # ISO 3166-1 alpha-2 (e.g. "FR")
    plan                   = Column(String, default="free")     # "free" | "pro"


class MessageLog(Base):
    """One row per conversation turn — used for time-series charts."""
    __tablename__ = "message_logs"

    id         = Column(Integer, primary_key=True, index=True)
    username   = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    modality   = Column(String, default="text")  # "text" | "voice" | "image" | "multimodal"
    country    = Column(String, nullable=True)


def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password
