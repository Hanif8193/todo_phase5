# database.py
import os
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool, QueuePool

# Get database URL from environment variable or use SQLite for local dev
DATABASE_URL = os.getenv("DATABASE_URL")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")  # development, serverless, production

if DATABASE_URL:
    # PostgreSQL for production/serverless

    # Clean up wrapped format: psql 'postgresql://...' -> postgresql://...
    if "psql" in DATABASE_URL:
        match = re.search(r"postgresql://[^'\"]+", DATABASE_URL)
        if match:
            DATABASE_URL = match.group(0)

    # Fix for Neon: replace postgres:// with postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    # Choose connection strategy based on environment
    if ENVIRONMENT == "serverless":
        # Serverless-optimized: No connection pooling
        engine = create_engine(
            DATABASE_URL,
            poolclass=NullPool,  # No connection pooling for serverless
            pool_pre_ping=True,  # Verify connections before using
            connect_args={
                "connect_timeout": 10,
                "options": "-c timezone=utc"
            }
        )
        print("[OK] Database configured for SERVERLESS environment (NullPool)")
    else:
        # Production Kubernetes: Connection pooling
        engine = create_engine(
            DATABASE_URL,
            poolclass=QueuePool,
            pool_size=20,              # Number of connections to maintain
            max_overflow=10,           # Additional connections when pool is full
            pool_pre_ping=True,        # Health check before using connection
            pool_recycle=3600,         # Recycle connections after 1 hour
            connect_args={
                "connect_timeout": 10,
                "options": "-c timezone=utc"
            },
            echo=False                 # Set to True for SQL query logging
        )
        print(f"[OK] Database configured for PRODUCTION environment (QueuePool: size=20, max_overflow=10)")
else:
    # SQLite for local development
    if os.name == "nt":  # Windows
        DATABASE_URL = "sqlite:///./todo.db"
    else:  # Linux/Unix
        DATABASE_URL = "sqlite:////tmp/todo.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    print(f"[OK] Database configured for DEVELOPMENT environment (SQLite: {DATABASE_URL})")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Create session lazily when needed
def get_db_session():
    return SessionLocal()

# FastAPI dependency for database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
