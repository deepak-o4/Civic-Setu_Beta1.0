import logging
import json
import time
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.core.config import settings
from app.schemas.analytics import AnalyticsSnapshotResponse, RecurringProblemsResponse
from app.schemas.cm_analytics import CMAnalyticsResponse
from app.services.analytics import AnalyticsSnapshotService
from app.services.analytics_reports.recurring_problems import (
    RecurringProblemDetector,
    RECURRING_THRESHOLD,
    LOOKBACK_DAYS,
)
from app.models.analytics_snapshot import AnalyticsSnapshot

logger = logging.getLogger("civicsetu.routes.analytics")

router = APIRouter()

# Module-level in-memory cache
_in_memory_cache = {
    "data": None,
    "expires_at": 0.0
}

@router.get("/snapshot", response_model=AnalyticsSnapshotResponse)
async def get_analytics_snapshot(db: AsyncSession = Depends(get_db)):
    """
    Fetch the latest analytics snapshot from Redis (optional) or Postgres database.
    No authentication required.
    """
    snapshot = await AnalyticsSnapshotService.get_snapshot(db)
    return snapshot

@router.get("/recurring-problems", response_model=RecurringProblemsResponse)
async def get_recurring_problems(db: AsyncSession = Depends(get_db)):
    """
    CivicSetu recurring-problem detection.

    Groups resolved + open complaints by (category, DBSCAN geo cluster) over
    the last 30 days and flags any group with >= 5 complaints as a
    "Recurring Problem" -- e.g. "Recurring Roads problem in Sector 10".
    """
    flagged = await RecurringProblemDetector.detect(db)
    return {
        "lookback_days": LOOKBACK_DAYS,
        "threshold": RECURRING_THRESHOLD,
        "recurring_problems": flagged,
    }

@router.get("", response_model=CMAnalyticsResponse)
async def get_civicsetu_analytics(db: AsyncSession = Depends(get_db)):
    """
    Fetch CivicSetu Analytics.
    Reads from the cache (Redis with in-memory fallback), or falls back to retrieving/computing snapshot.
    """
    cached_data = None
    redis_error = False

    # 1. Try Redis cache
    try:
        r = aioredis.from_url(settings.REDIS_URL, socket_timeout=2.0)
        async with r:
            val = await r.get("civicsetu_analytics_cache")
            if val:
                cached_data = json.loads(val)
                logger.info("Retrieved CivicSetu Analytics from Redis cache.")
    except Exception as e:
        logger.warning(f"Redis cache access failed: {e}. Checking in-memory cache fallback.")
        redis_error = True

    # 2. Try In-Memory cache if Redis failed/missed
    if cached_data is None:
        now = time.time()
        if redis_error:
            if _in_memory_cache["data"] is not None and _in_memory_cache["expires_at"] > now:
                cached_data = _in_memory_cache["data"]
                logger.info("Retrieved CivicSetu Analytics from in-memory cache.")

    # 3. If cache missed/expired, get snapshot or compute live
    if cached_data is None:
        logger.info("CivicSetu Analytics cache miss. Retrieving/computing snapshot...")
        
        # We need to know if the precomputed snapshot is blank.
        # A blank snapshot means no precomputation has run yet.
        snapshot_exists = False
        
        # Check Redis
        try:
            r = aioredis.from_url(settings.REDIS_URL, socket_timeout=2.0)
            async with r:
                snapshot_exists = await r.exists("analytics_snapshot")
        except Exception:
            pass
            
        # Check Postgres
        if not snapshot_exists:
            try:
                stmt = select(AnalyticsSnapshot).filter(AnalyticsSnapshot.key == "analytics_snapshot")
                res = await db.execute(stmt)
                db_record = res.scalars().first()
                if db_record:
                    snapshot_exists = True
            except Exception as e:
                logger.error(f"Error checking snapshot existence in DB: {e}")

        if snapshot_exists:
            # Fetch the precomputed snapshot
            snapshot = await AnalyticsSnapshotService.get_snapshot(db)
        else:
            # Fall back to live computation
            logger.info("No precomputed snapshot found. Falling back to live computation.")
            snapshot = await AnalyticsSnapshotService.compute_snapshot(db)

        # Transform snapshot to CMAnalyticsResponse structure
        metrics = {
            "total_complaints": snapshot.get("total_complaints", 0),
            "pending": snapshot.get("pending", 0),
            "resolved": snapshot.get("resolved", 0),
            "escalated": snapshot.get("escalated", 0),
            "average_resolution_time": float(snapshot.get("average_resolution_time", 0.0)),
            "average_sla": float(snapshot.get("average_sla", 0.0))
        }
        
        district_dist = snapshot.get("top_districts", {})
        category_dist = snapshot.get("top_categories", {})
        heatmap = dict(district_dist)
        sla_metrics = snapshot.get("department_sla_hours", {})
        officer_ranking = snapshot.get("officer_ranking", [])
        
        transformed_data = {
            "metrics": metrics,
            "district_distribution": district_dist,
            "category_distribution": category_dist,
            "heatmap": heatmap,
            "sla_metrics": sla_metrics,
            "officer_ranking": officer_ranking
        }
        
        # Update caches
        try:
            r = aioredis.from_url(settings.REDIS_URL, socket_timeout=2.0)
            async with r:
                await r.setex("civicsetu_analytics_cache", 300, json.dumps(transformed_data))
                logger.info("Updated Redis cache for CivicSetu Analytics.")
        except Exception as e:
            logger.warning(f"Failed to write to Redis cache: {e}")
            
        # Always update in-memory cache as well
        _in_memory_cache["data"] = transformed_data
        _in_memory_cache["expires_at"] = time.time() + 300.0
        logger.info("Updated in-memory cache for CivicSetu Analytics.")
        
        cached_data = transformed_data

    return cached_data
