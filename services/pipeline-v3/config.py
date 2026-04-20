"""Pipeline configuration constants."""

import os

PIPELINE_VERSION = "3.0.0-alpha"
PIPELINE_CALLBACK_URL = os.environ.get("PIPELINE_CALLBACK_URL", "http://localhost:8080/api/internal/pipeline/v3/callback")
PIPELINE_CALLBACK_SECRET = os.environ.get("PIPELINE_CALLBACK_SECRET", "")
PIPELINE_SECRET_HEADER_NAME = os.environ.get("PIPELINE_SECRET_HEADER_NAME", "x-pipeline-secret").lower()

SCORING_WEIGHT_SKILL_MATCH = float(os.environ.get("SCORING_WEIGHT_SKILL_MATCH", "0.30"))
SCORING_WEIGHT_EXPERIENCE_FIT = float(os.environ.get("SCORING_WEIGHT_EXPERIENCE_FIT", "0.20"))
SCORING_WEIGHT_TEXT_SIMILARITY = float(os.environ.get("SCORING_WEIGHT_TEXT_SIMILARITY", "0.25"))
SCORING_WEIGHT_SEMANTIC_SIMILARITY = float(os.environ.get("SCORING_WEIGHT_SEMANTIC_SIMILARITY", "0.25"))

TFIDF_MAX_FEATURES = 5000
TFIDF_NGRAM_RANGE = (1, 2)
SEMANTIC_MAX_CHARS = int(os.environ.get("SEMANTIC_MAX_CHARS", "15000"))
SEMANTIC_MODEL_NAME = os.environ.get("SEMANTIC_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
CALLBACK_RETRY_ATTEMPTS = 3
CALLBACK_RETRY_BACKOFF = [2, 5, 15]
SPACY_MODEL = os.environ.get("SPACY_MODEL", "en_core_web_md")
