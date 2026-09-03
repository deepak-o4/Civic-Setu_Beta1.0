"""
Routing Engine — crash-proof AI classification + officer assignment.

Every external call (ML classifier, RAG retriever, FAISS, Decision Agent,
Assignment Engine) is wrapped in its own try/except.  On any sub-system
failure the engine falls back to deterministic defaults:
  • category  → "OTHER"
  • priority  → MEDIUM
  • department→ "DEFAULT_DEPARTMENT"
  • assignment→ None (UNASSIGNED)
"""
import logging
import asyncio
from typing import Dict, Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.complaint import PriorityEnum
from app.services.ml.inference import MLInferenceService
from app.services.memory.retriever import ContextRetriever
from app.engines.faiss_rag import FaissMemory
from app.services.agents.decision_agent import DecisionAgent
from app.engines.assignment import AssignmentEngine
from app.services.ai.groq_classifier import GroqClassifier

logger = logging.getLogger("civicsetu.engines.routing")

# ---------------------------------------------------------------------------
# Safe wrappers — each catches its own exceptions
# ---------------------------------------------------------------------------

async def _safe_classify(classifier: MLInferenceService, text: str) -> Dict[str, Any]:
    """ML classification with fallback to OTHER."""
    try:
        return await asyncio.to_thread(classifier.predict, text)
    except Exception as exc:
        logger.error(f"[ROUTING_ENGINE] Classification failed — fallback to OTHER: {exc}")
        return {"category_pred": ["OTHER"], "confidence_score": 0.5}


async def _safe_severity(classifier: MLInferenceService, text: str) -> str:
    """Severity prediction with fallback to MEDIUM."""
    try:
        return await asyncio.to_thread(classifier.predict_severity, text)
    except Exception as exc:
        logger.error(f"[ROUTING_ENGINE] Severity prediction failed — fallback to MEDIUM: {exc}")
        return "MEDIUM"


async def _safe_rag(rag: ContextRetriever, text: str) -> Dict[str, Any]:
    """RAG context retrieval — non-critical, swallow errors."""
    try:
        return await asyncio.to_thread(rag.get_context, text)
    except Exception as exc:
        logger.error(f"[ROUTING_ENGINE] RAG lookup failed: {exc}")
        return {"similar_cases": []}


async def _safe_agent(agent: DecisionAgent, text: str, context, labels) -> Dict[str, Any]:
    """Agentic verification — non-critical, swallow errors."""
    try:
        return await agent.process(text, context=context, ml_predictions=labels)
    except Exception as exc:
        logger.error(f"[ROUTING_ENGINE] Decision agent failed: {exc}")
        return {"decision": None, "reasoning": "Agent unavailable"}


async def _safe_memory_write(memory: FaissMemory, text: str, metadata: Dict[str, Any]):
    """FAISS persistence — fire-and-forget, swallow errors."""
    try:
        await asyncio.to_thread(memory.add_memory, text, metadata)
    except Exception as exc:
        logger.error(f"[ROUTING_ENGINE] Non-critical FAISS memory write failed: {exc}")


# ---------------------------------------------------------------------------
# Main Engine
# ---------------------------------------------------------------------------

class RoutingEngine:
    """NLP-driven Auto Routing with full crash-proofing."""

    @staticmethod
    def get_department(category: str) -> str:
        """Map a category label to the responsible government department."""
        cat = (category or "").strip().upper()
        if not cat or cat == "OTHER" or cat == "GENERAL":
            return "General Administration"

        category_map = {
            "ROADS": "Roads & Public Works Department",
            "ELECTRICITY": "Electricity Department",
            "WATER": "Water Supply Department",
            "WASTE": "Sanitation & Waste Management Department",
            "DRAINAGE": "Drainage & Sewerage Department",
            "PUBLIC FACILITIES": "Public Facilities Department",
        }
        if cat in category_map:
            return category_map[cat]
        return "General Administration"

    @staticmethod
    async def process_routing(
        text: str, district: str, session: AsyncSession
    ) -> Dict[str, Any]:
        """
        Full AI routing pipeline.  Returns a dict with keys:
          assigned_to, department, category, priority, decision, confidence
        All steps are individually fault-tolerant.
        """
        logger.info("[ROUTING_ENGINE] Processing NLP Routing for text snippet...")

        # Initialise sub-systems (lightweight, no I/O)
        classifier = MLInferenceService()
        rag = ContextRetriever()
        memory = FaissMemory()
        agent = DecisionAgent()
        groq_classifier = GroqClassifier()

        # 1️⃣ & 2️⃣ NLP Classification & Severity (via Groq Classifier)
        try:
            result = await asyncio.to_thread(groq_classifier.classify, text)
            category = result["category"]
            department = result["department"]
            severity_str = result["priority"]
            confidence = result["confidence"]
        except Exception as exc:
            logger.error(f"[ROUTING_ENGINE] Groq Classification failed — falling back to defaults: {exc}")
            category = "Other"
            department = "General Administration"
            severity_str = "LOW"
            confidence = 0.5

        labels = [category]

        try:
            priority = PriorityEnum[severity_str.upper()]
        except KeyError:
            priority = PriorityEnum.MEDIUM

        # 3️⃣  RAG intelligence (non-critical)
        rag_res = await _safe_rag(rag, text)
        similar_cases = rag_res.get("similar_cases", [])

        # 4️⃣  Agentic verification (non-critical)
        decision_res = await _safe_agent(agent, text, similar_cases, labels)
        decision = decision_res.get("decision")
        logger.info(f"[ROUTING_ENGINE] Decision Agent Resolution: {decision}")

        # 5️⃣  Officer assignment (only if confidence high enough)
        assigned_officer: Optional[int] = None
        if confidence >= 0.6:
            try:
                assigned_officer = await AssignmentEngine.assign_officer(
                    department, district, session
                )
            except Exception as exc:
                logger.error(
                    f"[ROUTING_ENGINE] Assignment failed — UNASSIGNED: {exc}"
                )

        # 6️⃣  Persist ML signal to FAISS (fire-and-forget)
        await _safe_memory_write(memory, text, {
            "decision": decision,
            "labels": labels,
            "department": department,
            "priority": severity_str,
            "assigned_to": assigned_officer,
        })

        return {
            "assigned_to": assigned_officer,
            "department": department,
            "category": category,
            "priority": priority,
            "decision": decision,
            "confidence": confidence,
        }

    # Legacy helper kept for backward compat with complaints.py route_complaint
    @staticmethod
    async def route_complaint(category: str, district: str, session: AsyncSession) -> Optional[int]:
        """Simple assignment wrapper used by the complaint submission route."""
        department = RoutingEngine.get_department(category)
        try:
            return await AssignmentEngine.assign_officer(department, district, session)
        except Exception as exc:
            logger.error(f"[ROUTING_ENGINE] route_complaint failed: {exc}")
            return None
