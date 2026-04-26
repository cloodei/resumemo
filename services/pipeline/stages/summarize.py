"""Deterministic recruiter-facing summaries from pipeline artifacts."""

from __future__ import annotations

from models import CandidateDnaProfile, JobDescriptionArtifact, ScoreArtifact

MAX_SUMMARY_LENGTH = 600


def summarize_candidate(
    profile: CandidateDnaProfile,
    job_artifact: JobDescriptionArtifact,
    score_artifact: ScoreArtifact,
) -> str:
    """Generate a short, explainable summary without using an LLM decision layer."""
    name = profile.candidate_name or "This candidate"
    years = profile.total_experience_years
    role = profile.information.get("job_title_original") or "professional"

    opening = f"{name} is a {role}"
    if years:
        opening += f" with {years:g} years of experience"
    opening += "."

    parts = [opening]
    if score_artifact.matched_skills:
        parts.append(f"Matched skills include {', '.join(score_artifact.matched_skills[:5])}.")
    if score_artifact.missing_skills:
        parts.append(f"Review gaps around {', '.join(score_artifact.missing_skills[:4])}.")
    if score_artifact.bonus_score > 0:
        parts.append(f"Additional profile strength contributes {score_artifact.bonus_score:g} bonus points.")

    summary = " ".join(parts)
    if len(summary) > MAX_SUMMARY_LENGTH:
        return summary[: MAX_SUMMARY_LENGTH - 3].rsplit(" ", 1)[0] + "..."
    return summary
