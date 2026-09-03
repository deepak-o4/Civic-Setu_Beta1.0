"""
AIImageClassificationEngine: classifies a photo of a civic issue into one of
CivicSetu's Indian-municipal complaint categories using Google's Gemini
Vision API.

Why an LLM vision model instead of a trained CNN?
---------------------------------------------------
A traditional image classifier (CNN/ResNet/etc.) needs a labeled image
dataset of thousands of photos per category (potholes, garbage dumps, broken
benches, etc.). No such dataset could be obtained in the environment this
was originally built in. Rather than fabricate a dataset or ship a
non-functional placeholder, this engine calls a multimodal Gemini model with
a structured-JSON prompt - the same pattern CivicSetu already uses for text
classification/routing via Groq (see routing_engine.py), just swapped to
Gemini for vision specifically, per project owner's request.

Setup
-----
Requires the `google-genai` package (see requirements.txt) and a
`GEMINI_API_KEY` environment variable (see .env.example). Get a key from
https://aistudio.google.com/apikey - the free tier is sufficient for
development/testing.
"""
import json
import logging
import os

from google import genai
from google.genai import types

logger = logging.getLogger("civicsetu.image_classifier")

# Same category taxonomy as core_ai/severity_engine.py (Swachhata-MoHUA +
# common Indian ULB portal categories).
VALID_CATEGORIES = [
    "Pothole", "Road Damage", "Open Manhole", "Sewage Overflow",
    "Drainage / Waterlogging", "Damaged Electric Pole / Exposed Wiring",
    "Fallen Tree / Branch", "Traffic Signal Not Working",
    "Streetlight Not Working", "Garbage Dump", "Garbage Vehicle Not Arrived",
    "Dustbins Not Cleaned", "Sweeping Not Done", "Dead Animal",
    "Public Toilet Issue", "Illegal Dumping", "Stray Animal Menace",
    "Broken Park Bench / Amenity", "Damaged Footpath / Pavement",
    "Graffiti / Vandalism", "Water Leakage / Pipe Burst", "No Water Supply",
    "Illegal Construction", "Encroachment", "Other / Unclassified",
]

CLASSIFICATION_PROMPT = f"""You are an image classifier for an Indian municipal civic-complaint app.
Look at the uploaded photo and classify the civic issue shown.

Valid categories (pick exactly one, use the exact string):
{json.dumps(VALID_CATEGORIES)}

Respond with a JSON object only, in this exact schema:
{{
  "category": "<one of the valid categories above>",
  "description": "<one-sentence plain-English description of what the photo shows>",
  "confidence": <float 0.0-1.0>
}}
"""


class AIImageClassificationEngine:
    """
    Vision-based civic issue classifier powered by Google's Gemini API.
    """

    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("Production Error: GEMINI_API_KEY environment variable is not defined.")
        self.client = genai.Client(api_key=api_key)
        # Gemini's model lineup moves fast. gemini-3.5-flash is the current
        # (Aug 2026) GA/stable multimodal Flash model. If it's retired,
        # check https://ai.google.dev/gemini-api/docs/models for the
        # current model ID and update here.
        self.vision_model = "gemini-3.5-flash"

    def classify_image(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
        """
        Sends the image to Gemini and returns a parsed classification:
        {category, description, confidence}.
        Falls back to a safe default on any parsing/API failure so a bad
        photo never blocks complaint submission.
        """
        try:
            response = self.client.models.generate_content(
                model=self.vision_model,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    CLASSIFICATION_PROMPT,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )

            raw_json = response.text
            logger.info(f"[DEBUG_IMAGE_CLASSIFIER] Gemini raw response: {raw_json}")
            parsed = json.loads(raw_json)

            category = parsed.get("category", "Other / Unclassified")
            if category not in VALID_CATEGORIES:
                logger.warning(f"Model returned unrecognized category '{category}'; falling back to Other.")
                category = "Other / Unclassified"

            return {
                "category": category,
                "description": parsed.get("description", ""),
                "confidence": float(parsed.get("confidence", 0.5)),
            }
        except Exception as err:
            logger.error(f"[IMAGE_CLASSIFIER_CRASH] Gemini vision call failed: {str(err)}", exc_info=True)
            return {
                "category": "Other / Unclassified",
                "description": "Unable to automatically analyze this image.",
                "confidence": 0.0,
            }
