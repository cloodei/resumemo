"""Stage 3: Scoring resumes against job descriptions using TF-IDF cosine similarity."""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from pipeline.config import (
    SCORING_WEIGHT_EXPERIENCE_FIT,
    SCORING_WEIGHT_SKILL_MATCH,
    SCORING_WEIGHT_TEXT_SIMILARITY,
    TFIDF_MAX_FEATURES,
    TFIDF_NGRAM_RANGE,
)
from pipeline.models import ScoringResult, SubScore

if TYPE_CHECKING:
    from pipeline.models import CandidateProfile

logger = logging.getLogger(__name__)

EXPERIENCE_YEARS_PATTERN = re.compile(
    r"(\d+)\+?\s*(?:years?|yrs?)(?:\s+of\s+experience)?",
    re.IGNORECASE,
)


def score_resume(
    raw_text: str,
    profile: "CandidateProfile",
    job_description: str,
    job_title: str | None = None,
) -> ScoringResult:
    """Score a resume against a job description.

    Produces a weighted overall score from three sub-scores:
    text similarity, skill match, and experience fit.
    """
    # Sub-score 1: Text similarity
    text_sim = _score_text_similarity(raw_text, job_description)

    # Sub-score 2: Skill match
    skill_match, matched, missing, extra = _score_skill_match(profile.skills, job_description)

    # Sub-score 3: Experience fit
    exp_fit, required_years = _score_experience_fit(profile.total_experience_years, job_description)

    # Handle weight redistribution when sub-scores are neutral
    w_text = SCORING_WEIGHT_TEXT_SIMILARITY
    w_skill = SCORING_WEIGHT_SKILL_MATCH
    w_exp = SCORING_WEIGHT_EXPERIENCE_FIT

    # If skill match couldn't be computed, redistribute to text similarity
    if skill_match == 50.0 and not matched and not missing:
        w_text += w_skill / 2
        w_exp += w_skill / 2
        w_skill = 0

    # If experience fit couldn't be computed, redistribute
    if exp_fit == 50.0 and required_years is None:
        w_text += w_exp / 2
        if w_skill > 0:
            w_skill += w_exp / 2
        else:
            w_text += w_exp / 2
        w_exp = 0

    # Normalize weights
    total_weight = w_text + w_skill + w_exp
    if total_weight > 0:
        w_text /= total_weight
        w_skill /= total_weight
        w_exp /= total_weight

    overall = (text_sim * w_text) + (skill_match * w_skill) + (exp_fit * w_exp)
    overall = round(min(100.0, max(0.0, overall)), 1)

    breakdown = {
        "text_similarity": SubScore(
            score=round(text_sim, 1),
            weight=round(w_text, 2),
            description="TF-IDF cosine similarity between resume and job description",
        ),
        "skill_match": SubScore(
            score=round(skill_match, 1),
            weight=round(w_skill, 2),
            description="Ratio of required skills found in resume",
            details={
                "matched": matched,
                "missing": missing,
                "extra": extra,
            },
        ),
        "experience_fit": SubScore(
            score=round(exp_fit, 1),
            weight=round(w_exp, 2),
            description="Experience duration relative to requirement",
            details={
                "required_years": required_years,
                "candidate_years": profile.total_experience_years,
            },
        ),
    }

    return ScoringResult(overall_score=overall, breakdown=breakdown)


def _score_text_similarity(resume_text: str, job_description: str) -> float:
    """Compute TF-IDF cosine similarity between resume and JD."""
    if not resume_text.strip() or not job_description.strip():
        return 0.0

    try:
        vectorizer = TfidfVectorizer(
            max_features=TFIDF_MAX_FEATURES,
            stop_words="english",
            ngram_range=TFIDF_NGRAM_RANGE,
        )
        tfidf_matrix = vectorizer.fit_transform([job_description, resume_text])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return float(similarity * 100)
    except Exception as e:
        logger.warning("TF-IDF scoring failed", extra={"error": str(e)})
        return 0.0


def _score_skill_match(
    candidate_skills: list[str],
    job_description: str,
) -> tuple[float, list[str], list[str], list[str]]:
    """Score skill overlap between candidate and job description.

    Returns: (score, matched_skills, missing_skills, extra_skills)
    """
    from pipeline.parse import _get_skills_taxonomy

    taxonomy = _get_skills_taxonomy()
    jd_lower = job_description.lower()

    # Extract required skills from JD using taxonomy
    required_skills: set[str] = set()
    for skill in taxonomy:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, jd_lower):
            required_skills.add(skill)

    if not required_skills:
        return 50.0, [], [], list(candidate_skills)

    candidate_lower = {s.lower() for s in candidate_skills}

    matched = sorted(required_skills & candidate_lower, key=str.lower)
    missing = sorted(required_skills - candidate_lower, key=str.lower)
    extra = sorted(candidate_lower - required_skills, key=str.lower)

    score = (len(matched) / len(required_skills)) * 100 if required_skills else 50.0
    return min(100.0, score), matched, missing, extra


def _score_experience_fit(
    candidate_years: float | None,
    job_description: str,
) -> tuple[float, int | None]:
    """Score experience alignment with JD requirements.

    Returns: (score, required_years_or_none)
    """
    # Extract required years from JD
    match = EXPERIENCE_YEARS_PATTERN.search(job_description)
    if not match:
        return 50.0, None

    required = int(match.group(1))

    if candidate_years is None:
        return 50.0, required

    diff = candidate_years - required
    if diff >= 0:
        score = 100.0
    elif diff >= -1:
        score = 80.0
    elif diff >= -2:
        score = 60.0
    else:
        score = 40.0

    return score, required
