"""Stage 2: Structured parsing of resume text using spaCy NER and heuristics."""

from __future__ import annotations
from datetime import datetime
import json
import logging
import re
from pathlib import Path

import spacy

from config import SPACY_MODEL
from models import CandidateProfile, EducationEntry, WorkEntry


logger = logging.getLogger(__name__)

_nlp = None
_skills_taxonomy: set[str] | None = None

SKILLS_TAXONOMY_PATH = Path(__file__).parent.parent.parent / "data" / "skills_taxonomy.json"


def _get_nlp():
    """Lazily load the spaCy model."""
    global _nlp
    if _nlp is None:
        _nlp = spacy.load(SPACY_MODEL)
    return _nlp


def _get_skills_taxonomy():
    """Lazily load the skills taxonomy."""
    global _skills_taxonomy
    if _skills_taxonomy is None:
        if SKILLS_TAXONOMY_PATH.exists():
            with open(SKILLS_TAXONOMY_PATH) as f:
                raw = json.load(f)
            _skills_taxonomy = {s.lower() for s in raw}
        else:
            logger.error("Skills taxonomy file not found", extra={"path": str(SKILLS_TAXONOMY_PATH)})
            _skills_taxonomy = set()
    return _skills_taxonomy


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
HEADER_LIKE_PATTERN = re.compile(
    r"\b(?:summary|professional summary|profile|objective|resume|curriculum vitae|experience|education|skills|contact)\b",
    re.IGNORECASE,
)
NAME_TOKEN_PATTERN = re.compile(r"^[A-Za-z][A-Za-z'\-.]+$")
ROLE_HEADER_PATTERN = re.compile(
    r"\b(?:summary|objective|contact|curriculum vitae|resume|references|profile)\b",
    re.IGNORECASE,
)
MONTH_MAP = {
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
SKILL_STOPWORDS = {
    "summary",
    "professional",
    "experience",
    "work",
    "education",
    "skills",
    "responsible",
    "references",
    "client",
    "project",
}


def parse_resume(raw_text: str):
    """Parse raw resume text into a structured CandidateProfile.

    Uses spaCy NER for entity extraction, regex for contact info,
    and section-based heuristics for work history, education, etc.
    """
    nlp = _get_nlp()
    doc = nlp(raw_text[:100_000])  # Cap at 100k chars for spaCy processing

    # Split text into lines for section parsing
    lines = raw_text.split("\n")

    # Extract contact info
    name, identity_source, name_confidence, name_warnings = _extract_name(doc, lines)
    email = _extract_email(raw_text)
    phone = _extract_phone(raw_text)

    # Extract sections
    sections = _identify_sections(lines)

    # Extract structured fields
    skills = _extract_skills(raw_text, sections.get("skills", []))
    work_history = _extract_work_history(sections.get("experience", []))
    work_history, work_warnings = _sanitize_work_history(work_history)
    education = _extract_education(sections.get("education", []), doc)
    certifications = _extract_certifications(sections.get("certifications", []))
    projects = _extract_projects(sections.get("projects", []))

    # Compute total experience
    total_years = _compute_experience_years(work_history)

    return CandidateProfile(
        name=name,
        identity_source=identity_source,
        name_confidence=name_confidence,
        email=email,
        phone=phone,
        skills=skills,
        work_history=work_history,
        education=education,
        certifications=certifications,
        projects=projects,
        total_experience_years=total_years,
        parse_warnings=_collect_parse_warnings(
            name_warnings=name_warnings,
            work_warnings=work_warnings,
            skills=skills,
            work_history=work_history,
        ),
    )


def _collect_parse_warnings(
    name_warnings: list[str],
    work_warnings: list[str],
    skills: list[str],
    work_history: list[WorkEntry],
) -> list[str]:
    warnings = [*name_warnings, *work_warnings]
    if not skills:
        warnings.append("skills_not_confident")
    if not work_history:
        warnings.append("work_history_not_confident")
    return sorted(set(warnings))


def _extract_name(doc, lines: list[str]):
    """Extract candidate name from spaCy PERSON entities near the top of the document."""
    warnings: list[str] = []

    # Look for PERSON entities in the first 500 characters
    for ent in doc.ents:
        if ent.label_ == "PERSON" and ent.start_char < 500:
            name = ent.text.strip()
            if _looks_like_person_name(name):
                return name, "ner", 0.95, warnings

    warnings.append("name_ner_not_confident")

    # Fallback: use a validated top line only
    for line in lines[:5]:
        stripped = line.strip()
        if not stripped or len(stripped) > 100:
            continue
        if _looks_like_person_name(stripped):
            return stripped, "top_line", 0.65, warnings

    warnings.append("name_missing_or_invalid")
    return None, "unknown", 0.0, warnings


def _looks_like_person_name(value: str) -> bool:
    candidate = re.sub(r"\s+", " ", value.strip())
    if len(candidate) < 3 or len(candidate) > 60:
        return False
    if "@" in candidate or any(char.isdigit() for char in candidate):
        return False
    if HEADER_LIKE_PATTERN.search(candidate):
        return False
    if ":" in candidate or "," in candidate or "|" in candidate or "/" in candidate:
        return False

    tokens = [token for token in candidate.split(" ") if token]
    if len(tokens) < 2 or len(tokens) > 4:
        return False

    alpha_tokens = 0
    for token in tokens:
        if not NAME_TOKEN_PATTERN.match(token):
            return False
        if len(token) > 1:
            alpha_tokens += 1

    return alpha_tokens >= 2


def _extract_email(text: str):
    """Extract the first email address found."""
    match = EMAIL_PATTERN.search(text)
    return match.group(0) if match else None


def _extract_phone(text: str):
    """Extract the first phone number found."""
    match = PHONE_PATTERN.search(text)
    if match:
        phone = match.group(0).strip()
        # Filter out numbers that are too short (likely years or IDs)
        digits_only = re.sub(r"\D", "", phone)
        if len(digits_only) >= 7:
            return phone
    return None


def _identify_sections(lines: list[str]):
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


def _extract_skills(raw_text: str, skills_section_lines: list[str]):
    """Extract skills with section-aware taxonomy matching and ranking."""
    taxonomy = _get_skills_taxonomy()
    if not taxonomy:
        return []

    text_lower = raw_text.lower()
    section_text = "\n".join(skills_section_lines)
    section_lower = section_text.lower()
    found_skills: dict[str, tuple[int, int]] = {}

    for skill in taxonomy:
        if skill in SKILL_STOPWORDS:
            continue

        pattern = r"\b" + re.escape(skill) + r"\b"
        in_section = bool(section_lower and re.search(pattern, section_lower))
        in_resume = bool(re.search(pattern, text_lower))
        if not in_section and not in_resume:
            continue

        position_source = section_text if in_section else raw_text
        match = re.search(pattern, position_source, re.IGNORECASE)
        position = match.start() if match else 999_999
        found_skills[skill] = (0 if in_section else 1, position)

    ranked_skills = sorted(found_skills.items(), key=lambda item: (item[1][0], item[1][1], item[0]))
    return [_normalize_skill_display(skill, raw_text) for skill, _ in ranked_skills[:20]]


def _normalize_skill_display(skill: str, raw_text: str) -> str:
    pattern = re.compile(r"\b" + re.escape(skill) + r"\b", re.IGNORECASE)
    match = pattern.search(raw_text)
    if match:
        return match.group(0)
    return skill.title() if len(skill) > 3 else skill.upper()


def _extract_work_history(section_lines: list[str]):
    """Extract work history entries from the experience section."""
    if not section_lines:
        return []

    entries: list[WorkEntry] = []
    current_entry: dict = {}
    description_lines: list[str] = []
    recent_context: list[str] = []

    for line in section_lines:
        stripped_line = line.strip()
        if not stripped_line:
            continue

        # Check if this line contains a date range (likely a new entry)
        date_match = DATE_RANGE_PATTERN.search(stripped_line)
        if date_match:
            # Save previous entry
            if current_entry:
                current_entry["description"] = "\n".join(description_lines).strip() or None
                entries.append(WorkEntry(**current_entry))
                description_lines = []

            title, company = _extract_role_and_company_from_context(
                line=stripped_line,
                date_match=date_match,
                recent_context=recent_context,
            )

            # Start a new entry
            current_entry = {
                "title": title,
                "company": company,
                "start_date": None,
                "end_date": None,
            }

            # Parse dates from the match
            dates = _parse_date_range(date_match.group(0))
            if dates:
                current_entry["start_date"] = dates[0]
                current_entry["end_date"] = dates[1]

            # Try to find company name in the remaining part of the line
        elif current_entry:
            # Check if this line might be a company name (short, title-case, near the top)
            if not current_entry.get("company") and _looks_like_company_hint(stripped_line):
                current_entry["company"] = stripped_line
            else:
                description_lines.append(stripped_line)
        if _looks_like_context_line(stripped_line) and not date_match:
            recent_context.append(stripped_line)
            recent_context = recent_context[-3:]

    # Save the last entry
    if current_entry:
        current_entry["description"] = "\n".join(description_lines).strip() or None
        entries.append(WorkEntry(**current_entry))

    return entries


def _extract_role_and_company_from_context(line: str, date_match: re.Match[str], recent_context: list[str]) -> tuple[str | None, str | None]:
    prefix = line[:date_match.start()].strip(" -–—|,") or None
    suffix = line[date_match.end():].strip(" -–—|,") or None

    if prefix and suffix:
        return prefix, suffix
    if prefix:
        company = recent_context[-1] if recent_context and recent_context[-1] != prefix else None
        return prefix, company
    if suffix and recent_context:
        return recent_context[-1], suffix
    if len(recent_context) >= 2:
        return recent_context[-1], recent_context[-2]
    if len(recent_context) == 1:
        return recent_context[-1], suffix
    return None, suffix


def _looks_like_context_line(value: str) -> bool:
    if not value or value.startswith(("•", "-", "*", "·")):
        return False
    if len(value) > 100:
        return False
    if "@" in value:
        return False
    return True


def _looks_like_company_hint(value: str) -> bool:
    if not _looks_like_context_line(value):
        return False
    if ROLE_HEADER_PATTERN.search(value):
        return False
    return len(value.split()) <= 8


def _sanitize_work_history(work_history: list[WorkEntry]) -> tuple[list[WorkEntry], list[str]]:
    warnings: list[str] = []
    sanitized: list[WorkEntry] = []

    for entry in work_history:
        title = entry.title.strip() if entry.title else None
        company = entry.company.strip() if entry.company else None

        if title and _looks_like_invalid_role_text(title):
            title = None
            warnings.append("invalid_work_title_removed")

        if company and _looks_like_invalid_company_text(company):
            company = None
            warnings.append("invalid_company_removed")

        sanitized.append(
            WorkEntry(
                title=title,
                company=company,
                start_date=entry.start_date,
                end_date=entry.end_date,
                description=entry.description,
            )
        )

    return sanitized, warnings


def _looks_like_invalid_role_text(value: str) -> bool:
    if len(value) > 80:
        return True
    if "@" in value or any(char.isdigit() for char in value):
        return True
    if ROLE_HEADER_PATTERN.search(value):
        return True
    if value.count(",") >= 2 or value.count(":") >= 1:
        return True
    return False


def _looks_like_invalid_company_text(value: str) -> bool:
    if len(value) > 120:
        return True
    if "@" in value:
        return True
    if ROLE_HEADER_PATTERN.search(value):
        return True
    return False


def _parse_date_range(date_str: str):
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


def _normalize_date(date_str: str):
    """Normalize a date string to YYYY or YYYY-MM format."""
    year_match = YEAR_PATTERN.search(date_str)
    if not year_match:
        return None
    return year_match.group(0)


def _extract_education(section_lines: list[str], doc):
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


def _extract_certifications(section_lines: list[str]):
    """Extract certifications from the certifications section."""
    certs = []
    for line in section_lines:
        stripped = line.strip("•-*·– ")
        if stripped and len(stripped) > 2:
            certs.append(stripped)
    return certs


def _extract_projects(section_lines: list[str]):
    """Extract project names/descriptions from the projects section."""
    projects = []
    for line in section_lines:
        stripped = line.strip("•-*·– ")
        if stripped and len(stripped) > 2:
            projects.append(stripped)
    return projects


def _compute_experience_years(work_history: list[WorkEntry]):
    """Compute total years of experience from work history date ranges."""
    if not work_history:
        return None

    ranges: list[tuple[int, int]] = []

    for entry in work_history:
        start_month = _month_index_from_date(entry.start_date)
        if start_month is None:
            continue

        if entry.end_date is None:
            current = datetime.utcnow()
            end_month = current.year * 12 + current.month
        else:
            end_month = _month_index_from_date(entry.end_date)
            if end_month is None:
                continue

        if end_month > start_month:
            ranges.append((start_month, end_month))

    if not ranges:
        return None

    ranges.sort(key=lambda item: item[0])
    merged: list[list[int]] = []
    for start, end in ranges:
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)

    total_months = sum(end - start for start, end in merged)
    return round(total_months / 12, 1)


def _year_from_date(date_str: str | None):
    """Extract a year integer from a date string."""
    if not date_str:
        return None
    match = YEAR_PATTERN.search(date_str)
    return int(match.group(0)) if match else None


def _month_index_from_date(date_str: str | None):
    if not date_str:
        return None

    year_match = YEAR_PATTERN.search(date_str)
    if not year_match:
        return None

    year = int(year_match.group(0))
    month = 1
    lowered = date_str.lower()
    for key, value in MONTH_MAP.items():
        if key in lowered:
            month = value
            break

    return year * 12 + month
