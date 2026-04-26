"""CV preprocessing and candidate DNA extraction."""

from __future__ import annotations

from datetime import UTC, datetime
import re
import unicodedata
from typing import Any

from config import CV_ENTITY_THRESHOLD, CV_SKILLS_SECTION_THRESHOLD
from models import CandidateDnaProfile, SkillEvidence, TaxonomyMatch
from stages.entities import extract_entities
from stages.taxonomy import TaxonomyIndex, get_taxonomy_index

EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_PATTERN = re.compile(r"[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}")
SECTION_HEADERS = {
    "information": re.compile(r"^(?:contact|information|personal information|profile)$", re.I),
    "summary": re.compile(r"^(?:summary|objective|professional summary|profile)$", re.I),
    "skills": re.compile(r"^(?:skills|technical skills|technologies|core competencies|expertise)$", re.I),
    "experience": re.compile(r"^(?:work experience|professional experience|experience|employment|work history)$", re.I),
    "education": re.compile(r"^(?:education|academic background|qualifications|certifications?)$", re.I),
}
DATE_RANGE_PATTERN = re.compile(
    r"(?P<start>(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(?P<start_year>19[7-9]\d|20[0-3]\d)"
    r"\s*(?:-|–|—|to)\s*"
    r"(?P<end>(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(?:19[7-9]\d|20[0-3]\d)|present|current)",
    re.I,
)
YEARS_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)", re.I)
DEGREE_PATTERN = re.compile(r"\b(phd|ph\.d|doctorate|master|m\.s|mba|bachelor|b\.s|b\.a|associate|diploma)\b", re.I)
MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def extract_candidate_dna(raw_text: str, taxonomy: TaxonomyIndex | None = None) -> CandidateDnaProfile:
    """Build a candidate DNA artifact from extracted resume text."""
    taxonomy = taxonomy or get_taxonomy_index()
    cleaned = clean_resume_text(raw_text)
    sections = split_sections(cleaned)
    info_text = "\n".join([*sections.get("information", []), *cleaned.splitlines()[:8]])
    skill_zone_text = "\n".join(sections.get("skills", []))
    experience_text = "\n".join(sections.get("experience", [])) or cleaned
    education_text = "\n".join(sections.get("education", []))

    tech_matches = _dedupe_matches([
        *taxonomy.find_mentions(skill_zone_text, "tech"),
        *taxonomy.find_mentions(experience_text, "tech"),
        *_map_gliner_entities(taxonomy, skill_zone_text, "tech", CV_SKILLS_SECTION_THRESHOLD),
        *_map_gliner_entities(taxonomy, experience_text, "tech", CV_ENTITY_THRESHOLD),
    ])
    soft_matches = _dedupe_matches([
        *taxonomy.find_mentions(cleaned, "soft"),
        *_map_gliner_entities(taxonomy, cleaned, "soft", CV_ENTITY_THRESHOLD),
    ])
    skill_evidence = [_skill_evidence(match, experience_text, cleaned) for match in tech_matches]

    total_years = _extract_declared_years(cleaned) or _total_experience_from_text(experience_text)
    name = _extract_name(cleaned)
    email = _extract_email(cleaned)
    phone = _extract_phone(cleaned)

    warnings = []
    if not skill_evidence:
        warnings.append("skills_not_confident")
    if total_years is None:
        warnings.append("experience_years_not_confident")
    if not name:
        warnings.append("name_not_confident")

    return CandidateDnaProfile(
        information={
            "name": name,
            "email": email,
            "phone": phone,
            "years_of_experience": total_years,
            "job_title_original": _extract_recent_title(experience_text),
            "processed_at": datetime.now(UTC).isoformat(),
        },
        hard_skills={
            "direct_mention": [item.model_dump() for item in skill_evidence],
            "certifications": _extract_certifications(education_text or cleaned),
        },
        soft_skills=[_soft_skill_payload(match) for match in soft_matches],
        education={
            "degree": _extract_degree(education_text or cleaned),
            "raw": education_text[:1000],
        },
        raw_entities=[
            {"text": match.source_text, "label": "Technical Skill", "zone_type": "skills_or_experience"}
            for match in tech_matches
        ],
        taxonomy_traces=[_trace_payload(match) for match in [*tech_matches, *soft_matches]],
        parse_warnings=warnings,
    )


