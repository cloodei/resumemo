"""Pipeline configuration constants."""

import os

# Pipeline version — stored with every result for reproducibility
PIPELINE_VERSION = "0.1.0"

# Scoring weights (must sum to 1.0)
SCORING_WEIGHT_TEXT_SIMILARITY = float(os.environ.get("SCORING_WEIGHT_TEXT_SIMILARITY", "0.40"))
SCORING_WEIGHT_SKILL_MATCH = float(os.environ.get("SCORING_WEIGHT_SKILL_MATCH", "0.35"))
SCORING_WEIGHT_EXPERIENCE_FIT = float(os.environ.get("SCORING_WEIGHT_EXPERIENCE_FIT", "0.25"))

# TF-IDF parameters
TFIDF_MAX_FEATURES = 5000
TFIDF_NGRAM_RANGE = (1, 2)

# Callback
CALLBACK_RETRY_ATTEMPTS = 3
CALLBACK_RETRY_BACKOFF = [1, 5, 15]  # seconds

# spaCy model name
SPACY_MODEL = os.environ.get("SPACY_MODEL", "en_core_web_md")
