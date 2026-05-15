"""Optional GLiNER entity extraction helpers with deterministic fallback."""

from __future__ import annotations

import logging
from typing import Any

from config import GLINER_MODEL_NAME

logger = logging.getLogger(__name__)
_gliner_model = None
_gliner_unavailable = False
CHUNK_WORDS = 200
CHUNK_OVERLAP_WORDS = 50


def extract_entities(text: str, labels: list[str], threshold: float) -> list[dict[str, Any]]:
    """Extract entities with GLiNER when available.

    The worker stays operational without GLiNER installed because taxonomy
    mention matching is the deterministic fallback path.
    """
    if not text.strip():
        return []

    model = _get_gliner_model()
    if model is None:
        return []

    try:
        entities = []
        for chunk in _chunk_text(text):
            entities.extend(model.predict_entities(chunk, labels, threshold=threshold))
    except Exception as error:
        logger.debug("GLiNER extraction failed", extra={"error": str(error)})
        return []

    results = []
    seen: set[tuple[str, str]] = set()
    for entity in entities:
        value = entity.get("text") if isinstance(entity, dict) else None
        label = entity.get("label") if isinstance(entity, dict) else None
        score = entity.get("score") if isinstance(entity, dict) else None
        if not value or len(str(value).strip()) < 2:
            continue
        key = (str(value).strip().lower(), str(label or "Entity"))
        if key in seen:
            continue
        seen.add(key)
        results.append({
            "text": str(value).strip(),
            "label": str(label or "Entity"),
            "score": float(score) if isinstance(score, int | float) else None,
        })
    return results


def _chunk_text(text: str) -> list[str]:
    words = text.split()
    if len(words) <= CHUNK_WORDS:
        return [text[:20_000]]

    chunks = []
    step = CHUNK_WORDS - CHUNK_OVERLAP_WORDS
    for start in range(0, len(words), step):
        chunk_words = words[start:start + CHUNK_WORDS]
        if not chunk_words:
            continue
        chunks.append(" ".join(chunk_words))
        if start + CHUNK_WORDS >= len(words):
            break

    return chunks


def _get_gliner_model():
    global _gliner_model
    global _gliner_unavailable

    if _gliner_unavailable:
        return None
    if _gliner_model is not None:
        return _gliner_model

    try:
        from gliner import GLiNER

        _gliner_model = GLiNER.from_pretrained(GLINER_MODEL_NAME)
        return _gliner_model
    except Exception as error:
        _gliner_unavailable = True
        logger.info("GLiNER unavailable; using taxonomy fallback", extra={"error": str(error)})
        return None
