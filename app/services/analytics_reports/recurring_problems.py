"""
CivicSetu Recurring Problem Detection
=======================================

Surfaces insights like "Recurring pothole problem in Sector 10" by grouping
resolved + open complaints by (category, DBSCAN geographic cluster), and
flagging any group that crosses a configurable threshold within a lookback
window as a "Recurring Problem".

NOTE ON MODULE LOCATION: the CivicSetu spec suggested
``app/services/analytics/recurring_problems.py``, but ``app/services/analytics.py``
already exists as a module (used by AnalyticsSnapshotService), and Python
cannot have both a module and a package share the same name. This lives at
``app/services/analytics_reports/recurring_problems.py`` instead.
"""
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.complaint import Complaint
from app.services.geo.cluster_engine import ClusterEngine

logger = logging.getLogger("civicsetu.services.analytics.recurring_problems")

# ≥ this many complaints in the same (category, hotspot) within the lookback
# window is flagged as a "Recurring Problem".
RECURRING_THRESHOLD = 5
LOOKBACK_DAYS = 30


class RecurringProblemDetector:
    """Groups geo-tagged complaints by (category, DBSCAN cluster) and flags recurring issues."""

    @staticmethod
    async def detect(db: AsyncSession, lookback_days: int = LOOKBACK_DAYS,
                      threshold: int = RECURRING_THRESHOLD) -> List[Dict[str, Any]]:
        """
        Returns a list of flagged recurring-problem groups, each shaped as:
          {
            "category": "Roads",
            "region": "Sector 10",
            "cluster_id": "HOTSPOT-0",
            "complaint_count": 7,
            "center_lat": ..., "center_lon": ...,
            "label": "Recurring Roads problem in Sector 10"
          }
        """
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=lookback_days)

        stmt = select(Complaint).where(
            Complaint.is_deleted == False,
            Complaint.created_at >= cutoff,
            Complaint.lat.isnot(None),
            Complaint.lon.isnot(None),
        )
        result = await db.execute(stmt)
        complaints = result.scalars().all()

        if not complaints:
            return []

        # Group by category first — clustering is run independently per
        # category so "5 potholes in Sector 10" and "5 water leaks in
        # Sector 10" are distinguished as separate recurring problems.
        by_category: Dict[str, List[Complaint]] = defaultdict(list)
        for c in complaints:
            by_category[c.category or "Other"].append(c)

        cluster_engine = ClusterEngine(min_samples=min(threshold, 3))
        flagged: List[Dict[str, Any]] = []

        for category, records in by_category.items():
            memory_records = [
                {
                    "location": {
                        "lat": c.lat,
                        "lon": c.lon,
                        "area_name": c.district or "Unknown",
                    },
                    "complaint_categories": [category],
                }
                for c in records
            ]

            try:
                hotspots = cluster_engine.analyze_hotspots(memory_records)
            except Exception as exc:
                logger.warning(
                    f"[RECURRING_PROBLEMS] Clustering failed for category={category}: {exc}"
                )
                continue

            for hotspot in hotspots:
                if hotspot["complaint_count"] < threshold:
                    continue

                flagged.append({
                    "category": category,
                    "region": hotspot["region"],
                    "cluster_id": hotspot["cluster_id"],
                    "complaint_count": hotspot["complaint_count"],
                    "center_lat": hotspot["center_lat"],
                    "center_lon": hotspot["center_lon"],
                    "label": f"Recurring {category} problem in {hotspot['region']}",
                })

        # Highest-count recurring problems first.
        flagged.sort(key=lambda x: x["complaint_count"], reverse=True)
        return flagged
