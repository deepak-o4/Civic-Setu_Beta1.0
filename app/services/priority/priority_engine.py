"""
CivicSetu Priority Engine
==========================

CivicSetu's signature concept: priority is not a single opaque ML label.
It is a transparent, explainable weighted function of four components:

    priority_score = (severity_weight   * severity_score)
                    + (impact_weight    * impact_score)
                    + (frequency_weight * frequency_score)
                    + (location_risk_weight * location_risk_score)

Each component is scored 0-100, the weights sum to 1.0, and the final
0-100 score is bucketed into a human-readable band:

    0-30   -> Low
    31-60  -> Medium
    61-80  -> High
    81-100 -> Critical

This module is intentionally fault-tolerant: every sub-signal (ML severity,
FAISS recurrence, DBSCAN hotspot membership) is wrapped so a failure in any
one signal degrades that component to a safe default instead of crashing
the pipeline. The full component breakdown is always returned so the UI can
literally render "Severity: 40, Impact: 30, Frequency: 20, Location: 10 ->
Score: 76 -> High" instead of hiding the reasoning behind a raw label.
"""
import asyncio
import logging
import math
from typing import Any, Dict, List, Optional

logger = logging.getLogger("civicsetu.services.priority.engine")


# ---------------------------------------------------------------------------
# Weights & bands (tunable in one place)
# ---------------------------------------------------------------------------

SEVERITY_WEIGHT = 0.35
IMPACT_WEIGHT = 0.25
FREQUENCY_WEIGHT = 0.20
LOCATION_RISK_WEIGHT = 0.20

assert round(
    SEVERITY_WEIGHT + IMPACT_WEIGHT + FREQUENCY_WEIGHT + LOCATION_RISK_WEIGHT, 6
) == 1.0

# Maps the existing PriorityEnum-style ML severity label to a 0-100 severity score.
_SEVERITY_LABEL_SCORE = {
    "LOW": 15,
    "MEDIUM": 45,
    "HIGH": 70,
    "CRITICAL": 95,
}

# FAISS IndexFlatIP with normalized embeddings returns cosine similarity in [-1, 1].
# Above this threshold two complaints are considered "the same recurring issue".
_SIMILARITY_THRESHOLD = 0.72

# Radius (in km) used to decide whether a complaint's coordinates fall inside
# an existing DBSCAN hotspot cluster's center.
_HOTSPOT_RADIUS_KM = 2.0


def _band_for_score(score: float) -> str:
    if score <= 30:
        return "Low"
    if score <= 60:
        return "Medium"
    if score <= 80:
        return "High"
    return "Critical"


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0088
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


