"""Composite base/bonus scoring for JD artifacts and candidate DNA profiles."""

from __future__ import annotations

import math
from typing import Any

from config import (
    SCORING_BONUS_CERTIFICATION,
    SCORING_BONUS_SOFT_SKILL,
    SCORING_WEIGHT_CONSTRAINTS,
    SCORING_WEIGHT_HARD_SKILLS,
    SCORING_WEIGHT_MUST_HAVE,
    SCORING_WEIGHT_NICE_TO_HAVE_JD,
    SCORING_WEIGHT_SURPLUS,
    SCORING_WEIGHT_TAXONOMY_EXPANSION,
)
from models import CandidateDnaProfile, JobDescriptionArtifact, ScoreArtifact

DEGREE_RANK = {
    "diploma": 1,
    "associate": 2,
    "bachelor": 3,
    "master": 4,
    "phd": 5,
}


def score_candidate(
    job_artifact: JobDescriptionArtifact,
    candidate_profile: CandidateDnaProfile,
) -> ScoreArtifact:
    """Score one candidate with the research composite scoring formula."""
    required_years = _number_or_zero(job_artifact.hard_constraints.get("min_experience_years"))
    required_skills = _required_skill_buckets(job_artifact)
    candidate_skills = _candidate_skill_map(candidate_profile)

    max_hard_score = _max_hard_score(required_skills, required_years)
    candidate_hard_score, matched, missing = _candidate_hard_score(required_skills, candidate_skills)
    hard_ratio = candidate_hard_score / max_hard_score if max_hard_score else 0.0

    constraints = _constraint_score(job_artifact, candidate_profile)
    capped_hard = min(hard_ratio, 1.0) * (SCORING_WEIGHT_HARD_SKILLS * 100)
    constraint_points = constraints["ratio"] * (SCORING_WEIGHT_CONSTRAINTS * 100)
    base_score = min(100.0, capped_hard + constraint_points)

    spillover_bonus = max(0.0, hard_ratio - 1.0) * (SCORING_WEIGHT_HARD_SKILLS * 100)
    surplus_bonus, surplus = _surplus_bonus(required_skills, candidate_skills)
    soft_bonus, soft_matches = _soft_skill_bonus(job_artifact, candidate_profile)
    cert_bonus, cert_matches = _certification_bonus(job_artifact, candidate_profile)
    bonus_score = spillover_bonus + surplus_bonus + soft_bonus + cert_bonus
    total_score = base_score + bonus_score

    components: dict[str, Any] = {
        "hard_skills": {
            "candidate_hard_score": round(candidate_hard_score, 4),
            "max_hard_score": round(max_hard_score, 4),
            "hard_ratio": round(hard_ratio, 4),
            "base_points": round(capped_hard, 2),
            "matched": matched,
            "missing": missing,
            "bucket_weights": {
                "must_have": SCORING_WEIGHT_MUST_HAVE,
                "nice_to_have_jd": SCORING_WEIGHT_NICE_TO_HAVE_JD,
                "taxonomy_expansion": SCORING_WEIGHT_TAXONOMY_EXPANSION,
            },
        },
        "constraints": constraints,
        "bonus": {
            "spillover": round(spillover_bonus, 2),
            "surplus": round(surplus_bonus, 2),
            "soft_skills": round(soft_bonus, 2),
            "certifications": round(cert_bonus, 2),
            "soft_skill_matches": soft_matches,
            "certification_matches": cert_matches,
        },
    }

    return ScoreArtifact(
        base_score=round(base_score, 2),
        bonus_score=round(bonus_score, 2),
        total_score=round(total_score, 2),
        components=components,
        matched_skills=matched,
        missing_skills=missing,
        surplus_skills=surplus,
        explanation=_explanation(base_score, bonus_score, matched, missing, constraints),
    )


def _required_skill_buckets(job_artifact: JobDescriptionArtifact) -> list[dict[str, Any]]:
    hard_skills = job_artifact.hard_skills
    must = hard_skills.get("must_have", {}).get("tech_skills", [])
    nice = hard_skills.get("nice_to_have", {}).get("from_jd_desirable", [])
    expansion = hard_skills.get("nice_to_have", {}).get("from_taxonomy_expansion", [])
    return [
        *[_skill_requirement(item, "must_have", SCORING_WEIGHT_MUST_HAVE) for item in must],
        *[_skill_requirement(item, "nice_to_have_jd", SCORING_WEIGHT_NICE_TO_HAVE_JD) for item in nice],
        *[_skill_requirement(item, "taxonomy_expansion", SCORING_WEIGHT_TAXONOMY_EXPANSION) for item in expansion],
    ]


def _skill_requirement(item: dict[str, Any], bucket: str, weight: float) -> dict[str, Any]:
    return {
        "skill": item.get("skill") or item.get("source_text"),
        "taxonomy_id": item.get("taxonomy_id"),
        "bucket": bucket,
        "weight": weight,
    }


def _candidate_skill_map(candidate_profile: CandidateDnaProfile) -> dict[str, dict[str, Any]]:
    mapped = {}
    for item in candidate_profile.hard_skill_items():
        keys = {
            _skill_key(item.get("taxonomy_id")),
            _skill_key(item.get("canonical_name")),
            _skill_key(item.get("skill")),
        }
        for key in keys:
            if key:
                mapped[key] = item
    return mapped


