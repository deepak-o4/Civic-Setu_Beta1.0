import json
import os
from groq import Groq
from app.core.config import settings


CATEGORY_DEPARTMENT_MAP = {
    "Roads": "Roads & Public Works Department",
    "Water": "Water Supply Department",
    "Waste": "Sanitation & Waste Management Department",
    "Electricity": "Electricity Department",
    "Drainage": "Drainage & Sewerage Department",
    "Public Facilities": "Public Facilities Department",
    "Other": "General Administration"
}


class GroqClassifier:

    # llama-3.1-8b-instant was deprecated/decommissioned by Groq;
    # openai/gpt-oss-20b is their recommended fast replacement.
    MODEL = "openai/gpt-oss-20b"

    def __init__(self):
        api_key = settings.GROQ_API_KEY

        if not api_key:
            raise ValueError("GROQ_API_KEY not configured")

        self.client = Groq(api_key=api_key)

    def classify(self, complaint_text: str) -> dict:

        prompt = f"""
You are the CivicSetu Urban Infrastructure Complaint Classification Engine.

Classify the complaint.

Complaint:
{complaint_text}

Allowed Categories:
- Roads
- Water
- Waste
- Electricity
- Drainage
- Public Facilities
- Other

Priority Rules:

CRITICAL:
- danger to life
- violence
- flooding
- medical emergency
- road collapse
- electrical hazard

HIGH:
- utility outage
- severe service disruption

MEDIUM:
- public inconvenience

LOW:
- minor issue

Return ONLY valid JSON.

{{
    "category": "",
    "priority": "",
    "confidence": 0.95
}}
"""

        response = self.client.chat.completions.create(
            model=self.MODEL,
            response_format={"type": "json_object"},
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": "You only output JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        content = response.choices[0].message.content

        result = json.loads(content)

        category = result.get("category", "Other")
        priority = result.get("priority", "MEDIUM")
        confidence = float(result.get("confidence", 0.90))

        department = CATEGORY_DEPARTMENT_MAP.get(
            category,
            "General Administration"
        )

        return {
            "category": category,
            "department": department,
            "priority": priority,
            "confidence": confidence
        }