"""Stage 3: Hybrid lexical + semantic scoring for resume relevance."""

from __future__ import annotations

import logging
import re
from typing import Any

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from config import (
    SCORING_WEIGHT_EXPERIENCE_FIT,
    SCORING_WEIGHT_SEMANTIC_SIMILARITY,
    SCORING_WEIGHT_SKILL_MATCH,
    SCORING_WEIGHT_TEXT_SIMILARITY,
    SEMANTIC_MAX_CHARS,
    SEMANTIC_MODEL_NAME,
    TFIDF_MAX_FEATURES,
    TFIDF_NGRAM_RANGE,
)
from models import CandidateProfile, ScoringResult, SubScore
from stages.parse import _get_nlp, _get_skills_taxonomy

logger = logging.getLogger(__name__)
_semantic_model: Any | None = None
_semantic_backend = "sentence-transformers"

EXPERIENCE_YEARS_PATTERN = re.compile(
    r"(\d+)\+?\s*(?:years?|yrs?)(?:\s+of\s+experience)?",
    re.IGNORECASE,
)


def score_resume(
    raw_text: str,
    profile: CandidateProfile,
    job_description: str,
) -> ScoringResult:
    """Score a resume against a job description with a hybrid approach."""
    lexical_sim = _score_text_similarity(raw_text, job_description)
    semantic_sim = _score_semantic_similarity(raw_text, job_description)
    skill_match, matched, missing, extra = _score_skill_match(profile.skills, job_description)
    exp_fit, required_years = _score_experience_fit(profile.total_experience_years, job_description)

    weights = {
        "text_similarity": SCORING_WEIGHT_TEXT_SIMILARITY,
        "semantic_similarity": SCORING_WEIGHT_SEMANTIC_SIMILARITY,
        "skill_match": SCORING_WEIGHT_SKILL_MATCH,
        "experience_fit": SCORING_WEIGHT_EXPERIENCE_FIT,
    }

    if skill_match == 50.0 and not matched and not missing:
        _redistribute_weight(weights, "skill_match", ["text_similarity", "semantic_similarity"])

    if exp_fit == 50.0 and required_years is None:
        _redistribute_weight(weights, "experience_fit", ["semantic_similarity", "text_similarity", "skill_match"])

    total_weight = sum(weights.values())
    if total_weight > 0:
        weights = {key: value / total_weight for key, value in weights.items()}

    overall = (
        lexical_sim * weights["text_similarity"]
        + semantic_sim * weights["semantic_similarity"]
        + skill_match * weights["skill_match"]
        + exp_fit * weights["experience_fit"]
    )
    overall = round(min(100.0, max(0.0, overall)), 1)

    breakdown = {
        "text_similarity": SubScore(
            score=round(lexical_sim, 1),
            weight=round(weights["text_similarity"], 2),
            description="Lexical TF-IDF similarity between the resume and job description",
        ),
        "semantic_similarity": SubScore(
            score=round(semantic_sim, 1),
            weight=round(weights["semantic_similarity"], 2),
            description="Semantic similarity using sentence-transformer embeddings",
            details={
                "max_chars": SEMANTIC_MAX_CHARS,
                "backend": _semantic_backend,
                "model": SEMANTIC_MODEL_NAME if _semantic_backend == "sentence-transformers" else "spacy-fallback",
            },
        ),
        "skill_match": SubScore(
            score=round(skill_match, 1),
            weight=round(weights["skill_match"], 2),
            description="Ratio of required skills found in the resume",
            details={
                "matched": matched,
                "missing": missing,
                "extra": extra,
            },
        ),
        "experience_fit": SubScore(
            score=round(exp_fit, 1),
            weight=round(weights["experience_fit"], 2),
            description="Experience duration relative to the stated requirement",
            details={
                "required_years": required_years,
                "candidate_years": profile.total_experience_years,
            },
        ),
    }

    return ScoringResult(overall_score=overall, breakdown=breakdown)


def _redistribute_weight(weights: dict[str, float], from_key: str, recipients: list[str]) -> None:
    amount = weights[from_key]
    weights[from_key] = 0.0
    if amount <= 0 or not recipients:
        return

    share = amount / len(recipients)
    for key in recipients:
        weights[key] += share


def _score_text_similarity(resume_text: str, job_description: str) -> float:
    """Compute lexical TF-IDF cosine similarity between resume and JD."""
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
    except Exception:
        return 0.0


def _score_semantic_similarity(resume_text: str, job_description: str) -> float:
    """Compute semantic similarity using sentence-transformers with spaCy fallback."""
    if not resume_text.strip() or not job_description.strip():
        return 0.0

    try:
        model = _get_semantic_model()
        embeddings = model.encode(
            [job_description[:SEMANTIC_MAX_CHARS], resume_text[:SEMANTIC_MAX_CHARS]],
            normalize_embeddings=True,
        )
        similarity = float(embeddings[0] @ embeddings[1])
        return max(0.0, min(100.0, float(similarity * 100)))
    except Exception as primary_error:
        return _score_semantic_similarity_spacy(resume_text, job_description, primary_error)


def _get_semantic_model():
    global _semantic_model
    global _semantic_backend

    if _semantic_model is None:
        from sentence_transformers import SentenceTransformer

        _semantic_model = SentenceTransformer(SEMANTIC_MODEL_NAME)
        _semantic_backend = "sentence-transformers"

    return _semantic_model


def _score_semantic_similarity_spacy(
    resume_text: str,
    job_description: str,
    primary_error: Exception | None = None,
) -> float:
    global _semantic_backend

    try:
        nlp = _get_nlp()
        jd_doc = nlp(job_description[:SEMANTIC_MAX_CHARS])
        resume_doc = nlp(resume_text[:SEMANTIC_MAX_CHARS])
        similarity = jd_doc.similarity(resume_doc)
        _semantic_backend = "spacy-fallback"
        return max(0.0, min(100.0, float(similarity * 100)))
    except Exception as fallback_error:
        logger.error(
            "Semantic scoring failed after fallback",
            extra={
                "primary_error": str(primary_error) if primary_error else None,
                "fallback_error": str(fallback_error),
            },
        )
        return 0.0


def _score_skill_match(
    candidate_skills: list[str],
    job_description: str,
) -> tuple[float, list[str], list[str], list[str]]:
    """Score skill overlap between candidate and job description."""
    taxonomy = _get_skills_taxonomy()
    jd_lower = job_description.lower()

    required_skills: set[str] = set()
    for skill in taxonomy:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, jd_lower):
            required_skills.add(skill)

    if not required_skills:
        return 50.0, [], [], list(candidate_skills)

    candidate_lower = {skill.lower() for skill in candidate_skills}

    matched = sorted(required_skills & candidate_lower, key=str.lower)
    missing = sorted(required_skills - candidate_lower, key=str.lower)
    extra = sorted(candidate_lower - required_skills, key=str.lower)

    score = (len(matched) / len(required_skills)) * 100 if required_skills else 50.0
    return min(100.0, score), matched, missing, extra


def _score_experience_fit(
    candidate_years: float | None,
    job_description: str,
) -> tuple[float, int | None]:
    """Score experience alignment with JD requirements."""
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
