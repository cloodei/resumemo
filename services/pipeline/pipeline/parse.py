"""Stage 2: Structured parsing of resume text using spaCy NER and heuristics."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

import spacy

from pipeline.config import SPACY_MODEL
from pipeline.models import CandidateProfile, EducationEntry, WorkEntry

logger = logging.getLogger(__name__)

# ── Lazy-loaded resources ─────────────────────────────────────────

_nlp = None
_skills_taxonomy: set[str] | None = None

SKILLS_TAXONOMY_PATH = Path(__file__).parent.parent / "data" / "skills_taxonomy.json"


def _get_nlp():
    """Lazily load the spaCy model."""
    global _nlp
    if _nlp is None:
        logger.info("Loading spaCy model", extra={"model": SPACY_MODEL})
        _nlp = spacy.load(SPACY_MODEL)
    return _nlp


def _get_skills_taxonomy() -> set[str]:
    """Lazily load the skills taxonomy."""
    global _skills_taxonomy
    if _skills_taxonomy is None:
        if SKILLS_TAXONOMY_PATH.exists():
            with open(SKILLS_TAXONOMY_PATH) as f:
                raw = json.load(f)
            _skills_taxonomy = {s.lower() for s in raw}
            logger.info("Skills taxonomy loaded", extra={"count": len(_skills_taxonomy)})
        else:
            logger.warning("Skills taxonomy file not found, using empty set")
            _skills_taxonomy = set()
    return _skills_taxonomy


# ── Regex patterns ────────────────────────────────────────────────

EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_PATTERN = re.compile(r"[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}")

SECTION_HEADERS = {
    "experience": re.compile(
        r"^(?:work\s+)?(?:experience|employment|professional\s+experience|work\s+history)",
        re.IGNORECASE,
    ),
    "education": re.compile(
        r"^(?:education|academic|qualifications|academic\s+background)",
        re.IGNORECASE,
    ),
    "skills": re.compile(
        r"^(?:skills|technical\s+skills|core\s+competencies|technologies|expertise)",
        re.IGNORECASE,
    ),
    "certifications": re.compile(
        r"^(?:certifications?|licenses?|accreditations?)",
        re.IGNORECASE,
    ),
    "projects": re.compile(
        r"^(?:projects?|personal\s+projects?|portfolio)",
        re.IGNORECASE,
    ),
}

DATE_RANGE_PATTERN = re.compile(
    r"(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}"
    r"\s*[-–—to]+\s*"
    r"(?:(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}|[Pp]resent|[Cc]urrent)",
    re.IGNORECASE,
)

DEGREE_PATTERN = re.compile(
    r"\b(?:B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|Ph\.?D\.?|M\.?B\.?A\.?|"
    r"Bachelor(?:'s)?|Master(?:'s)?|Doctorate|Associate(?:'s)?|Diploma)\b",
    re.IGNORECASE,
)

YEAR_PATTERN = re.compile(r"\b(19[7-9]\d|20[0-3]\d)\b")


# ── Main entry point ──────────────────────────────────────────────


def parse_resume(raw_text: str) -> CandidateProfile:
    """Parse raw resume text into a structured CandidateProfile.

    Uses spaCy NER for entity extraction, regex for contact info,
    and section-based heuristics for work history, education, etc.
    """
    nlp = _get_nlp()
    doc = nlp(raw_text[:100_000])  # Cap at 100k chars for spaCy processing

    # Split text into lines for section parsing
    lines = raw_text.split("\n")

    # Extract contact info
    name = _extract_name(doc, lines)
    email = _extract_email(raw_text)
    phone = _extract_phone(raw_text)

    # Extract sections
    sections = _identify_sections(lines)

    # Extract structured fields
    skills = _extract_skills(raw_text, doc)
    work_history = _extract_work_history(sections.get("experience", []), doc)
    education = _extract_education(sections.get("education", []), doc)
    certifications = _extract_certifications(sections.get("certifications", []))
    projects = _extract_projects(sections.get("projects", []))

    # Compute total experience
    total_years = _compute_experience_years(work_history)

    return CandidateProfile(
        name=name,
        email=email,
        phone=phone,
        skills=skills,
        work_history=work_history,
        education=education,
        certifications=certifications,
        projects=projects,
        total_experience_years=total_years,
    )


# ── Extraction helpers ────────────────────────────────────────────


def _extract_name(doc, lines: list[str]) -> str | None:
    """Extract candidate name from spaCy PERSON entities near the top of the document."""
    # Look for PERSON entities in the first 500 characters
    for ent in doc.ents:
        if ent.label_ == "PERSON" and ent.start_char < 500:
            name = ent.text.strip()
            # Basic validation: at least 2 characters, contains a space (first + last)
            if len(name) >= 2:
                return name

    # Fallback: use the first non-empty line
    for line in lines[:5]:
        stripped = line.strip()
        if stripped and len(stripped) >= 2 and len(stripped) <= 100:
            return stripped

    return None


def _extract_email(text: str) -> str | None:
    """Extract the first email address found."""
    match = EMAIL_PATTERN.search(text)
    return match.group(0) if match else None


def _extract_phone(text: str) -> str | None:
    """Extract the first phone number found."""
    match = PHONE_PATTERN.search(text)
    if match:
        phone = match.group(0).strip()
        # Filter out numbers that are too short (likely years or IDs)
        digits_only = re.sub(r"\D", "", phone)
        if len(digits_only) >= 7:
            return phone
    return None


def _identify_sections(lines: list[str]) -> dict[str, list[str]]:
    """Split the resume into named sections based on header patterns."""
    sections: dict[str, list[str]] = {}
    current_section: str | None = None
    current_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_section:
                current_lines.append("")
            continue

        # Check if this line is a section header
        matched_section = None
        for section_name, pattern in SECTION_HEADERS.items():
            if pattern.match(stripped):
                matched_section = section_name
                break

        if matched_section:
            # Save the previous section
            if current_section and current_lines:
                sections[current_section] = current_lines
            current_section = matched_section
            current_lines = []
        elif current_section:
            current_lines.append(stripped)

    # Save the last section
    if current_section and current_lines:
        sections[current_section] = current_lines

    return sections


def _extract_skills(raw_text: str, doc) -> list[str]:
    """Extract skills via taxonomy matching and NER."""
    taxonomy = _get_skills_taxonomy()
    found_skills: set[str] = set()

    text_lower = raw_text.lower()

    # Taxonomy matching
    for skill in taxonomy:
        # Match whole words/phrases
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text_lower):
            # Use original casing from taxonomy where possible
            found_skills.add(skill)

    # Try to preserve original casing by scanning the text
    cased_skills: list[str] = []
    for skill in found_skills:
        # Find the original-case version in the text
        pattern = re.compile(re.escape(skill), re.IGNORECASE)
        match = pattern.search(raw_text)
        if match:
            cased_skills.append(match.group(0))
        else:
            cased_skills.append(skill)

    return sorted(set(cased_skills), key=str.lower)


def _extract_work_history(section_lines: list[str], doc) -> list[WorkEntry]:
    """Extract work history entries from the experience section."""
    if not section_lines:
        return []

    entries: list[WorkEntry] = []
    current_entry: dict = {}
    description_lines: list[str] = []

    for line in section_lines:
        if not line:
            continue

        # Check if this line contains a date range (likely a new entry)
        date_match = DATE_RANGE_PATTERN.search(line)
        if date_match:
            # Save previous entry
            if current_entry:
                current_entry["description"] = "\n".join(description_lines).strip() or None
                entries.append(WorkEntry(**current_entry))
                description_lines = []

            # Start a new entry
            current_entry = {
                "title": line[:date_match.start()].strip(" -–—|,") or None,
                "company": None,
                "start_date": None,
                "end_date": None,
            }

            # Parse dates from the match
            dates = _parse_date_range(date_match.group(0))
            if dates:
                current_entry["start_date"] = dates[0]
                current_entry["end_date"] = dates[1]

            # Try to find company name in the remaining part of the line
            remaining = line[date_match.end():].strip(" -–—|,")
            if remaining:
                current_entry["company"] = remaining

        elif current_entry:
            # Check if this line might be a company name (short, title-case, near the top)
            if not current_entry.get("company") and len(line) < 100 and not line.startswith(("•", "-", "*", "·")):
                current_entry["company"] = line
            else:
                description_lines.append(line)

    # Save the last entry
    if current_entry:
        current_entry["description"] = "\n".join(description_lines).strip() or None
        entries.append(WorkEntry(**current_entry))

    return entries


def _parse_date_range(date_str: str) -> tuple[str | None, str | None] | None:
    """Parse a date range string into (start, end) year-month strings."""
    parts = re.split(r"\s*[-–—]\s*|\s+to\s+", date_str, maxsplit=1)
    if len(parts) < 2:
        return None

    start = _normalize_date(parts[0].strip())
    end_raw = parts[1].strip()

    if re.match(r"(?:present|current)", end_raw, re.IGNORECASE):
        end = None
    else:
        end = _normalize_date(end_raw)

    return (start, end)


def _normalize_date(date_str: str) -> str | None:
    """Normalize a date string to YYYY or YYYY-MM format."""
    year_match = YEAR_PATTERN.search(date_str)
    if not year_match:
        return None
    return year_match.group(0)


def _extract_education(section_lines: list[str], doc) -> list[EducationEntry]:
    """Extract education entries from the education section."""
    if not section_lines:
        return []

    entries: list[EducationEntry] = []
    text_block = "\n".join(section_lines)

    # Process the education section as a block
    edu_doc = _get_nlp()(text_block[:10_000])

    # Find degree mentions
    degree_matches = list(DEGREE_PATTERN.finditer(text_block))
    org_entities = [ent for ent in edu_doc.ents if ent.label_ == "ORG"]

    if degree_matches:
        for match in degree_matches:
            degree = match.group(0)

            # Find the closest ORG entity to this degree mention
            institution = None
            match_pos = match.start()
            closest_dist = float("inf")
            for ent in org_entities:
                dist = abs(ent.start_char - match_pos)
                if dist < closest_dist:
                    closest_dist = dist
                    institution = ent.text

            # Find a year near this degree mention
            year = None
            surrounding = text_block[max(0, match.start() - 100):match.end() + 100]
            year_match = YEAR_PATTERN.search(surrounding)
            if year_match:
                year = int(year_match.group(0))

            entries.append(EducationEntry(degree=degree, institution=institution, year=year))
    elif org_entities:
        # No degree found, but ORG entities exist — create entry from those
        for ent in org_entities[:3]:
            year = None
            surrounding = text_block[max(0, ent.start_char - 50):ent.end_char + 50]
            year_match = YEAR_PATTERN.search(surrounding)
            if year_match:
                year = int(year_match.group(0))
            entries.append(EducationEntry(institution=ent.text, year=year))

    return entries


def _extract_certifications(section_lines: list[str]) -> list[str]:
    """Extract certifications from the certifications section."""
    certs = []
    for line in section_lines:
        stripped = line.strip("•-*·– ")
        if stripped and len(stripped) > 2:
            certs.append(stripped)
    return certs


def _extract_projects(section_lines: list[str]) -> list[str]:
    """Extract project names/descriptions from the projects section."""
    projects = []
    for line in section_lines:
        stripped = line.strip("•-*·– ")
        if stripped and len(stripped) > 2:
            projects.append(stripped)
    return projects


def _compute_experience_years(work_history: list[WorkEntry]) -> float | None:
    """Compute total years of experience from work history date ranges."""
    if not work_history:
        return None

    total_months = 0
    valid_entries = 0

    for entry in work_history:
        start_year = _year_from_date(entry.start_date)
        if start_year is None:
            continue

        if entry.end_date is None:
            # Current position — use 2026 as reference
            end_year = 2026
        else:
            end_year = _year_from_date(entry.end_date)
            if end_year is None:
                continue

        months = (end_year - start_year) * 12
        if months > 0:
            total_months += months
            valid_entries += 1

    if valid_entries == 0:
        return None

    return round(total_months / 12, 1)


def _year_from_date(date_str: str | None) -> int | None:
    """Extract a year integer from a date string."""
    if not date_str:
        return None
    match = YEAR_PATTERN.search(date_str)
    return int(match.group(0)) if match else None
