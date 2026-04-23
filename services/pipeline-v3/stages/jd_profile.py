"""Stage 0: enrich a job description into a structured hiring target."""

from __future__ import annotations

from datetime import UTC, datetime
import re

from stages.taxonomy import (
	dedupe_refs,
	expand_related_skills,
	find_certification_references,
	find_soft_skill_references,
	find_tech_references,
)


MIN_YEARS_PATTERN = re.compile(r"(\d+)\+?\s*(?:years?|yrs?)(?:\s+of\s+experience)?", re.IGNORECASE)
DEGREE_PATTERN = re.compile(r"\b(bachelor(?:'s)?|master(?:'s)?|ph\.?d\.?|doctorate|associate(?:'s)?)\b", re.IGNORECASE)
MUST_HEADERS = re.compile(r"(essential|requirements|required|must have|must-have|qualifications|technical expertise)", re.IGNORECASE)
WISH_HEADERS = re.compile(r"(desirable|nice to have|nice-to-have|preferred|advantage|plus|good to have)", re.IGNORECASE)
STOP_HEADERS = re.compile(r"(benefits|what we offer|about company|equal opportunity)", re.IGNORECASE)


def _priority_zone(text: str, header_pattern: re.Pattern[str]) -> str:
	lines = [line.strip() for line in text.splitlines()]
	capturing = False
	buffer: list[str] = []

	for line in lines:
		if not line:
			continue
		if STOP_HEADERS.search(line):
			if capturing:
				break
			continue
		if header_pattern.search(line):
			capturing = True
			continue
		if capturing and re.match(r"^[A-Z][A-Za-z /&-]{2,}$", line):
			break
		if capturing:
			buffer.append(line)

	return "\n".join(buffer).strip()


def _to_dicts(refs):
	return [ref.as_dict() for ref in refs]


def build_job_description_artifact(job_description):
	text = job_description.raw_text
	must_zone = _priority_zone(text, MUST_HEADERS)
	wish_zone = _priority_zone(text, WISH_HEADERS)

	must_have = dedupe_refs(find_tech_references(must_zone or text))[:10]
	required_certs = dedupe_refs(find_certification_references(must_zone or text))[:5]
	nice_from_jd = [
		ref
		for ref in dedupe_refs(find_tech_references(wish_zone))
		if ref.taxonomy_id not in {item.taxonomy_id for item in must_have}
	][:10]
	expansion = expand_related_skills(
		must_have,
		exclude=[*must_have, *nice_from_jd],
		limit=10,
	)
	soft_skills = dedupe_refs(find_soft_skill_references(" ".join(filter(None, [must_zone, wish_zone, text]))))

	years_match = MIN_YEARS_PATTERN.search(text)
	degree_match = DEGREE_PATTERN.search(text)

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
				"techSkills": _to_dicts(must_have),
				"certifications": _to_dicts(required_certs),
			},
			"niceToHave": {
				"fromJobDescription": _to_dicts(nice_from_jd),
				"fromTaxonomyExpansion": _to_dicts(expansion),
			},
		},
		"softSkills": [
			{
				"skill": ref.skill,
				"canonicalName": ref.canonical_name,
				"taxonomyId": ref.taxonomy_id,
			}
			for ref in soft_skills
		],
	}
