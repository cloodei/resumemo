"""Stage 3: layered composite scoring based on JD and candidate artifacts."""

from __future__ import annotations

import math


BUCKET_WEIGHTS = {
	"mustHave": 1.0,
	"niceToHave": 0.7,
	"expansion": 0.3,
}

DEGREE_RANK = {
	"associate": 1,
	"bachelor": 2,
	"master": 3,
	"phd": 4,
	"doctorate": 4,
}


def _degree_rank(value: str | None) -> int:
	if not value:
		return 0
	lowered = value.lower()
	for key, rank in DEGREE_RANK.items():
		if key in lowered:
			return rank
	return 0


def _lookup_candidate_skills(candidate_profile: dict) -> dict[str, dict]:
	items: dict[str, dict] = {}
	for skill in candidate_profile["hardSkills"]["directMention"]:
		key = skill.get("taxonomyId") or skill.get("canonicalName", "").lower()
		if key:
			items[key] = skill
	return items


def _score_skill_bucket(required_skills: list[dict], candidate_lookup: dict[str, dict], bucket_weight: float, ideal_years: float) -> tuple[float, float, list[str], list[str]]:
	achieved = 0.0
	possible = 0.0
	matched: list[str] = []
	missing: list[str] = []

	for required in required_skills:
		key = required.get("taxonomyId") or required.get("canonicalName", "").lower()
		base_point = bucket_weight * (1 + math.log(ideal_years + 1))
		possible += base_point
		candidate_skill = candidate_lookup.get(key)
		if not candidate_skill:
			missing.append(required["skill"])
			continue

		years = float(candidate_skill.get("years") or 0.0)
		achieved += bucket_weight * (1 + math.log(years + 1))
		matched.append(required["skill"])

	return achieved, possible, matched, missing