def clean_resume_text(text: str) -> str:
    normalized = unicodedata.normalize("NFC", text)
    normalized = normalized.replace("\u2022", "-").replace("➢", "-").replace("■", "-").replace("·", "-")
    normalized = re.sub(r"[ \t]+", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def split_sections(text: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current: str | None = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        matched = next((name for name, pattern in SECTION_HEADERS.items() if pattern.match(line.strip(":"))), None)
        if matched:
            current = matched
            sections.setdefault(current, [])
            continue

        if current:
            sections.setdefault(current, []).append(line)

    return sections


def merge_intervals(intervals: list[tuple[int, int]]) -> list[tuple[int, int]]:
    """Merge overlapping month-index intervals."""
    if not intervals:
        return []

    ordered = sorted(intervals)
    merged = [ordered[0]]
    for start, end in ordered[1:]:
        last_start, last_end = merged[-1]
        if start <= last_end:
            merged[-1] = (last_start, max(last_end, end))
        else:
            merged.append((start, end))
    return merged


def _skill_evidence(match: TaxonomyMatch, experience_text: str, full_text: str) -> SkillEvidence:
    intervals = _skill_intervals(match.canonical_name, experience_text)
    years = _interval_years(intervals)
    if years == 0:
        declared = _extract_declared_years(full_text)
        years = min(declared or 0, years)

    return SkillEvidence(
        skill=match.source_text,
        taxonomy_id=match.taxonomy_id,
        canonical_name=match.canonical_name,
        years=years,
        zones=_zones_for_skill(match.canonical_name, full_text),
        taxonomy_type=match.taxonomy_type if match.taxonomy_type in {"tech", "soft"} else "unmapped",
        path=match.path,
        confidence=match.confidence,
        evidence=_evidence_lines(match.canonical_name, full_text),
    )


def _skill_intervals(skill: str, experience_text: str) -> list[tuple[int, int]]:
    intervals: list[tuple[int, int]] = []
    skill_pattern = re.compile(r"\b" + re.escape(skill).replace(r"\ ", r"\s+") + r"\b", re.I)

    for block in _experience_blocks(experience_text):
        if not skill_pattern.search(block):
            continue
        for match in DATE_RANGE_PATTERN.finditer(block):
            start = _month_index(match.group("start_year"), match.group("start") or "")
            end_raw = match.group("end")
            end = _current_month_index() if end_raw.lower() in {"present", "current"} else _month_index_from_text(end_raw)
            if start and end and end > start:
                intervals.append((start, end))

    return merge_intervals(intervals)


def _experience_blocks(text: str) -> list[str]:
    chunks = re.split(r"\n(?=.*(?:19[7-9]\d|20[0-3]\d).*(?:-|–|—|to).*(?:19[7-9]\d|20[0-3]\d|present|current))", text, flags=re.I)
    return [chunk.strip() for chunk in chunks if chunk.strip()] or [text]


def _interval_years(intervals: list[tuple[int, int]]) -> float:
    months = sum(end - start for start, end in intervals)
    return round(months / 12, 1) if months > 0 else 0.0


def _total_experience_from_text(text: str) -> float | None:
    intervals = []
    for match in DATE_RANGE_PATTERN.finditer(text):
        start = _month_index(match.group("start_year"), match.group("start") or "")
        end_raw = match.group("end")
        end = _current_month_index() if end_raw.lower() in {"present", "current"} else _month_index_from_text(end_raw)
        if start and end and end > start:
            intervals.append((start, end))
    years = _interval_years(merge_intervals(intervals))
    return years or None


def _month_index(year_text: str, month_text: str) -> int:
    year = int(year_text)
    month = 1
    lowered = month_text.lower()
    for key, value in MONTHS.items():
        if key in lowered:
            month = value
            break
    return year * 12 + month


def _month_index_from_text(value: str) -> int | None:
    year = re.search(r"(19[7-9]\d|20[0-3]\d)", value)
    if not year:
        return None
    return _month_index(year.group(1), value)


def _current_month_index() -> int:
    current = datetime.now(UTC)
    return current.year * 12 + current.month


def _extract_declared_years(text: str) -> float | None:
    values = [float(match.group(1)) for match in YEARS_PATTERN.finditer(text[:2000])]
    return max(values) if values else None


def _extract_email(text: str) -> str | None:
    match = EMAIL_PATTERN.search(text)
    return match.group(0) if match else None


def _extract_phone(text: str) -> str | None:
    match = PHONE_PATTERN.search(text)
    if not match:
        return None
    phone = match.group(0).strip()
    return phone if len(re.sub(r"\D", "", phone)) >= 7 else None


def _extract_name(text: str) -> str | None:
    for line in text.splitlines()[:6]:
        candidate = line.strip(" -|")
        if not candidate or "@" in candidate or any(char.isdigit() for char in candidate):
            continue
        if len(candidate.split()) in {2, 3, 4} and len(candidate) <= 80:
            if not SECTION_HEADERS.get(candidate.lower()):
                return candidate
    return None


def _extract_recent_title(text: str) -> str | None:
    for line in text.splitlines()[:12]:
        if DATE_RANGE_PATTERN.search(line):
            title = DATE_RANGE_PATTERN.sub("", line).strip(" -|,")
            return title[:120] or None
    return None


def _extract_degree(text: str) -> str | None:
    match = DEGREE_PATTERN.search(text)
    if not match:
        return None
    value = match.group(1).lower()
    if "ph" in value or "doctor" in value:
        return "phd"
    if "master" in value or "mba" in value or "m." in value:
        return "master"
    if "bachelor" in value or "b." in value:
        return "bachelor"
    if "associate" in value:
        return "associate"
    return "diploma"


def _extract_certifications(text: str) -> list[str]:
    matches = re.findall(r"\b(?:AWS|Azure|GCP|PMP|CSM|PSM|Scrum Master|IELTS|TOEIC|CISSP|CCNA|CKA)\b", text, re.I)
    return sorted({match.strip() for match in matches}, key=str.lower)


def _map_gliner_entities(
    taxonomy: TaxonomyIndex,
    text: str,
    taxonomy_type: str,
    threshold: float,
) -> list[TaxonomyMatch]:
    labels = (
        ["Technical Skill", "Tool", "Methodology", "Certification"]
        if taxonomy_type == "tech"
        else ["Soft Skill"]
    )
    return [
        taxonomy.map_text(entity["text"], taxonomy_type)
        for entity in extract_entities(text, labels, threshold=threshold)
    ]


def _zones_for_skill(skill: str, text: str) -> list[str]:
    sections = split_sections(text)
    zones = []
    pattern = re.compile(r"\b" + re.escape(skill).replace(r"\ ", r"\s+") + r"\b", re.I)
    for name, lines in sections.items():
        if pattern.search("\n".join(lines)):
            zones.append(name)
    return zones or ["full_text"]


def _evidence_lines(skill: str, text: str) -> list[str]:
    pattern = re.compile(r"\b" + re.escape(skill).replace(r"\ ", r"\s+") + r"\b", re.I)
    evidence = []
    for line in text.splitlines():
        cleaned = line.strip()
        if cleaned and pattern.search(cleaned):
            evidence.append(cleaned[:240])
        if len(evidence) >= 3:
            break
    return evidence


def _dedupe_matches(matches: list[TaxonomyMatch]) -> list[TaxonomyMatch]:
    seen: set[str] = set()
    deduped = []
    for match in matches:
        key = match.taxonomy_id or match.normalized_text
        if key in seen:
            continue
        seen.add(key)
        deduped.append(match)
    return deduped


def _soft_skill_payload(match: TaxonomyMatch) -> dict[str, Any]:
    return {
        "skill": match.canonical_name,
        "taxonomy_id": match.taxonomy_id,
        "source_text": match.source_text,
        "path": match.path,
        "confidence": match.confidence,
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
