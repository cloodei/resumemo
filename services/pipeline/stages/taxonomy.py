"""Local taxonomy mapping for the research-backed dual-brain pipeline."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from functools import lru_cache
from pathlib import Path
from typing import Any

from config import (
    EMBEDDING_MODEL_NAME,
    ENABLE_SEMANTIC_TAXONOMY_MAPPING,
    PIPELINE_TAXONOMY_DIR,
    TAXONOMY_DISTANCE_THRESHOLD,
)
from models import TaxonomyMatch

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TaxonomyTerm:
    text: str
    normalized: str
    taxonomy_id: str
    taxonomy_type: str
    path: tuple[str, ...]


def normalize_term(value: str) -> str:
    value = value.lower()
    value = value.replace("-", " ").replace("_", " ")
    value = re.sub(r"[^a-z0-9+#. ]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


class TaxonomyIndex:
    """Flattened dual-brain taxonomy with deterministic and optional semantic lookup."""

    def __init__(self, terms: list[TaxonomyTerm]):
        self.terms = terms
        self._by_normalized: dict[str, TaxonomyTerm] = {}
        for term in terms:
            self._by_normalized.setdefault(term.normalized, term)
        self._semantic_model = None
        self._term_embeddings = None

    @classmethod
    def from_directory(cls, taxonomy_dir: Path = PIPELINE_TAXONOMY_DIR) -> "TaxonomyIndex":
        terms: list[TaxonomyTerm] = []
        terms.extend(_load_taxonomy_file(taxonomy_dir / "tech_ontology.json", "tech"))
        terms.extend(_load_taxonomy_file(taxonomy_dir / "soft_skills_ontology.json", "soft"))
        if not terms:
            logger.warning("No taxonomy terms loaded", extra={"taxonomy_dir": str(taxonomy_dir)})
        return cls(terms)

    def find_mentions(self, text: str, taxonomy_type: str | None = None) -> list[TaxonomyMatch]:
        normalized_text = f" {normalize_term(text)} "
        matches: list[TaxonomyMatch] = []
        seen: set[str] = set()

        for term in sorted(self.terms, key=lambda item: len(item.normalized), reverse=True):
            if taxonomy_type and term.taxonomy_type != taxonomy_type:
                continue
            if not term.normalized or len(term.normalized) < 2:
                continue
            pattern = f" {term.normalized} "
            if pattern not in normalized_text:
                continue
            if term.taxonomy_id in seen:
                continue
            seen.add(term.taxonomy_id)
            matches.append(_term_to_match(term, term.text, 1.0, "exact_text"))

        return matches

    def map_text(self, text: str, taxonomy_type: str | None = None) -> TaxonomyMatch:
        normalized = normalize_term(text)
        if not normalized:
            return _unmapped_match(text)

        exact = self._by_normalized.get(normalized)
        if exact and (taxonomy_type is None or exact.taxonomy_type == taxonomy_type):
            return _term_to_match(exact, text, 1.0, "exact")

        best = self._best_fuzzy_match(normalized, taxonomy_type)
        if best:
            term, confidence = best
            return _term_to_match(term, text, confidence, "fuzzy")

        semantic = self._best_semantic_match(text, taxonomy_type)
        if semantic:
            term, confidence = semantic
            return _term_to_match(term, text, confidence, "semantic")

        return _unmapped_match(text)

    def sibling_expansion(self, matches: list[TaxonomyMatch], limit: int) -> list[TaxonomyMatch]:
        expansions: list[TaxonomyMatch] = []
        seen = {match.taxonomy_id or normalize_term(match.canonical_name) for match in matches}

        for match in matches:
            if match.taxonomy_type != "tech" or not match.path:
                continue

            parent = tuple(match.path[:-1])
            siblings = [
                term for term in self.terms
                if term.taxonomy_type == "tech"
                and tuple(term.path[:-1]) == parent
                and term.taxonomy_id not in seen
            ]
            for sibling in siblings:
                if len(expansions) >= limit:
                    return expansions
                seen.add(sibling.taxonomy_id)
                expansions.append(_term_to_match(sibling, sibling.text, 0.8, "taxonomy_sibling"))

        return expansions

    def _best_fuzzy_match(self, normalized: str, taxonomy_type: str | None) -> tuple[TaxonomyTerm, float] | None:
        best: tuple[TaxonomyTerm, float] | None = None
        for term in self.terms:
            if taxonomy_type and term.taxonomy_type != taxonomy_type:
                continue
            ratio = SequenceMatcher(a=normalized, b=term.normalized).ratio()
            if ratio < 0.86:
                continue
            if best is None or ratio > best[1]:
                best = (term, ratio)
        return best

    def _best_semantic_match(self, text: str, taxonomy_type: str | None) -> tuple[TaxonomyTerm, float] | None:
        if not ENABLE_SEMANTIC_TAXONOMY_MAPPING:
            return None

        try:
            model = self._get_semantic_model()
            terms = [term for term in self.terms if taxonomy_type is None or term.taxonomy_type == taxonomy_type]
            if not terms:
                return None
            embeddings = self._get_term_embeddings(model, terms)
            query = model.encode([text], normalize_embeddings=True)[0]
            scores = embeddings @ query
            best_index = int(scores.argmax())
            confidence = float(scores[best_index])
            if 1 - confidence > TAXONOMY_DISTANCE_THRESHOLD:
                return None
            return terms[best_index], confidence
        except Exception as error:
            logger.debug("Semantic taxonomy mapping unavailable", extra={"error": str(error)})
            return None

    def _get_semantic_model(self):
        if self._semantic_model is None:
            from sentence_transformers import SentenceTransformer

            self._semantic_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        return self._semantic_model

    def _get_term_embeddings(self, model: Any, terms: list[TaxonomyTerm]):
        # Cache only the all-term case; filtered calls are small enough to compute on demand.
        if len(terms) == len(self.terms):
            if self._term_embeddings is None:
                self._term_embeddings = model.encode([term.text for term in self.terms], normalize_embeddings=True)
            return self._term_embeddings
        return model.encode([term.text for term in terms], normalize_embeddings=True)


def _load_taxonomy_file(path: Path, taxonomy_type: str) -> list[TaxonomyTerm]:
    if not path.exists():
        logger.warning("Taxonomy file missing", extra={"path": str(path)})
        return []

    with path.open(encoding="utf-8") as file:
        data = json.load(file)

    terms: list[TaxonomyTerm] = []
    _flatten_taxonomy(data, taxonomy_type, (), terms)
    return terms


def _flatten_taxonomy(value: Any, taxonomy_type: str, path: tuple[str, ...], terms: list[TaxonomyTerm]) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            _flatten_taxonomy(child, taxonomy_type, (*path, str(key)), terms)
        return

    if isinstance(value, list):
        for item in value:
            if isinstance(item, str):
                normalized = normalize_term(item)
                if normalized:
                    taxonomy_path = (*path, item)
                    terms.append(
                        TaxonomyTerm(
                            text=item,
                            normalized=normalized,
                            taxonomy_id=".".join(taxonomy_path),
                            taxonomy_type=taxonomy_type,
                            path=taxonomy_path,
                        )
                    )
            else:
                _flatten_taxonomy(item, taxonomy_type, path, terms)


def _term_to_match(term: TaxonomyTerm, source_text: str, confidence: float, method: str) -> TaxonomyMatch:
    return TaxonomyMatch(
        source_text=source_text,
        normalized_text=normalize_term(source_text),
        taxonomy_id=term.taxonomy_id,
        canonical_name=term.text,
        taxonomy_type=term.taxonomy_type,  # type: ignore[arg-type]
        path=list(term.path),
        confidence=round(confidence, 4),
        match_method=method,
    )


def _unmapped_match(text: str) -> TaxonomyMatch:
    return TaxonomyMatch(
        source_text=text,
        normalized_text=normalize_term(text),
        taxonomy_id=None,
        canonical_name=text.strip(),
        taxonomy_type="unmapped",
        path=[],
        confidence=0,
        match_method="unmapped",
    )


@lru_cache(maxsize=1)
def get_taxonomy_index() -> TaxonomyIndex:
    return TaxonomyIndex.from_directory()
