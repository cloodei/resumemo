"""JD enrichment stage: constraints, skill buckets, and taxonomy expansion."""

from __future__ import annotations

import re
from typing import Any

from config import JD_ENTITY_THRESHOLD, JD_TAXONOMY_EXPANSION_LIMIT, PIPELINE_VERSION
from models import JobDescriptionArtifact, TaxonomyMatch
from stages.entities import extract_entities
from stages.taxonomy import TaxonomyIndex, get_taxonomy_index, normalize_term

EXPERIENCE_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)", re.IGNORECASE)
DEGREE_LEVELS = [
    ("phd", ("phd", "ph.d", "doctorate", "doctoral")),
    ("master", ("master", "m.s", "ms ", "mba", "m.b.a")),
    ("bachelor", ("bachelor", "b.s", "b.a", "degree")),
    ("associate", ("associate", "diploma")),
]
MUST_ZONE_PATTERN = re.compile(
    r"(requirements?|required|must[- ]?have|qualifications?|technical expertise|essential|responsibilities)",
    re.IGNORECASE,
)
WISH_ZONE_PATTERN = re.compile(r"(nice[- ]?to[- ]?have|preferred|desirable|plus|advantage|good[- ]?to[- ]?have)", re.IGNORECASE)
STOP_ZONE_PATTERN = re.compile(r"(benefits|what we offer|about (?:us|company)|closing date|equal opportunity)", re.IGNORECASE)


def enrich_job_description(job_description: str, taxonomy: TaxonomyIndex | None = None) -> JobDescriptionArtifact:
    """Convert a free-text JD into the official structured JD artifact."""
    taxonomy = taxonomy or get_taxonomy_index()
    must_text, nice_text = _split_priority_zones(job_description)
    must_matches = _dedupe_matches([
        *taxonomy.find_mentions(must_text or job_description, "tech"),
        *_map_gliner_entities(taxonomy, must_text or job_description, "tech"),
    ])
    nice_matches = _dedupe_matches([
        *taxonomy.find_mentions(nice_text, "tech"),
        *_map_gliner_entities(taxonomy, nice_text, "tech"),
    ]) if nice_text else []
    soft_matches = _dedupe_matches([
        *taxonomy.find_mentions(job_description, "soft"),
        *_map_gliner_entities(taxonomy, job_description, "soft"),
    ])

    expansion = taxonomy.sibling_expansion(
        [*must_matches, *nice_matches],
        limit=JD_TAXONOMY_EXPANSION_LIMIT,
    )
    expansion = [
        match for match in expansion
        if match.taxonomy_id not in {item.taxonomy_id for item in [*must_matches, *nice_matches]}
    ]

    constraints = {
        "min_experience_years": _extract_min_experience(job_description),
        "required_degree": _extract_required_degree(job_description),
    }

    warnings = []
    if not must_matches:
        warnings.append("jd_must_have_skills_not_confident")
    if constraints["min_experience_years"] is None:
        warnings.append("jd_min_experience_missing")

    return JobDescriptionArtifact(
        metadata={
            "pipeline_version": PIPELINE_VERSION,
            "job_title": _extract_job_title(job_description),
        },
        hard_constraints=constraints,
        hard_skills={
            "must_have": {
                "tech_skills": [_match_payload(match) for match in must_matches],
                "certifications": _extract_certifications(job_description),
            },
            "nice_to_have": {
                "from_jd_desirable": [_match_payload(match) for match in nice_matches],
                "from_taxonomy_expansion": [_match_payload(match) for match in expansion],
            },
        },
        soft_skills=[_match_payload(match) for match in soft_matches],
        taxonomy_traces=[_trace_payload(match) for match in [*must_matches, *nice_matches, *expansion, *soft_matches]],
        warnings=warnings,
    )


def _split_priority_zones(text: str) -> tuple[str, str]:
    lines = text.splitlines()
    current = "must"
    must_lines: list[str] = []
    nice_lines: list[str] = []

    for line in lines:
        if STOP_ZONE_PATTERN.search(line):
            current = "stop"
        elif WISH_ZONE_PATTERN.search(line):
            current = "nice"
        elif MUST_ZONE_PATTERN.search(line):
            current = "must"

        if current == "must":
            must_lines.append(line)
        elif current == "nice":
            nice_lines.append(line)

    return "\n".join(must_lines).strip(), "\n".join(nice_lines).strip()


def _extract_min_experience(text: str) -> float | None:
    values = [float(match.group(1)) for match in EXPERIENCE_PATTERN.finditer(text)]
    return min(values) if values else None


def _extract_required_degree(text: str) -> str | None:
    normalized = f" {normalize_term(text)} "
    for level, aliases in DEGREE_LEVELS:
        if any(f" {normalize_term(alias)} " in normalized for alias in aliases):
            return level
    return None


def _extract_certifications(text: str) -> list[str]:
    matches = re.findall(r"\b(?:AWS|Azure|GCP|PMP|CSM|PSM|Scrum Master|IELTS|TOEIC|CISSP|CCNA|CKA)\b", text, re.I)
    return sorted({match.strip() for match in matches}, key=str.lower)


def _extract_job_title(text: str) -> str | None:
    for line in text.splitlines()[:5]:
        cleaned = line.strip(" #-:\t")
        if 3 <= len(cleaned) <= 80 and not EXPERIENCE_PATTERN.search(cleaned):
            return cleaned
    return None


def _map_gliner_entities(taxonomy: TaxonomyIndex, text: str, taxonomy_type: str) -> list[TaxonomyMatch]:
    labels = (
        ["Technical Skill", "Methodology", "Tool", "Certification", "Domain Knowledge", "Language", "Education"]
        if taxonomy_type == "tech"
        else ["Soft Skill"]
    )
    return [
        taxonomy.map_text(entity["text"], taxonomy_type)
        for entity in extract_entities(text, labels, threshold=JD_ENTITY_THRESHOLD)
    ]


def _dedupe_matches(matches: list[TaxonomyMatch]) -> list[TaxonomyMatch]:
    seen: set[str] = set()
    deduped: list[TaxonomyMatch] = []
    for match in matches:
        key = match.taxonomy_id or match.normalized_text
        if key in seen:
            continue
        seen.add(key)
        deduped.append(match)
    return deduped


def _match_payload(match: TaxonomyMatch) -> dict[str, Any]:
    return {
        "skill": match.canonical_name,
        "taxonomy_id": match.taxonomy_id,
        "source_text": match.source_text,
        "path": match.path,
        "confidence": match.confidence,
        "match_method": match.match_method,
    }


def _trace_payload(match: TaxonomyMatch) -> dict[str, Any]:
    return {
        "source_text": match.source_text,
        "canonical_name": match.canonical_name,
        "taxonomy_id": match.taxonomy_id,
        "taxonomy_type": match.taxonomy_type,
        "path": match.path,
        "confidence": match.confidence,
        "match_method": match.match_method,
    }
