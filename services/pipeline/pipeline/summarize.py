"""Stage 4: Template-based candidate summary generation."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pipeline.models import CandidateProfile, ScoringResult

MAX_SUMMARY_LENGTH = 500


def summarize_candidate(profile: "CandidateProfile", scoring: "ScoringResult") -> str:
    """Generate a concise 2-3 sentence candidate summary from parsed profile data.

    Uses template-based generation (no LLM). Constructs sentences from
    structured fields and scoring highlights.
    """
    sentences: list[str] = []

    # Sentence 1: Opening — name, title, experience, top skills
    sentences.append(_build_opening(profile))

    # Sentence 2: Education (if available)
    edu_sentence = _build_education(profile)
    if edu_sentence:
        sentences.append(edu_sentence)

    # Sentence 3: Highlight (certifications, strong match, etc.)
    highlight = _build_highlight(profile, scoring)
    if highlight:
        sentences.append(highlight)

    summary = " ".join(sentences)

    # Enforce max length
    if len(summary) > MAX_SUMMARY_LENGTH:
        summary = summary[: MAX_SUMMARY_LENGTH - 3].rsplit(" ", 1)[0] + "..."

    return summary


def _build_opening(profile: "CandidateProfile") -> str:
    """Build the opening sentence: name, title, experience, skills."""
    name = profile.name or "This candidate"

    # Most recent title
    title = None
    if profile.work_history:
        title = profile.work_history[0].title
    title = title or "professional"

    # Experience years
    exp_part = ""
    if profile.total_experience_years is not None:
        years = profile.total_experience_years
        if years == int(years):
            exp_part = f" with {int(years)} years of experience"
        else:
            exp_part = f" with {years} years of experience"

    # Top skills
    skills_part = ""
    if profile.skills:
        top_skills = profile.skills[:3]
        if len(top_skills) == 1:
            skills_part = f" specializing in {top_skills[0]}"
        elif len(top_skills) == 2:
            skills_part = f" specializing in {top_skills[0]} and {top_skills[1]}"
        else:
            skills_part = f" specializing in {', '.join(top_skills[:-1])}, and {top_skills[-1]}"

    return f"{name} is a {title}{exp_part}{skills_part}."


def _build_education(profile: "CandidateProfile") -> str | None:
    """Build the education sentence from the highest-level degree."""
    if not profile.education:
        return None

    # Use the first (assumed highest-level) education entry
    edu = profile.education[0]

    parts = []
    if edu.degree:
        parts.append(edu.degree)
    if edu.institution:
        parts.append(f"from {edu.institution}")

    if not parts:
        return None

    return f"Holds a {' '.join(parts)}."


def _build_highlight(profile: "CandidateProfile", scoring: "ScoringResult") -> str | None:
    """Build a highlight sentence based on certifications or scoring."""
    # Certifications
    if profile.certifications:
        if len(profile.certifications) == 1:
            return f"Certified in {profile.certifications[0]}."
        certs = profile.certifications[:3]
        return f"Holds certifications in {', '.join(certs[:-1])}, and {certs[-1]}."

    # Strong skill match
    skill_sub = scoring.breakdown.get("skill_match")
    if skill_sub and skill_sub.score >= 90:
        return "Strong alignment with the required skill set."

    # Experience exceeds requirement
    exp_sub = scoring.breakdown.get("experience_fit")
    if exp_sub and exp_sub.details:
        required = exp_sub.details.get("required_years")
        candidate = exp_sub.details.get("candidate_years")
        if required and candidate and candidate - required >= 2:
            return "Brings significantly more experience than required."

    return None
