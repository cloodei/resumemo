"""Artifact builders for resume normalization and candidate DNA."""

from __future__ import annotations

from collections import Counter
import re

from stages.taxonomy import (
	dedupe_refs,
	find_certification_references,
	find_soft_skill_references,
	find_tech_references,
	make_unmapped_skill,
	normalize_key,
)


SECTION_PATTERNS = {
	"information": re.compile(r"^(?:contact|information|profile)$", re.IGNORECASE),
	"summary": re.compile(r"^(?:summary|objective|profile summary)$", re.IGNORECASE),
	"skills": re.compile(r"^(?:skills|technical skills|technologies)$", re.IGNORECASE),
	"experience": re.compile(r"^(?:experience|work experience|employment|work history)$", re.IGNORECASE),
	"education": re.compile(r"^(?:education|academic background|qualifications)$", re.IGNORECASE),
}
LINKEDIN_PATTERN = re.compile(r"https?://(?:www\.)?linkedin\.com/[^\s]+", re.IGNORECASE)
TITLE_PATTERNS = [
	(r"\bfront\s*end\b", "Frontend Engineering"),
	(r"\bback\s*end\b", "Backend Engineering"),
	(r"\bfull\s*stack\b", "Full Stack Engineering"),
	(r"\bdata engineer\b", "Data Engineering"),
	(r"\bdata scientist\b", "Data Science"),
	(r"\bproject manager\b", "Project Management"),
	(r"\bbusiness analyst\b", "Business Analysis"),
	(r"\bqa\b|\btest automation\b", "Quality Assurance"),
]
DEGREE_RANK = {
	"phd": 4,
	"doctorate": 4,
	"master": 3,
	"mba": 3,
	"bachelor": 2,
	"associate": 1,
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
			(name for name, pattern in SECTION_PATTERNS.items() if pattern.match(stripped)),
			None,
		)
		if matched_section:
			current_section = matched_section
			continue

		sections[current_section] = f"{sections[current_section]}\n{stripped}".strip()

	return {
		"originalText": raw_text,
		"normalizedText": "\n".join(line.strip() for line in raw_text.splitlines() if line.strip()),
		"sections": sections,
	}


def _zones_for_text(section_texts: dict[str, str], skill_name: str) -> list[str]:
	zones = [
		zone
		for zone, text in section_texts.items()
		if text and normalize_key(skill_name) in normalize_key(text)
	]
	return zones or ["summary"]


def _month_index(date_value: str | None) -> int | None:
	if not date_value:
		return None
	match = re.search(r"(19|20)\d{2}", date_value)
	if not match:
		return None
	return int(match.group(0)) * 12 + 1


def _merge_skill_years(profile, skill_name: str) -> float:
	intervals: list[tuple[int, int]] = []
	needle = normalize_key(skill_name)
	for entry in profile.work_history:
		text = " ".join(filter(None, [entry.title, entry.description])).lower()
		if needle and needle not in normalize_key(text):
			continue
		start = _month_index(entry.start_date)
		end = _month_index(entry.end_date) if entry.end_date else None
		if start is None:
			continue
		intervals.append((start, end or start + 12))

	if not intervals:
		return 0.0

	intervals.sort(key=lambda item: item[0])
	merged: list[list[int]] = []
	for start, end in intervals:
		if not merged or start > merged[-1][1]:
			merged.append([start, end])
		else:
			merged[-1][1] = max(merged[-1][1], end)

	years = round(sum(end - start for start, end in merged) / 12, 1)
	if profile.total_experience_years is not None:
		return min(years, profile.total_experience_years)
	return years


def _standardize_title(profile) -> str | None:
	candidates = [profile.work_history[0].title] if profile.work_history and profile.work_history[0].title else []
	for candidate in candidates:
		lowered = candidate.lower()
		for pattern, label in TITLE_PATTERNS:
			if re.search(pattern, lowered):
				return label
	return None


def _best_degree(profile) -> str | None:
	if not profile.education:
		return None
	best = None
	best_rank = -1
	for entry in profile.education:
		degree = entry.degree or ""
		lowered = degree.lower()
		rank = next((value for key, value in DEGREE_RANK.items() if key in lowered), 0)
		if rank > best_rank:
			best = entry.degree
			best_rank = rank
	return best


def build_empty_candidate_profile() -> dict:
	return {
		"information": {
			"name": None,
			"phone": None,
			"email": None,
			"location": None,
			"linkedIn": None,
			"jobTitleOriginal": None,
			"jobTitleStandardized": None,
			"yearsOfExperience": None,
		},
		"hardSkills": {
			"directMention": [],
			"certifications": [],
		},
		"softSkills": [],
		"education": {
			"major": None,
			"degree": None,
		},
		"parseWarnings": ["text_extraction_failed"],
	}


def build_candidate_profile(profile, resume_artifact: dict, raw_text: str) -> dict:
	sections = resume_artifact["sections"]
	section_texts = {
		"summary": sections.get("summary", ""),
		"skills": sections.get("skills", ""),
		"experience": sections.get("experience", ""),
		"education": sections.get("education", ""),
	}
	full_text = " ".join(section_texts.values()) or raw_text
	mapped_skills = dedupe_refs(find_tech_references(full_text))
	mapped_certs = dedupe_refs(find_certification_references(full_text))

	by_key: dict[str, dict] = {}
	for ref in mapped_skills:
		by_key[ref.normalized] = {
			**ref.as_dict(),
			"years": _merge_skill_years(profile, ref.skill),
			"zones": _zones_for_text(section_texts, ref.skill),
		}

	for skill in profile.skills:
		key = normalize_key(skill)
		if key in by_key:
			continue
		by_key[key] = {
			**make_unmapped_skill(skill),
			"years": _merge_skill_years(profile, skill),
			"zones": _zones_for_text(section_texts, skill),
		}

	soft_skills = [
		{
			"skill": ref.skill,
			"canonicalName": ref.canonical_name,
			"taxonomyId": ref.taxonomy_id,
		}
		for ref in dedupe_refs(find_soft_skill_references(full_text))
	]

	certifications = []
	seen_cert_keys: set[str] = set()
	for ref in [*mapped_certs, *dedupe_refs(find_certification_references(" ".join(profile.certifications)))]:
		if ref.normalized in seen_cert_keys:
			continue
		seen_cert_keys.add(ref.normalized)
		certifications.append(ref.as_dict())
	for cert in profile.certifications:
		key = normalize_key(cert)
		if key in seen_cert_keys:
			continue
		seen_cert_keys.add(key)
		certifications.append(make_unmapped_skill(cert))

	return {
		"information": {
			"name": profile.name,
			"phone": profile.phone,
			"email": profile.email,
			"location": None,
			"linkedIn": LINKEDIN_PATTERN.search(raw_text).group(0) if LINKEDIN_PATTERN.search(raw_text) else None,
			"jobTitleOriginal": profile.work_history[0].title if profile.work_history else None,
			"jobTitleStandardized": _standardize_title(profile),
			"yearsOfExperience": profile.total_experience_years,
		},
		"hardSkills": {
			"directMention": sorted(
				by_key.values(),
				key=lambda item: (-item["years"], item["canonicalName"].lower()),
			)[:40],
			"certifications": certifications,
		},
		"softSkills": soft_skills,
		"education": {
			"major": None,
			"degree": _best_degree(profile),
		},
		"parseWarnings": list(dict.fromkeys(profile.parse_warnings)),
	}
