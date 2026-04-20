"""Artifact mappers for the isolated v3 pipeline."""

from __future__ import annotations

import re


SECTION_PATTERNS = {
    "information": re.compile(r"^(?:contact|information|profile)$", re.IGNORECASE),
    "summary": re.compile(r"^(?:summary|objective|profile summary)$", re.IGNORECASE),
    "skills": re.compile(r"^(?:skills|technical skills|technologies)$", re.IGNORECASE),
    "experience": re.compile(r"^(?:experience|work experience|employment|work history)$", re.IGNORECASE),
    "education": re.compile(r"^(?:education|academic background|qualifications)$", re.IGNORECASE),
}


def build_resume_artifact(raw_text: str) -> dict:
    sections = {
        "information": "",
        "summary": "",
        "skills": "",
        "experience": "",
        "education": "",
    }
    current_section = "summary"

    for line in raw_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        matched_section = next(
            (
                name
                for name, pattern in SECTION_PATTERNS.items()
                if pattern.match(stripped)
            ),
            None,
        )
        if matched_section:
            current_section = matched_section
            continue

        sections[current_section] = (
            f"{sections[current_section]}\n{stripped}".strip()
        )

    normalized_text = "\n".join(line.strip() for line in raw_text.splitlines() if line.strip())

    return {
        "originalText": raw_text,
        "normalizedText": normalized_text,
        "sections": sections,
    }


def build_candidate_dna(profile) -> dict:
    total_years = profile.total_experience_years or 0.0

    return {
        "information": {
            "name": profile.name,
            "phone": profile.phone,
            "email": profile.email,
            "location": None,
            "linkedIn": None,
            "jobTitleOriginal": profile.work_history[0].title if profile.work_history else None,
            "jobTitleStandardized": None,
            "yearsOfExperience": profile.total_experience_years,
        },
        "hardSkills": {
            "directMention": [
                {
                    "skill": skill,
                    "taxonomyId": None,
                    "years": total_years if total_years > 0 else 0.0,
                    "zones": ["skills"],
                }
                for skill in profile.skills
            ],
            "certifications": profile.certifications,
        },
        "softSkills": [],
        "education": {
            "major": None,
            "degree": profile.education[0].degree if profile.education else None,
        },
        "parseWarnings": profile.parse_warnings,
    }


def build_score_artifact(scoring) -> dict:
    dump = scoring.model_dump()
    details = dump["breakdown"].get("skill_match", {}).get("details") or {}

    return {
        "scores": {
            "baseScore": scoring.overall_score,
            "bonusScore": 0.0,
            "totalScore": scoring.overall_score,
        },
        "breakdown": dump["breakdown"],
        "matchedSkills": details.get("matched", []),
        "missingSkills": details.get("missing", []),
        "extraSkills": details.get("extra", []),
    }