class PriorityEngine:
    """
    Computes an explainable priority score for a complaint by combining:
      - severity_score / impact_score: derived from the ML/Groq classifier
        (reuses MLInferenceService.predict_severity + classifier confidence).
      - frequency_score: derived from FAISS "recurring complaint" retrieval
        (reuses FaissMemory.search_similar as the recurring-complaint signal).
      - location_risk_score: derived from whether the complaint falls inside
        an existing DBSCAN hotspot cluster (reuses ClusterEngine output).
    """

    @staticmethod
    async def _safe_severity_and_impact(
        ml_service, text: str
    ) -> Dict[str, float]:
        """Severity + impact, both anchored on the ML severity classifier."""
        try:
            severity_label = await asyncio.to_thread(ml_service.predict_severity, text)
            severity_score = float(_SEVERITY_LABEL_SCORE.get(str(severity_label).upper(), 45))
        except Exception as exc:
            logger.warning(f"[PRIORITY_ENGINE] Severity signal failed, defaulting to MEDIUM: {exc}")
            severity_score = float(_SEVERITY_LABEL_SCORE["MEDIUM"])

        # Impact reuses the same classifier's confidence to weight how
        # strongly the model believes this severity assessment (i.e. how
        # confidently the complaint's *impact* on residents was assessed).
        try:
            from app.services.ai.groq_classifier import GroqClassifier
            groq_clf = GroqClassifier()
            result = await asyncio.to_thread(groq_clf.classify, text)
            confidence = float(result.get("confidence", 0.7))
            impact_score = round(severity_score * min(1.0, max(0.3, confidence)), 2)
        except Exception as exc:
            logger.warning(f"[PRIORITY_ENGINE] Impact signal (confidence) failed, using severity as-is: {exc}")
            impact_score = severity_score

        return {"severity_score": round(severity_score, 2), "impact_score": round(impact_score, 2)}

    @staticmethod
    async def _safe_frequency(faiss_memory, text: str) -> float:
        """
        Recurring-complaint signal: how many similar complaints already exist
        nearby/recently, per FAISS similarity retrieval.
        """
        try:
            results: List[Dict[str, Any]] = await asyncio.to_thread(
                faiss_memory.search_similar, text, 5
            )
            similar_count = sum(
                1 for r in results if r.get("distance", 0) >= _SIMILARITY_THRESHOLD
            )
            # 0 similar -> 0, 1 -> 25, 2 -> 50, 3 -> 75, 4+ -> 100
            return float(min(100, similar_count * 25))
        except Exception as exc:
            logger.warning(f"[PRIORITY_ENGINE] Frequency signal (FAISS) failed, defaulting to 0: {exc}")
            return 0.0

    @staticmethod
    async def _safe_location_risk(
        cluster_engine, memory_records: List[Dict[str, Any]], lat: Optional[float], lon: Optional[float]
    ) -> float:
        """
        Location-risk signal: does this complaint fall inside an existing
        DBSCAN hotspot cluster? Score scales with that hotspot's size.
        """
        if lat is None or lon is None:
            return 0.0

        try:
            hotspots = await asyncio.to_thread(cluster_engine.analyze_hotspots, memory_records)
            for hotspot in hotspots:
                dist_km = _haversine_km(
                    lat, lon, hotspot["center_lat"], hotspot["center_lon"]
                )
                if dist_km <= _HOTSPOT_RADIUS_KM:
                    # Scale with hotspot size: 3 complaints -> 40, 8+ -> 100
                    count = hotspot.get("complaint_count", 3)
                    return float(min(100, 25 + (count - 3) * 12))
            return 0.0
        except Exception as exc:
            logger.warning(f"[PRIORITY_ENGINE] Location-risk signal (DBSCAN) failed, defaulting to 0: {exc}")
            return 0.0

    @classmethod
    async def compute_priority(
        cls,
        text: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        ml_service=None,
        faiss_memory=None,
        cluster_engine=None,
        memory_records: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Computes the full explainable priority breakdown for a complaint.

        Returns a dict shaped for direct storage in Complaint.priority_breakdown:
          {
            "severity_score": ..., "impact_score": ..., "frequency_score": ...,
            "location_risk_score": ..., "weights": {...},
            "priority_score": ..., "priority_band": "High"
          }
        """
        if ml_service is None:
            from app.services.ml.inference import MLInferenceService
            ml_service = MLInferenceService()
        if faiss_memory is None:
            from app.services.memory.faiss_memory import FaissMemory
            faiss_memory = FaissMemory()
        if cluster_engine is None:
            from app.services.geo.cluster_engine import ClusterEngine
            cluster_engine = ClusterEngine()

        sev_impact = await cls._safe_severity_and_impact(ml_service, text)
        frequency_score = await cls._safe_frequency(faiss_memory, text)
        location_risk_score = await cls._safe_location_risk(
            cluster_engine, memory_records or [], lat, lon
        )

        severity_score = sev_impact["severity_score"]
        impact_score = sev_impact["impact_score"]

        priority_score = (
            SEVERITY_WEIGHT * severity_score
            + IMPACT_WEIGHT * impact_score
            + FREQUENCY_WEIGHT * frequency_score
            + LOCATION_RISK_WEIGHT * location_risk_score
        )
        priority_score = round(min(100.0, max(0.0, priority_score)), 2)
        band = _band_for_score(priority_score)

        breakdown = {
            "severity_score": severity_score,
            "impact_score": impact_score,
            "frequency_score": frequency_score,
            "location_risk_score": location_risk_score,
            "weights": {
                "severity_weight": SEVERITY_WEIGHT,
                "impact_weight": IMPACT_WEIGHT,
                "frequency_weight": FREQUENCY_WEIGHT,
                "location_risk_weight": LOCATION_RISK_WEIGHT,
            },
            "priority_score": priority_score,
            "priority_band": band,
        }

        logger.info(
            f"[PRIORITY_ENGINE] Severity={severity_score}, Impact={impact_score}, "
            f"Frequency={frequency_score}, Location={location_risk_score} "
            f"-> Score={priority_score} -> {band}"
        )

        return breakdown
