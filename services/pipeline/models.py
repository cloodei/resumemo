"""Pydantic models for the official Resumemo AI pipeline."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


class FileManifestItem(BaseModel):
    """A single file in the job payload."""

    file_id: int
    storage_key: str
    original_name: str


class JobPayload(BaseModel):
    """The full job message received from the queue."""

    session_id: str
    run_id: str
    job_description: str
    files: list[FileManifestItem]


class TaxonomyMatch(BaseModel):
    """A taxonomy mapping decision for a skill or requirement."""

    source_text: str
    normalized_text: str
    taxonomy_id: str | None = None
    canonical_name: str
    taxonomy_type: Literal["tech", "soft", "unmapped"]
    path: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1, default=0)
    match_method: str = "unmapped"


class JobDescriptionArtifact(BaseModel):
    """Structured, explainable representation of a job description."""

    schema_version: str = "jd-artifact.v1"
    processed_at: str = Field(default_factory=utc_now_iso)
    metadata: dict[str, Any] = Field(default_factory=dict)
    hard_constraints: dict[str, Any] = Field(default_factory=dict)
    hard_skills: dict[str, Any] = Field(default_factory=dict)
    soft_skills: list[dict[str, Any]] = Field(default_factory=list)
    taxonomy_traces: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class SkillEvidence(BaseModel):
    """A candidate skill with taxonomy mapping and experience evidence."""

    skill: str
    taxonomy_id: str | None = None
    canonical_name: str
    years: float = 0.0
    zones: list[str] = Field(default_factory=list)
    taxonomy_type: Literal["tech", "soft", "unmapped"] = "unmapped"
    path: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1, default=0)
    evidence: list[str] = Field(default_factory=list)


class CandidateDnaProfile(BaseModel):
    """Research-backed candidate DNA profile persisted as parsed_profile."""

    schema_version: str = "candidate-dna.v1"
    information: dict[str, Any] = Field(default_factory=dict)
    hard_skills: dict[str, Any] = Field(default_factory=dict)
    soft_skills: list[dict[str, Any]] = Field(default_factory=list)
    education: dict[str, Any] = Field(default_factory=dict)
    raw_entities: list[dict[str, Any]] = Field(default_factory=list)
    taxonomy_traces: list[dict[str, Any]] = Field(default_factory=list)
    parse_warnings: list[str] = Field(default_factory=list)

    @property
    def candidate_name(self) -> str | None:
        value = self.information.get("name")
        return value if isinstance(value, str) and value else None

    @property
    def candidate_email(self) -> str | None:
        value = self.information.get("email")
        return value if isinstance(value, str) and value else None

    @property
    def candidate_phone(self) -> str | None:
        value = self.information.get("phone")
        return value if isinstance(value, str) and value else None

    @property
    def total_experience_years(self) -> float | None:
        value = self.information.get("years_of_experience")
        return value if isinstance(value, int | float) else None

    def hard_skill_items(self) -> list[dict[str, Any]]:
        direct = self.hard_skills.get("direct_mention", [])
        return direct if isinstance(direct, list) else []

    def certification_items(self) -> list[str]:
        values = self.hard_skills.get("certifications", [])
        return [item for item in values if isinstance(item, str)] if isinstance(values, list) else []


class ScoreArtifact(BaseModel):
    """Explainable composite scoring result."""

    schema_version: str = "score-artifact.v1"
    base_score: float
    bonus_score: float
    total_score: float
    components: dict[str, Any] = Field(default_factory=dict)
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    surplus_skills: list[str] = Field(default_factory=list)
    explanation: list[str] = Field(default_factory=list)


class FileResult(BaseModel):
    """Callback-compatible output for a single processed file."""

    file_id: int
    candidate_name: str | None = None
    candidate_email: str | None = None
    candidate_phone: str | None = None
    raw_text: str
    parsed_profile: dict[str, Any]
    overall_score: float
    score_breakdown: dict[str, Any]
    summary: str
    skills_matched: list[str] = Field(default_factory=list)
