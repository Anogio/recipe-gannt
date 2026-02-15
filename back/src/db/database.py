"""Database configuration and connection management."""

import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker


def get_database_url() -> str:
    """Get the database URL from environment variables.

    Returns the DATABASE_URL if set, otherwise constructs from individual components.
    For local development, defaults to localhost PostgreSQL.
    """
    database_url = os.getenv("DATABASE_URL")

    if database_url:
        # Railway and some other providers use postgres:// but SQLAlchemy requires postgresql://
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        return database_url

    # Fallback for local development
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "postgres")
    name = os.getenv("DB_NAME", "recipe_gantt")

    return f"postgresql://{user}:{password}@{host}:{port}/{name}"


# Create engine - will be initialized on first use
_engine = None


def get_engine():
    """Get or create the SQLAlchemy engine."""
    global _engine
    if _engine is None:
        _engine = create_engine(get_database_url(), pool_pre_ping=True)
    return _engine


# Session factory
SessionLocal = None


def get_session_local():
    """Get or create the session factory."""
    global SessionLocal
    if SessionLocal is None:
        SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=get_engine()
        )
    return SessionLocal


def get_db():
    """Dependency for FastAPI to get a database session."""
    session_local = get_session_local()
    db = session_local()
    try:
        yield db
    finally:
        db.close()


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


def check_database_connection() -> bool:
    """Check if the database is reachable.

    Returns True if connection successful, raises exception otherwise.
    """
    engine = get_engine()
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True


def run_migrations():
    """Run pending Alembic migrations."""
    from alembic.config import Config

    from alembic import command

    # Get the directory where this file is located (src/db)
    # Go up two levels to get to back/
    base_path = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    alembic_cfg = Config(os.path.join(base_path, "alembic.ini"))
    alembic_cfg.set_main_option("script_location", os.path.join(base_path, "alembic"))

    command.upgrade(alembic_cfg, "head")
