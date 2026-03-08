"""Pydantic models for pipeline input, output, and intermediate data."""
from __future__ import annotations
from pydantic import BaseModel, Field

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


class WorkEntry(BaseModel):
    """A single work history entry."""

    title: str | None = None
    company: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None

class EducationEntry(BaseModel):
    """A single education entry."""

    degree: str | None = None
    institution: str | None = None
    year: int | None = None

class CandidateProfile(BaseModel):
    """Structured data extracted from a resume."""

    name: str | None = None
    identity_source: str | None = None
    name_confidence: float | None = None
    email: str | None = None
    phone: str | None = None
    skills: list[str] = Field(default_factory=list)
    work_history: list[WorkEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    total_experience_years: float | None = None
    parse_warnings: list[str] = Field(default_factory=list)



class SubScore(BaseModel):
    """A single scoring criterion result."""

    score: float = Field(ge=0, le=100)
    weight: float = Field(ge=0, le=1)
    description: str
    details: dict | None = None

class ScoringResult(BaseModel):
    """Complete scoring output for a single resume."""

    overall_score: float = Field(ge=0, le=100)
    breakdown: dict[str, SubScore]

    def get_matched_skills(self) -> list[str]:
        """Extract the list of matched skills from the skill_match sub-score."""
        skill_sub = self.breakdown.get("skill_match")
        if skill_sub and skill_sub.details:
            return skill_sub.details.get("matched", [])
        return []



class FileResult(BaseModel):
    """Pipeline output for a single processed file."""

    file_id: int
    candidate_name: str | None = None
    candidate_email: str | None = None
    candidate_phone: str | None = None
    raw_text: str
    parsed_profile: dict
    overall_score: float
    score_breakdown: dict
    summary: str
    skills_matched: list[str] = Field(default_factory=list)