def _max_hard_score(required_skills: list[dict[str, Any]], required_years: float) -> float:
    years = max(0.0, required_years)
    multiplier = _experience_multiplier(years)
    return sum(float(item["weight"]) * multiplier for item in required_skills)


def _candidate_hard_score(
    required_skills: list[dict[str, Any]],
    candidate_skills: dict[str, dict[str, Any]],
) -> tuple[float, list[str], list[str]]:
    score = 0.0
    matched: list[str] = []
    missing: list[str] = []

    for requirement in required_skills:
        candidate = _find_candidate_skill(requirement, candidate_skills)
        label = str(requirement.get("skill") or requirement.get("taxonomy_id") or "Unknown skill")
        if not candidate:
            missing.append(label)
            continue

        years = _number_or_zero(candidate.get("years"))
        score += float(requirement["weight"]) * _experience_multiplier(years)
        matched.append(str(candidate.get("canonical_name") or candidate.get("skill") or label))

    return score, sorted(set(matched), key=str.lower), sorted(set(missing), key=str.lower)


def _find_candidate_skill(
    requirement: dict[str, Any],
    candidate_skills: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    for key in (_skill_key(requirement.get("taxonomy_id")), _skill_key(requirement.get("skill"))):
        if key and key in candidate_skills:
            return candidate_skills[key]
    return None


def _constraint_score(job_artifact: JobDescriptionArtifact, candidate_profile: CandidateDnaProfile) -> dict[str, Any]:
    required_years = _number_or_zero(job_artifact.hard_constraints.get("min_experience_years"))
    candidate_years = _number_or_zero(candidate_profile.total_experience_years)
    required_degree = job_artifact.hard_constraints.get("required_degree")
    candidate_degree = candidate_profile.education.get("degree")

    experience_pass = required_years <= 0 or candidate_years >= required_years
    degree_pass = not required_degree or _degree_rank(candidate_degree) >= _degree_rank(required_degree)
    ratio = (float(experience_pass) + float(degree_pass)) / 2

    return {
        "ratio": ratio,
        "required_years": required_years if required_years else None,
        "candidate_years": candidate_years if candidate_years else None,
        "experience_pass": experience_pass,
        "required_degree": required_degree,
        "candidate_degree": candidate_degree,
        "degree_pass": degree_pass,
    }


def _surplus_bonus(
    required_skills: list[dict[str, Any]],
    candidate_skills: dict[str, dict[str, Any]],
) -> tuple[float, list[str]]:
    required_keys = {
        key for item in required_skills
        for key in (_skill_key(item.get("taxonomy_id")), _skill_key(item.get("skill")))
        if key
    }
    surplus: list[str] = []
    bonus = 0.0
    seen: set[str] = set()

    for key, item in candidate_skills.items():
        if key in required_keys:
            continue
        label = str(item.get("canonical_name") or item.get("skill") or key)
        if label.lower() in seen:
            continue
        seen.add(label.lower())
        surplus.append(label)
        bonus += SCORING_WEIGHT_SURPLUS * _experience_multiplier(_number_or_zero(item.get("years")))

    return bonus, sorted(surplus, key=str.lower)


def _soft_skill_bonus(
    job_artifact: JobDescriptionArtifact,
    candidate_profile: CandidateDnaProfile,
) -> tuple[float, list[str]]:
    required = {_skill_key(item.get("taxonomy_id") or item.get("skill")) for item in job_artifact.soft_skills}
    candidate = {
        _skill_key(item.get("taxonomy_id") or item.get("skill")): item
        for item in candidate_profile.soft_skills
    }
    matches = [
        str(candidate[key].get("skill") or candidate[key].get("taxonomy_id"))
        for key in required
        if key and key in candidate
    ]
    return len(matches) * SCORING_BONUS_SOFT_SKILL, sorted(matches, key=str.lower)


def _certification_bonus(
    job_artifact: JobDescriptionArtifact,
    candidate_profile: CandidateDnaProfile,
) -> tuple[float, list[str]]:
    required = {
        str(item).lower()
        for item in job_artifact.hard_skills.get("must_have", {}).get("certifications", [])
    }
    candidate = {item.lower(): item for item in candidate_profile.certification_items()}
    matches = [candidate[key] for key in required if key in candidate]
    if not required:
        matches = candidate_profile.certification_items()
    return len(matches) * SCORING_BONUS_CERTIFICATION, sorted(matches, key=str.lower)


def _experience_multiplier(years: float) -> float:
    return 1 + math.log(max(0.0, years) + 1)


def _number_or_zero(value: Any) -> float:
    return float(value) if isinstance(value, int | float) else 0.0


def _degree_rank(value: Any) -> int:
    return DEGREE_RANK.get(str(value).lower(), 0)


def _skill_key(value: Any) -> str:
    return str(value).strip().lower() if value else ""


def _explanation(
    base_score: float,
    bonus_score: float,
    matched: list[str],
    missing: list[str],
    constraints: dict[str, Any],
) -> list[str]:
    lines = [f"Base score is {base_score:.1f}/100 with {bonus_score:.1f} bonus points."]
    if matched:
        lines.append(f"Matched core skills: {', '.join(matched[:6])}.")
    if missing:
        lines.append(f"Missing required skills: {', '.join(missing[:6])}.")
    if constraints.get("experience_pass") is False:
        lines.append("Candidate experience is below the JD minimum.")
    return lines
