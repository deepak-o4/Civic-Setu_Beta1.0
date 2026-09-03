"""
SeverityRatingEngine: rule-based priority scoring for civic complaints,
calibrated for Indian municipal governance.

Grounding / data sources
-------------------------
The category taxonomy below matches the categories used by India's actual
civic-complaint apps and portals — the Ministry of Housing & Urban Affairs'
Swachhata-MoHUA app (garbage dumps, dustbins, sweeping, dead animals, public
toilets), and the common category sets used by ULB (Urban Local Body) portals
and citizen apps such as BBMP Sahaaya, PMC Sarathi and MCGM: road
damage/potholes, drainage/waterlogging, streetlight failures, and public
infrastructure damage. See app/ml/README_TFIDF_MODEL.md and this module's
git history for the source URLs consulted.

Base severity per category reflects a widely-used civic prioritization
principle (also used in Swachh Survekshan-style scoring and most Indian ULB
SOPs): issues with a direct public-health or accident risk (open manholes,
sewage overflow, live electrical hazards, deep potholes on carriageways) rank
highest; sanitation/infrastructure-failure issues that degrade daily life
rank medium; cosmetic/amenity issues (a broken park bench, faded paint,
graffiti) rank lowest unless a sensitive location changes the calculus.

Sensitive-zone multiplier
--------------------------
The same defect is not equally severe everywhere — a pothole outside a
school gate is a child-safety hazard; the same pothole in a low-footfall lane
is a lower priority. This engine boosts severity when the complaint's
free-text location/address mentions a sensitive-zone keyword. The keyword
list intentionally includes common Indian-English and transliterated Hindi
terms (e.g. "vidyalaya", "aspatal", "chowk", "mandi") since that is how
municipal complaints are actually written in India.
"""
import logging
import re
from typing import Optional

logger = logging.getLogger("civicsetu.severity_engine")

# --- Category taxonomy (grounded in Swachhata-MoHUA + common ULB portals) ---
# base_score: 1 (low) - 10 (critical)
CATEGORY_SEVERITY = {
    # High-risk / safety-critical
    "pothole": 7,
    "road damage": 7,
    "open manhole": 10,
    "sewage overflow": 9,
    "drainage / waterlogging": 8,
    "damaged electric pole / exposed wiring": 10,
    "fallen tree / branch": 8,
    "traffic signal not working": 7,
    "streetlight not working": 5,
    # Sanitation (Swachhata-MoHUA categories)
    "garbage dump": 6,
    "garbage vehicle not arrived": 5,
    "dustbins not cleaned": 4,
    "sweeping not done": 3,
    "dead animal": 7,
    "public toilet issue": 6,
    "illegal dumping": 6,
    "stray animal menace": 6,
    # Infrastructure / amenity (lower baseline unless in a sensitive zone)
    "broken park bench / amenity": 2,
    "damaged footpath / pavement": 5,
    "graffiti / vandalism": 2,
    "water leakage / pipe burst": 7,
    "no water supply": 7,
    "illegal construction": 5,
    "encroachment": 4,
    "other / unclassified": 4,
}

# --- Sensitive zone keywords (English + common Indian-English/Hindi terms) ---
SENSITIVE_ZONES = {
    "school": [
        "school", "vidyalaya", "vidya mandir", "kendriya vidyalaya", "kv ",
        "playground", "anganwadi", "college", "university", "coaching centre",
    ],
    "hospital": [
        "hospital", "aspatal", "clinic", "phc", "primary health centre",
        "chc", "dispensary", "nursing home", "medical college",
    ],
    "main_road": [
        "highway", "national highway", " nh ", " nh-", " sh ", " sh-",
        "main road", "chowk", "circle", "flyover", "expressway", "ring road",
    ],
    "market": [
        "market", "bazaar", "mandi", "sabzi mandi", "haat", "commercial complex",
    ],
    "religious_senior": [
        "temple", "mandir", "mosque", "masjid", "gurudwara", "church",
        "old age home", "senior citizen",
    ],
    "transit": [
        "bus stop", "bus stand", "railway station", "metro station", "junction",
    ],
}

# Multiplier applied on top of base_score when a sensitive zone is matched.
ZONE_MULTIPLIER = {
    "school": 1.6,
    "hospital": 1.6,
    "main_road": 1.3,
    "market": 1.2,
    "religious_senior": 1.3,
    "transit": 1.2,
}

PRIORITY_BANDS = [
    (8.5, "CRITICAL"),
    (6.5, "HIGH"),
    (4.0, "MEDIUM"),
    (0.0, "LOW"),
]


def _match_zones(location_text: str) -> list:
    if not location_text:
        return []
    text = f" {location_text.lower()} "
    matched = []
    for zone, keywords in SENSITIVE_ZONES.items():
        for kw in keywords:
            if kw in text:
                matched.append(zone)
                break
    return matched


class SeverityRatingEngine:
    """
    Combines a category's baseline severity with sensitive-zone context to
    produce a 1-10 severity score and a PriorityEnum-compatible label
    (LOW / MEDIUM / HIGH / CRITICAL).
    """

    @staticmethod
    def score(category: str, location_text: Optional[str] = None, notes: Optional[str] = None) -> dict:
        cat_key = (category or "other / unclassified").strip().lower()
        base = CATEGORY_SEVERITY.get(cat_key, CATEGORY_SEVERITY["other / unclassified"])

        combined_text = " ".join(filter(None, [location_text, notes]))
        zones = _match_zones(combined_text)

        multiplier = 1.0
        if zones:
            # Use the strongest applicable multiplier; sensitive zones don't
            # stack multiplicatively (that would over-penalize a complaint
            # that happens to mention both "school" and "chowk").
            multiplier = max(ZONE_MULTIPLIER[z] for z in zones)

        raw_score = min(base * multiplier, 10.0)

        priority = "LOW"
        for threshold, label in PRIORITY_BANDS:
            if raw_score >= threshold:
                priority = label
                break

        reasoning_parts = [f"Base severity for '{category}': {base}/10."]
        if zones:
            zone_names = ", ".join(z.replace("_", " ") for z in zones)
            reasoning_parts.append(
                f"Location context matches sensitive zone(s): {zone_names} "
                f"(x{multiplier:.1f} severity multiplier applied)."
            )
        else:
            reasoning_parts.append("No sensitive-zone keywords matched in location text.")

        return {
            "category": category,
            "severity_score": round(raw_score, 2),
            "priority": priority,
            "matched_zones": zones,
            "zone_multiplier": multiplier,
            "reasoning": " ".join(reasoning_parts),
        }
