"""Screening pipeline configuration."""

import os

PIPELINE_VERSION = "screening-alpha"
PIPELINE_CALLBACK_URL = os.environ.get("PIPELINE_CALLBACK_URL", "http://localhost:8080/api/internal/pipeline/v3/callback")
PIPELINE_CALLBACK_SECRET = os.environ.get("PIPELINE_CALLBACK_SECRET", "")
PIPELINE_SECRET_HEADER_NAME = os.environ.get("PIPELINE_SECRET_HEADER_NAME", "x-pipeline-secret").lower()

CALLBACK_RETRY_ATTEMPTS = 3
CALLBACK_RETRY_BACKOFF = [2, 5, 15]
SPACY_MODEL = os.environ.get("SPACY_MODEL", "en_core_web_md")
