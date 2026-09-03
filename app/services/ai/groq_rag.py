import os
import logging
from groq import Groq
from app.core.config import settings

logger = logging.getLogger(__name__)


class GroqRAG:

    def __init__(self):

        api_key = settings.GROQ_API_KEY

        if not api_key:
            raise ValueError(
                "GROQ_API_KEY not configured"
            )

        self.client = Groq(
            api_key=api_key
        )

        # Current, actively-served Groq production models (as of this writing).
        # Tried in order — if the first is deprecated/unavailable/rate-limited,
        # we fall through to the next instead of silently failing every call.
        # NOTE: llama-3.3-70b-versatile, llama-3.1-8b-instant, and gemma2-9b-it
        # were deprecated/decommissioned by Groq — replaced with their current
        # recommended successors. Check https://console.groq.com/docs/deprecations
        # if these start failing again.
        self.models = [
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.6-27b",
        ]

    def answer(
        self,
        query: str,
        contexts: list[str]
    ):

        context_text = "\n".join(contexts)
        has_real_context = bool(contexts) and contexts[0] != "No similar complaint history found."

        prompt = f"""You are the CivicSetu citizen grievance assistant for a Municipal Authority.

Relevant past complaint history (may or may not be related to this question):
{context_text}

Citizen's question:
{query}

Instructions:
- If the complaint history above is directly relevant, use it to inform your answer.
- If it is not relevant, or there is none, that's fine — answer the question anyway using
  your own general knowledge about civic infrastructure, public safety, government
  processes, or everyday helpful advice. Never refuse to answer just because the
  complaint history doesn't cover the topic.
- If the question is about handling an emergency or safety issue (e.g. "how do I deal
  with a flood", "what should I do about a gas leak"), give 2-4 short, practical,
  numbered first-response steps.
- Keep the answer concise, warm, and genuinely helpful — like a knowledgeable civic
  assistant, not a search engine reciting database rows.

Answer:"""

        system_prompt = (
            "You are a helpful, knowledgeable civic assistant. Prefer relevant supplied "
            "context when it applies, but always answer the citizen's question using your "
            "own general knowledge when the context is missing or unrelated. Never say you "
            "can't help just because there's no matching database record."
        )

        last_error = None
        for model in self.models:
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    temperature=0.4,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ]
                )
                return response.choices[0].message.content
            except Exception as e:
                last_error = e
                logger.warning(f"Groq model '{model}' failed: {e}. Trying next model if available.")
                continue

        # All models failed — log the real error so it's actually diagnosable,
        # and give an honest fallback instead of pretending to have an answer.
        logger.error(f"All Groq models failed for query '{query[:80]}...': {last_error}", exc_info=True)

        if has_real_context:
            return (
                f"I'm having trouble reaching the AI service right now, but here's what's in our records:\n\n"
                f"{contexts[0][:300]}\n\n"
                f"Please try asking again in a moment, or contact your local municipal office directly."
            )
        return (
            "I'm having trouble reaching the AI service right now. Please try again in a moment, "
            "or contact your local municipal authority directly for immediate assistance."
        )
