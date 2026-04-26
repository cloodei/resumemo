"""Configuration for the official research-backed pipeline."""

from __future__ import annotations

import os
from pathlib import Path

PIPELINE_VERSION = "1.0.0"

PIPELINE_ROOT = Path(__file__).resolve().parent
REPO_ROOT = PIPELINE_ROOT.parent.parent

PIPELINE_CALLBACK_URL = os.environ.get("PIPELINE_CALLBACK_URL", "http://localhost:8080/api/internal/pipeline/callback")
PIPELINE_CALLBACK_SECRET = os.environ.get("PIPELINE_CALLBACK_SECRET", "")
PIPELINE_SECRET_HEADER_NAME = os.environ.get("PIPELINE_SECRET_HEADER_NAME", "x-pipeline-secret").lower()

LOCAL_TAXONOMY_DIR = PIPELINE_ROOT / "data" / "taxonomy"
RESEARCH_TAXONOMY_DIR = REPO_ROOT / "research" / "data" / "taxonomy" / "taxonomy_processed"
DEFAULT_TAXONOMY_DIR = LOCAL_TAXONOMY_DIR if LOCAL_TAXONOMY_DIR.exists() else RESEARCH_TAXONOMY_DIR
PIPELINE_TAXONOMY_DIR = Path(os.environ.get("PIPELINE_TAXONOMY_DIR", str(DEFAULT_TAXONOMY_DIR)))
PIPELINE_CHROMA_DB_PATH = Path(
    os.environ.get("PIPELINE_CHROMA_DB_PATH", str(REPO_ROOT / "research" / "data" / "chroma_db"))
)

GLINER_MODEL_NAME = os.environ.get("GLINER_MODEL_NAME", "urchade/gliner_multi-v2.1")
EMBEDDING_MODEL_NAME = os.environ.get("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL_NAME = os.environ.get("GEMINI_MODEL_NAME", "gemini-3.1-flash-lite-preview")
ENABLE_GEMINI_SEGMENTATION = os.environ.get("ENABLE_GEMINI_SEGMENTATION", "false").lower() == "true"
ENABLE_SEMANTIC_TAXONOMY_MAPPING = os.environ.get("ENABLE_SEMANTIC_TAXONOMY_MAPPING", "true").lower() == "true"

JD_TAXONOMY_EXPANSION_LIMIT = int(os.environ.get("JD_TAXONOMY_EXPANSION_LIMIT", "10"))
JD_ENTITY_THRESHOLD = float(os.environ.get("JD_ENTITY_THRESHOLD", "0.4"))
CV_ENTITY_THRESHOLD = float(os.environ.get("CV_ENTITY_THRESHOLD", "0.4"))
CV_SKILLS_SECTION_THRESHOLD = float(os.environ.get("CV_SKILLS_SECTION_THRESHOLD", "0.15"))
TAXONOMY_DISTANCE_THRESHOLD = float(os.environ.get("TAXONOMY_DISTANCE_THRESHOLD", "0.4"))
SOFT_SKILL_SIMILARITY_THRESHOLD = float(os.environ.get("SOFT_SKILL_SIMILARITY_THRESHOLD", "0.55"))

SCORING_WEIGHT_HARD_SKILLS = float(os.environ.get("SCORING_WEIGHT_HARD_SKILLS", "0.80"))
SCORING_WEIGHT_CONSTRAINTS = float(os.environ.get("SCORING_WEIGHT_CONSTRAINTS", "0.20"))
SCORING_WEIGHT_MUST_HAVE = float(os.environ.get("SCORING_WEIGHT_MUST_HAVE", "1.0"))
SCORING_WEIGHT_NICE_TO_HAVE_JD = float(os.environ.get("SCORING_WEIGHT_NICE_TO_HAVE_JD", "0.7"))
SCORING_WEIGHT_TAXONOMY_EXPANSION = float(os.environ.get("SCORING_WEIGHT_TAXONOMY_EXPANSION", "0.3"))
SCORING_WEIGHT_SURPLUS = float(os.environ.get("SCORING_WEIGHT_SURPLUS", "0.05"))
SCORING_BONUS_SOFT_SKILL = float(os.environ.get("SCORING_BONUS_SOFT_SKILL", "1.0"))
SCORING_BONUS_CERTIFICATION = float(os.environ.get("SCORING_BONUS_CERTIFICATION", "1.0"))

CALLBACK_RETRY_ATTEMPTS = 3
CALLBACK_RETRY_BACKOFF = [2, 5, 15]
