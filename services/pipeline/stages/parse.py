"""Compatibility wrapper for the official CV DNA extraction stage."""

from __future__ import annotations

from models import CandidateDnaProfile
from stages.cv import extract_candidate_dna


def parse_resume(raw_text: str) -> CandidateDnaProfile:
    return extract_candidate_dna(raw_text)
