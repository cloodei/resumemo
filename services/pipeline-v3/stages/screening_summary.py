"""Deterministic summary generation for screening results."""

from __future__ import annotations


def summarize_candidate(candidate_profile: dict, score_artifact: dict) -> str:
	info = candidate_profile["information"]
	name = info["name"] or "This candidate"
	title = info["jobTitleOriginal"] or info["jobTitleStandardized"] or "professional"
	years = info["yearsOfExperience"]
	matched = score_artifact["matchedSkills"][:3]
	missing = score_artifact["missingSkills"][:2]

	opening = f"{name} is a {title}"
	if years is not None:
		opening += f" with {years} years of experience"
	opening += "."

	parts = [opening]
	if matched:
		parts.append(f"Strongest aligned skills include {', '.join(matched)}.")
	if missing:
		parts.append(f"Primary gaps against the brief are {', '.join(missing)}.")
	elif score_artifact["scores"]["bonusScore"] > 0:
		parts.append("Profile shows additional strengths beyond the core brief.")

	return " ".join(parts)
