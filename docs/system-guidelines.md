# System Guidelines: AI Resume Screening Platform

## Purpose and Intent (Why)
This system enables recruiters and hiring teams to ingest, analyze, and manage applicant resumes at scale. The primary capability is AI-assisted ranking via NLP pipelines and machine learning models, but the platform is intentionally broader: it delivers end-to-end resume workflow management, searchable candidate insights, and exportable outcomes to support hiring decisions.

**Key intent**
- Reduce time-to-screen while preserving recruiter oversight and transparency.
- Standardize evaluation criteria and remove inconsistent manual scoring.
- Provide a secure, auditable workflow for resume intake, review, and export.

## System Identity (What)
This is a recruiter-facing platform that:
- Accepts candidate resumes in multiple formats (PDF, DOCX).
- Extracts structured data (skills, experience, education, role alignment).
- Ranks and scores candidates by configurable criteria.
- Offers robust search/filtering across all candidates.
- Enables resume viewing/downloading and export of ranked results.
- Provides dashboards and historical tracking for hiring pipelines.

## Core Workflows (How)
### 1) Resume Intake
- Recruiters upload resumes individually or in bulk.
- The system stores raw files in object storage and metadata in Postgres.
- Pre-processing normalizes document text and detects document language.

### 2) NLP & Feature Extraction
- Text is parsed into structured fields: work history, skills, education, projects.
- Candidate feature vectors are generated for ranking models and filtering.
- Extraction output is stored to enable fast search and explainability.

### 3) Scoring and Ranking
- ML models generate a relevance score per job role.
- Weighted criteria and configurable rule layers modify scoring.
- Rankings are transparent: each candidate shows a breakdown of why.

### 4) Recruiter Review
- Recruiters search and filter results by role fit, skills, education, and signals.
- Recruiters view original resume and parsed summaries side-by-side.
- Recruiters can download or export results in CSV/JSON for handoff.

### 5) Reporting & History
- Dashboards show pipeline counts, top candidates, and score distributions.
- Historical views retain prior screenings with job metadata and timestamps.

## Functional Scope (What it Can Do)
**Primary AI Feature**
- Resume ranking by role relevance with explainability.

**Expanded Product Features**
- Search and filter across candidates and extracted attributes.
- Resume viewing, preview, and download.
- Export results (CSV, JSON, structured reports).
- Recruiter dashboards and screening history.
- Role-based access: recruiters, hiring managers, admins.
- Audit trails and screening logs.

## LLM/Agent Guidance (System Prompt-Style)
Use the following guidelines when interpreting or extending system behavior.

**System Objective**
- Prioritize recruiter workflow efficiency with transparent AI outputs.
- Always provide structured, searchable candidate insights.
- Maintain integrity of scoring by surfacing evidence and rationale.

**Operational Constraints**
- Never overwrite original resume files.
- Store derived data separately from raw input for traceability.
- Ensure every score is explainable with visible features or criteria.

**Behavioral Rules**
- Provide summaries before raw data when presenting candidates.
- Prefer explicit, deterministic filters over implicit scoring bias.
- Preserve historical results; do not mutate past screening records.

**Output Expectations**
- Return stable, reproducible candidate lists.
- Each candidate record should include: score, role match, top skills, key flags.
- Exports must align with the current recruiter’s filters and sorting.

## Interfaces and Components
- **Recruiter UI**: Resume ingestion, search, review, export, dashboards.
- **Admin Console**: Role and permission management, data governance.
- **Scoring Service**: ML ranking, weight tuning, rule-based adjustment layer.
- **Parsing Service**: Document processing, NLP extraction, storage.

## Data & Security
- Resumes are PII-heavy; enforce encryption at rest and in transit.
- Access to resumes and rankings is role-gated.
- Audit logs should capture uploads, exports, and scoring changes.

## Future-Proofing (AI Expansion)
- Keep AI pipeline modular: parsing and ranking must be replaceable.
- Allow multiple models and versioned scoring policies.
- Prepare interfaces for model evaluation, bias testing, and policy review.
