"""Stage 0: build a lightweight JD artifact for the isolated v3 pipeline."""

from __future__ import annotations

import json
import re
from datetime import datetime, UTC
from pathlib import Path


SKILLS_TAXONOMY_PATH = Path(__file__).parent.parent / "data" / "skills_taxonomy.json"

MIN_YEARS_PATTERN = re.compile(
    r"(\d+)\+?\s*(?:years?|yrs?)(?:\s+of\s+experience)?",
    re.IGNORECASE,
)
DEGREE_PATTERN = re.compile(
    r"\b(bachelor(?:'s)?|master(?:'s)?|ph\.?d\.?|doctorate|associate(?:'s)?)\b",
    re.IGNORECASE,
)

SOFT_SKILL_HINTS = [
    "communication",
    "teamwork",
    "leadership",
    "stakeholder management",
    "problem solving",
    "collaboration",
]


def _load_skills_taxonomy():
    if not SKILLS_TAXONOMY_PATH.exists():
        return []

    with open(SKILLS_TAXONOMY_PATH, encoding="utf-8") as file:
        raw = json.load(file)

    return [item.lower() for item in raw]


def _find_taxonomy_skills(text: str):
    lowered = text.lower()
    matches: list[str] = []

    for skill in _load_skills_taxonomy():
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, lowered):
            matches.append(skill)

    return matches[:24]


def build_job_description_artifact(job_description):
    """Create a deterministic session-level JD artifact.

    This is intentionally lightweight for the first pass. It establishes
    the stable contract shape that later research-grade enrichment can fill in.
    """

    text = job_description.raw_text
    matched_skills = _find_taxonomy_skills(text)
    years_match = MIN_YEARS_PATTERN.search(text)
    degree_match = DEGREE_PATTERN.search(text)
    soft_skills = [item for item in SOFT_SKILL_HINTS if item in text.lower()]

    must_have = matched_skills[: min(10, len(matched_skills))]
    expansion = matched_skills[len(must_have): len(must_have) + 10]

    return {
        "metadata": {
            "name": job_description.name,
            "jobTitle": job_description.job_title,
            "source": job_description.source,
            "processedAt": datetime.now(UTC).isoformat(),
        },
        "hardConstraints": {
            "minExperienceYears": int(years_match.group(1)) if years_match else None,
            "requiredDegree": degree_match.group(1).title() if degree_match else None,
        },
        "hardSkills": {
            "mustHave": {
                "techSkills": must_have,
                "certifications": [],
            },
            "niceToHave": {
                "fromJobDescription": [],
                "fromTaxonomyExpansion": expansion,
            },
        },
        "softSkills": soft_skills,
    }