def score_candidate(candidate_profile: dict, job_description_artifact: dict) -> dict:
	candidate_lookup = _lookup_candidate_skills(candidate_profile)
	ideal_years = float(job_description_artifact["hardConstraints"]["minExperienceYears"] or 0.0)

	must_achieved, must_possible, matched_must, missing_must = _score_skill_bucket(
		job_description_artifact["hardSkills"]["mustHave"]["techSkills"],
		candidate_lookup,
		BUCKET_WEIGHTS["mustHave"],
		ideal_years,
	)
	nice_achieved, nice_possible, matched_nice, missing_nice = _score_skill_bucket(
		job_description_artifact["hardSkills"]["niceToHave"]["fromJobDescription"],
		candidate_lookup,
		BUCKET_WEIGHTS["niceToHave"],
		ideal_years,
	)
	exp_achieved, exp_possible, matched_expansion, missing_expansion = _score_skill_bucket(
		job_description_artifact["hardSkills"]["niceToHave"]["fromTaxonomyExpansion"],
		candidate_lookup,
		BUCKET_WEIGHTS["expansion"],
		ideal_years,
	)

	hard_skill_achieved = must_achieved + nice_achieved + exp_achieved
	hard_skill_possible = must_possible + nice_possible + exp_possible
	hard_ratio = hard_skill_achieved / hard_skill_possible if hard_skill_possible > 0 else 1.0
	hard_skills_score = min(hard_ratio, 1.0) * 80.0
	spillover_bonus = max(hard_ratio - 1.0, 0.0) * 80.0

	required_years = job_description_artifact["hardConstraints"]["minExperienceYears"]
	candidate_years = candidate_profile["information"]["yearsOfExperience"]
	experience_passed = required_years is None or ((candidate_years or 0.0) >= required_years)

	required_degree = job_description_artifact["hardConstraints"]["requiredDegree"]
	candidate_degree = candidate_profile["education"]["degree"]
	degree_passed = required_degree is None or _degree_rank(candidate_degree) >= _degree_rank(required_degree)

	constraint_checks = [
		("experience", experience_passed),
		("degree", degree_passed),
	]
	active_constraint_count = sum(1 for name, _ in constraint_checks if job_description_artifact["hardConstraints"]["minExperienceYears"] is not None or name != "experience" or required_years is not None)
	hard_constraints_score = (
		(sum(1.0 for _, passed in constraint_checks if passed) / len(constraint_checks)) * 20.0
	)

	required_soft = {item["canonicalName"] for item in job_description_artifact["softSkills"]}
	candidate_soft = {item["canonicalName"] for item in candidate_profile["softSkills"]}
	matched_soft = sorted(required_soft & candidate_soft)
	missing_soft = sorted(required_soft - candidate_soft)
	soft_bonus = float(len(matched_soft))

	required_skill_keys = {
		item.get("taxonomyId") or item.get("canonicalName", "").lower()
		for item in (
			job_description_artifact["hardSkills"]["mustHave"]["techSkills"]
			+ job_description_artifact["hardSkills"]["niceToHave"]["fromJobDescription"]
			+ job_description_artifact["hardSkills"]["niceToHave"]["fromTaxonomyExpansion"]
		)
	}
	surplus_skills = sorted([
		skill["skill"]
		for key, skill in candidate_lookup.items()
		if key not in required_skill_keys
	])
	surplus_bonus = sum(0.05 * (1 + math.log((candidate_lookup[key].get("years") or 0.0) + 1)) for key in candidate_lookup if key not in required_skill_keys)

	required_certifications = {
		item.get("taxonomyId") or item.get("canonicalName", "").lower()
		for item in job_description_artifact["hardSkills"]["mustHave"]["certifications"]
	}
	candidate_certifications = {
		item.get("taxonomyId") or item.get("canonicalName", "").lower(): item["skill"]
		for item in candidate_profile["hardSkills"]["certifications"]
	}
	matched_certs = sorted([
		name
		for key, name in candidate_certifications.items()
		if key in required_certifications
	])
	extra_certs = sorted([
		name
		for key, name in candidate_certifications.items()
		if key not in required_certifications
	])
	cert_bonus = float(len(extra_certs))

	base_score = round(hard_skills_score + hard_constraints_score, 2)
	bonus_score = round(spillover_bonus + surplus_bonus + soft_bonus + cert_bonus, 2)
	total_score = round(base_score + bonus_score, 2)

	score_artifact = {
		"scores": {
			"hardSkillsScore": round(hard_skills_score, 2),
			"hardConstraintsScore": round(hard_constraints_score, 2),
			"baseScore": base_score,
			"bonusScore": bonus_score,
			"totalScore": total_score,
		},
		"breakdown": {
			"hardSkills": {
				"achieved": round(hard_skill_achieved, 4),
				"possible": round(hard_skill_possible, 4),
				"ratio": round(hard_ratio, 4),
				"matchedMustHave": matched_must,
				"matchedNiceToHave": matched_nice,
				"matchedExpansion": matched_expansion,
				"missingMustHave": missing_must,
				"missingNiceToHave": missing_nice,
				"missingExpansion": missing_expansion,
			},
			"hardConstraints": {
				"experience": {
					"required": str(required_years) if required_years is not None else None,
					"candidate": str(candidate_years) if candidate_years is not None else None,
					"passed": experience_passed,
				},
				"degree": {
					"required": required_degree,
					"candidate": candidate_degree,
					"passed": degree_passed,
				},
			},
			"surplusSkills": surplus_skills,
			"softSkills": {
				"matched": matched_soft,
				"missing": missing_soft,
				"score": soft_bonus,
			},
			"certifications": {
				"matched": matched_certs,
				"extra": extra_certs,
				"score": cert_bonus,
			},
			"spillover": {
				"hardSkillRatio": round(hard_ratio, 4),
				"bonusScore": round(spillover_bonus, 2),
			},
		},
		"matchedSkills": matched_must + matched_nice + matched_expansion,
		"missingSkills": missing_must + missing_nice + missing_expansion,
		"extraSkills": surplus_skills,
	}

	return {
		"score_artifact": score_artifact,
		"overall_score": total_score,
		"base_score": base_score,
		"bonus_score": bonus_score,
		"skills_matched": score_artifact["matchedSkills"],
	}
