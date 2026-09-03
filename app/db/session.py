"""
Database session configuration — production-grade.

Handles both SQLite (aiosqlite) and PostgreSQL (asyncpg) transparently.
SQLite does NOT support pool_size/max_overflow, so we conditionally set them.
"""
import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
from app.core.config import settings

logger = logging.getLogger("civicsetu.db.session")

_is_sqlite = settings.SQLALCHEMY_DATABASE_URI.startswith("sqlite")
# Hosted providers reached via DATABASE_URL (Neon, Supabase, etc.) require
# SSL; local/Docker Compose Postgres (POSTGRES_* vars, no DATABASE_URL) does
# not offer it, so this only turns on when DATABASE_URL is actually set.
_needs_ssl = bool(settings.DATABASE_URL) and not _is_sqlite

if _is_sqlite:
    # SQLite requires StaticPool + check_same_thread=False for async usage.
    # pool_size / max_overflow are NOT supported by SQLite drivers.
    engine = create_async_engine(
        settings.SQLALCHEMY_DATABASE_URI,
        echo=False,
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    logger.info("[DB] Configured SQLite async engine with StaticPool.")
else:
    # PostgreSQL with full connection-pool tuning
    engine = create_async_engine(
        settings.SQLALCHEMY_DATABASE_URI,
        echo=False,
        future=True,
        pool_size=20,
        max_overflow=10,
        pool_recycle=1800,
        pool_timeout=30,
        pool_pre_ping=True,
        connect_args={"ssl": True} if _needs_ssl else {},
    )
    logger.info("[DB] Configured PostgreSQL async engine with connection pooling%s.", " (SSL)" if _needs_ssl else "")

# Async session factory — expire_on_commit=False avoids lazy-load surprises
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:  # type: ignore
    """FastAPI dependency that provides a scoped async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
