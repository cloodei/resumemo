"""Pydantic models for screening pipeline input and output."""
from __future__ import annotations

from pydantic import BaseModel, Field


class FileManifestItem(BaseModel):
	file_id: int
	storage_key: str
	original_name: str


class JobDescriptionPayload(BaseModel):
	id: str
	name: str
	raw_text: str
	job_title: str | None = None
	source: str = "inline"


class PipelinePayload(BaseModel):
	session_id: str
	run_id: str
	job_description: JobDescriptionPayload
	files: list[FileManifestItem]


class WorkEntry(BaseModel):
	title: str | None = None
	company: str | None = None
	start_date: str | None = None
	end_date: str | None = None
	description: str | None = None


class EducationEntry(BaseModel):
	degree: str | None = None
	institution: str | None = None
	year: int | None = None


class CandidateProfile(BaseModel):
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


class FileResult(BaseModel):
	file_id: int
	candidate_name: str | None = None
	candidate_email: str | None = None
	candidate_phone: str | None = None
	raw_text: str
	resume_artifact: dict | None = None
	candidate_profile: dict
	score_artifact: dict
	overall_score: float
	base_score: float
	bonus_score: float
	summary: str
	skills_matched: list[str] = Field(default_factory=list)
