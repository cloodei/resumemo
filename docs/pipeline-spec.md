# AI Pipeline Specification

This document is the authoritative reference for the Resumemo AI profiling pipeline. It covers the full architecture, every component, data flow, contracts, schema design, failure handling, and implementation details. It supersedes the earlier `ml-pipeline-architecture.md` which described intent; this document describes what will be built and how.

---

## Table of Contents

1. [System Context](#1-system-context)
2. [Architecture Overview](#2-architecture-overview)
3. [Component Descriptions](#3-component-descriptions)
4. [Data Flow](#4-data-flow)
5. [Message Contracts](#5-message-contracts)
6. [Pipeline Stages](#6-pipeline-stages)
7. [Database Schema Additions](#7-database-schema-additions)
8. [API Surface Changes](#8-api-surface-changes)
9. [Infrastructure](#9-infrastructure)
10. [Project Layout](#10-project-layout)
11. [Configuration and Environment](#11-configuration-and-environment)
12. [Error Handling and Retries](#12-error-handling-and-retries)
13. [Security](#13-security)
14. [Versioning and Reproducibility](#14-versioning-and-reproducibility)
15. [Observability](#15-observability)
16. [Implementation Phases](#16-implementation-phases)
17. [Open Questions and Future Work](#17-open-questions-and-future-work)
18. [Decision Log](#18-decision-log)

---

## 1. System Context

Resumemo is a recruiter-facing resume screening platform. Recruiters upload batches of resumes against a job description, and the system scores, ranks, and summarizes each candidate. The AI pipeline is the subsystem that performs the actual analysis: extracting text from documents, parsing structured candidate data, scoring relevance against the job description, and generating human-readable summaries.

### What the pipeline receives

- A **profiling session** containing:
  - A job description (free text, up to 5000 characters).
  - An optional job title.
  - One or more resume files (PDF, DOCX, or TXT, max 2MB each, max 50 per session) already stored in Cloudflare R2.

### What the pipeline produces

For each resume in the session:

- **Extracted text**: the raw text content of the document.
- **Parsed profile**: structured candidate data (name, contact info, skills, work history, education, certifications, projects).
- **Relevance score**: a numerical score (0-100) measuring how well the resume matches the job description, with a per-criterion breakdown.
- **Candidate summary**: a concise 2-3 sentence description of the candidate.

### What the pipeline does NOT do

- It does not serve HTTP requests. It is a background worker.
- It does not read from or write to the database. All persistence is handled by the Elysia API via callbacks.
- It does not make decisions about candidates. It provides data for recruiters to make decisions.

---

## 2. Architecture Overview

```
                          ┌─────────────────┐
                          │   CloudAMQP     │
                          │   (RabbitMQ)    │
                          │                 │
                 publish  │  profiling.jobs │  consume
              ┌──────────>│  queue          │───────────┐
              │           └─────────────────┘           │
              │                                         v
     ┌────────┴────────┐                    ┌───────────────────┐
     │   Elysia API    │                    │   Celery Worker   │
     │   (Bun/TS)      │                    │   (Python)        │
     │                  │                    │                   │
     │  POST /:id/start │                    │  1. Fetch files   │
     │  - set status    │                    │     from R2       │
     │    "processing"  │                    │  2. Extract text  │
     │  - publish job   │                    │  3. Parse fields  │
     │    to RabbitMQ   │   HTTP callback   │  4. Score vs JD   │
     │                  │<───────────────────│  5. Summarize     │
     │  POST /callback  │                    │  6. POST results  │
     │  - validate      │                    │     to Elysia     │
     │  - store results │                    └───────────────────┘
     │  - set status    │                           │
     │    "completed"   │                           │ fetch
     └────────┬─────────┘                           v
              │                              ┌────────────┐
              v                              │ Cloudflare │
     ┌────────────────┐                      │ R2 (S3)    │
     │   PostgreSQL   │                      │            │
     │                │                      │ resume     │
     │ profiling_     │                      │ files      │
     │ session        │                      └────────────┘
     │ candidate_     │
     │ result         │
     │ pipeline_job   │
     └────────────────┘
```

### Topology

| Component | Runtime | Hosting | Count |
|-----------|---------|---------|-------|
| Elysia API | Bun 1.3.6 | Server / container | 1+ |
| Celery Worker | Python 3.12+ | Container | 1+ (horizontally scalable) |
| RabbitMQ | Erlang | CloudAMQP (managed) | 1 cluster |
| PostgreSQL | - | Existing (already deployed) | 1 |
| Cloudflare R2 | - | Existing (already deployed) | 1 bucket |

### Key architectural properties

- **Decoupled**: The API and pipeline communicate only through RabbitMQ (jobs) and HTTP (callbacks). Neither knows the other's internals.
- **Stateless workers**: Celery workers hold no local state. Any worker can process any job. Scaling is horizontal.
- **API owns the database**: The Python worker never connects to PostgreSQL. All reads and writes go through Elysia's callback endpoint. This keeps schema management, migrations, and access control in one place.
- **Files stay in R2**: The worker fetches files directly from R2 using boto3 with the same credentials. Files are never copied to the database or sent through the queue.

---

## 3. Component Descriptions

### 3.1 Elysia API (existing, extended)

The Elysia API is the application's HTTP backend. For the pipeline, it gains three responsibilities:

**Job publisher**: When a recruiter starts a profiling session (`POST /api/v2/sessions/:id/start`), the API publishes a job message to the RabbitMQ queue. The message contains the session ID, job description, and a manifest of files to process.

**Callback receiver**: The API exposes an internal endpoint (`POST /api/internal/pipeline/callback`) that the pipeline POSTs results to when processing finishes. This endpoint is not user-facing; it is authenticated by a shared secret.

**Results server**: The API serves scored candidate data to the frontend through new endpoints (`GET /api/v2/sessions/:id/results`).

### 3.2 Celery Worker (new)

A Python process running one or more Celery workers. Each worker listens to the `profiling.jobs` queue on RabbitMQ, picks up job messages, runs the four-stage pipeline (extract, parse, score, summarize), and POSTs results back to the Elysia API.

The worker is a pure consumer. It has no HTTP server, no database connection, and no user-facing interface. It is started with:

```
celery -A worker worker --loglevel=info --queues=profiling.jobs
```

### 3.3 RabbitMQ (CloudAMQP)

A managed RabbitMQ instance on CloudAMQP. Used as the Celery message broker and (optionally) result backend. The free tier (Little Lemur) supports up to 1M messages/month and is sufficient for development and early production.

Only one queue is needed initially: `profiling.jobs`.

### 3.4 Cloudflare R2 (existing)

Already used by the application for resume file storage. The pipeline worker accesses the same bucket using S3-compatible credentials (access key ID + secret access key + endpoint URL). Files are read-only from the worker's perspective.

---

## 4. Data Flow

This section traces a single profiling session from start to finish.

### 4.1 Trigger

**Precondition**: A profiling session exists in `profiling_session` with status `ready`. It has associated files in `resume_file` linked through `profiling_session_file`.

1. Recruiter clicks "Start Profiling" in the UI.
2. Frontend calls `POST /api/v2/sessions/:id/start`.
3. Elysia handler:
   a. Verifies the session belongs to the authenticated user and has status `ready`.
   b. Updates `profiling_session.status` to `processing`.
   c. Inserts a row in `pipeline_job` with status `queued`.
   d. Queries the session's files (joins `profiling_session_file` + `resume_file`) to build the file manifest.
   e. Publishes a job message to RabbitMQ queue `profiling.jobs`.
   f. Returns `{ status: "ok", message: "Profiling started" }` to the frontend.

### 4.2 Processing

4. Celery worker receives the job message from RabbitMQ.
5. Worker sends a **progress callback** to Elysia: `{ status: "running", processed: 0, total: N }`.
6. For each file in the manifest:
   a. **Extract**: Fetch the file from R2 by `storage_key`. Detect format. Extract raw text.
   b. **Parse**: Run spaCy NER and regex patterns over the raw text. Produce a structured `CandidateProfile`.
   c. **Score**: Vectorize the job description and resume text with TF-IDF. Compute cosine similarity. Apply skill-match and experience bonuses. Produce a `ScoringResult`.
   d. **Summarize**: Generate a template-based candidate summary from the parsed profile.
   e. Append the file's results to the batch.
   f. Send a **progress callback**: `{ status: "running", processed: i, total: N }`.
7. After all files are processed, worker sends a **completion callback** with the full results array.

### 4.3 Finalization

8. Elysia callback handler receives the completion payload.
9. Handler validates the shared secret and payload structure.
10. Handler inserts one `candidate_result` row per file.
11. Handler updates `pipeline_job`: status `completed`, `completed_at` timestamp, `processed_files` count.
12. Handler updates `profiling_session.status` to `completed`.
13. If any error occurred, handler sets status to `failed` and records `error_message`.

### 4.4 Display

14. Frontend polls `GET /api/v2/sessions/:id` and sees status `completed`.
15. Frontend fetches `GET /api/v2/sessions/:id/results` to display scored, ranked candidates.

### 4.5 Failure path

If the worker encounters an unrecoverable error:

- Worker sends an **error callback**: `{ status: "failed", error: "description" }`.
- Elysia sets `profiling_session.status` to `failed` and stores the error message.
- If the worker crashes without sending a callback, Celery's `acks_late` setting means the message returns to the queue for retry (up to `max_retries`).
- If all retries are exhausted, a Celery `on_failure` handler sends a failure callback.

---

## 5. Message Contracts

### 5.1 Job Message (Elysia -> RabbitMQ -> Worker)

Published to queue `profiling.jobs`. This is a Celery-compatible task message.

**Celery task name**: `pipeline.process_session`

**Payload** (first positional argument to the task):

```json
{
  "session_id": "019450a1-b2c3-7def-8901-234567890abc",
  "job_id": "019450a1-ffff-7def-8901-234567890abc",
  "callback_url": "https://api.resumemo.com/api/internal/pipeline/callback",
  "callback_secret": "hmac-shared-secret",
  "job_description": "We are looking for a senior software engineer with 5+ years of experience in Python, distributed systems, and cloud infrastructure...",
  "job_title": "Senior Software Engineer",
  "pipeline_version": "0.1.0",
  "files": [
    {
      "file_id": 42,
      "storage_key": "019450a1-b2c3-7def/resume-john-doe.pdf",
      "original_name": "resume-john-doe.pdf",
      "mime_type": "application/pdf",
      "size": 245891
    }
  ]
}
```

**Field descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| `session_id` | UUID string | The profiling session this job belongs to. |
| `job_id` | UUID string | The `pipeline_job` row ID for tracking. |
| `callback_url` | URL string | Where the worker POSTs results and progress updates. |
| `callback_secret` | string | HMAC secret for authenticating callbacks. Sent as `Authorization: Bearer <secret>` header. |
| `job_description` | string | The full job description text to score against. |
| `job_title` | string or null | Optional job title for additional context. |
| `pipeline_version` | string | Semver of the pipeline code. Stored with results for reproducibility. |
| `files` | array | Manifest of files to process. |
| `files[].file_id` | number | The `resume_file.id` primary key. Used to link results back. |
| `files[].storage_key` | string | The R2 object key to fetch the file. |
| `files[].original_name` | string | Original filename for logging and display. |
| `files[].mime_type` | string | MIME type (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`). |
| `files[].size` | number | File size in bytes. |

### 5.2 Progress Callback (Worker -> Elysia)

`POST {callback_url}` with `Authorization: Bearer {callback_secret}`.

```json
{
  "type": "progress",
  "session_id": "019450a1-b2c3-7def-8901-234567890abc",
  "job_id": "019450a1-ffff-7def-8901-234567890abc",
  "status": "running",
  "processed_files": 3,
  "total_files": 10,
  "current_file": "resume-jane-smith.pdf"
}
```

### 5.3 Completion Callback (Worker -> Elysia)

`POST {callback_url}` with `Authorization: Bearer {callback_secret}`.

```json
{
  "type": "completion",
  "session_id": "019450a1-b2c3-7def-8901-234567890abc",
  "job_id": "019450a1-ffff-7def-8901-234567890abc",
  "status": "completed",
  "pipeline_version": "0.1.0",
  "processed_files": 10,
  "total_files": 10,
  "results": [
    {
      "file_id": 42,
      "candidate_name": "John Doe",
      "candidate_email": "john.doe@email.com",
      "candidate_phone": "+1-555-0123",
      "raw_text": "John Doe\nSenior Software Engineer\n...",
      "parsed_profile": {
        "name": "John Doe",
        "email": "john.doe@email.com",
        "phone": "+1-555-0123",
        "skills": ["Python", "Kubernetes", "PostgreSQL", "AWS", "Docker"],
        "work_history": [
          {
            "title": "Senior Software Engineer",
            "company": "Acme Corp",
            "start_date": "2020-03",
            "end_date": null,
            "description": "Led backend team of 5 engineers..."
          }
        ],
        "education": [
          {
            "degree": "B.S. Computer Science",
            "institution": "MIT",
            "year": 2018
          }
        ],
        "certifications": ["AWS Solutions Architect"],
        "projects": [],
        "total_experience_years": 6.5
      },
      "overall_score": 87.3,
      "score_breakdown": {
        "text_similarity": {
          "score": 82.1,
          "weight": 0.4,
          "description": "TF-IDF cosine similarity between resume and job description"
        },
        "skill_match": {
          "score": 90.0,
          "weight": 0.35,
          "matched": ["Python", "Kubernetes", "AWS"],
          "missing": ["Terraform"],
          "extra": ["Docker", "PostgreSQL"],
          "description": "Ratio of required skills found in resume"
        },
        "experience_fit": {
          "score": 95.0,
          "weight": 0.25,
          "required_years": 5,
          "candidate_years": 6.5,
          "description": "Experience duration relative to requirement"
        }
      },
      "summary": "John Doe is a Senior Software Engineer with 6.5 years of experience specializing in Python, Kubernetes, and AWS. Holds a B.S. in Computer Science from MIT and an AWS Solutions Architect certification. Currently leading a backend team at Acme Corp."
    }
  ]
}
```

### 5.4 Error Callback (Worker -> Elysia)

`POST {callback_url}` with `Authorization: Bearer {callback_secret}`.

```json
{
  "type": "error",
  "session_id": "019450a1-b2c3-7def-8901-234567890abc",
  "job_id": "019450a1-ffff-7def-8901-234567890abc",
  "status": "failed",
  "error": "Failed to fetch file from R2: AccessDenied",
  "processed_files": 3,
  "total_files": 10,
  "partial_results": []
}
```

If partial results are available (some files succeeded before the failure), they are included in `partial_results` using the same format as the completion callback's `results` array. The Elysia handler may choose to store partial results or discard them.

---

## 6. Pipeline Stages

### 6.1 Stage 1: Text Extraction

**Input**: Raw file bytes fetched from R2.
**Output**: Plain text string.
**Libraries**: `pymupdf` (PyMuPDF) for PDF, `python-docx` for DOCX, direct read for TXT.

#### PDF extraction (PyMuPDF)

```python
import pymupdf

def extract_pdf(file_bytes: bytes) -> str:
    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text.strip()
```

PyMuPDF is chosen for speed and accuracy. It handles most resume PDFs well, including multi-column layouts (it extracts in reading order). It does not perform OCR; scanned-image PDFs will produce empty or minimal text. OCR support (e.g., via `pymupdf` + Tesseract) is deferred to a later phase.

#### DOCX extraction (python-docx)

```python
from docx import Document
from io import BytesIO

def extract_docx(file_bytes: bytes) -> str:
    doc = Document(BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)
```

This extracts paragraph text only. Tables, headers/footers, and text boxes are not extracted in v1. Most resumes use paragraph-based layouts, so this is sufficient for the initial implementation.

#### TXT extraction

```python
def extract_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="replace").strip()
```

#### Dispatcher

```python
def extract_text(file_bytes: bytes, mime_type: str) -> str:
    if mime_type == "application/pdf":
        return extract_pdf(file_bytes)
    elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return extract_docx(file_bytes)
    elif mime_type == "text/plain":
        return extract_txt(file_bytes)
    else:
        raise ValueError(f"Unsupported MIME type: {mime_type}")
```

#### Edge cases

- **Empty text**: If extraction produces an empty string (e.g., scanned PDF), the file is marked with `overall_score: 0` and `summary: "Could not extract text from this document."`. Parsing and scoring are skipped.
- **Encoding errors**: UTF-8 decoding uses `errors="replace"` to substitute unreadable bytes rather than crashing.
- **Corrupted files**: PyMuPDF and python-docx raise exceptions on malformed files. These are caught and the file is marked as failed with the error message.

### 6.2 Stage 2: Structured Parsing

**Input**: Raw text string.
**Output**: `CandidateProfile` (Pydantic model).
**Libraries**: `spacy` with `en_core_web_md` model.

This stage extracts structured candidate information from unstructured resume text. It combines spaCy's NER pipeline with regex patterns and section-based heuristics.

#### spaCy model

The `en_core_web_md` model (43MB) provides:
- Named Entity Recognition (PERSON, ORG, DATE, GPE, etc.)
- Part-of-speech tagging
- Dependency parsing
- Word vectors (300-dimensional, needed for similarity computations)

The `_sm` model (12MB) lacks word vectors. The `_lg` model (741MB) provides marginal accuracy improvements that do not justify the size for this use case.

#### Extraction strategy

**Name**: First `PERSON` entity found near the top of the document (within the first 5 lines or 500 characters). Falls back to the first line of text if no PERSON entity is found.

**Email**: Regex pattern `r'[\w.+-]+@[\w-]+\.[\w.-]+'` applied globally. First match is primary email.

**Phone**: Regex pattern `r'[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{7,15}'` applied globally. First match is primary phone.

**Skills**: A two-pronged approach:
1. **Taxonomy matching**: Compare extracted tokens against a curated skills taxonomy (`data/skills_taxonomy.json`). This file contains a flat list of known technical and professional skills (e.g., `["Python", "JavaScript", "React", "Project Management", "Agile", ...]`). Matching is case-insensitive and supports multi-word skills.
2. **NER-based**: Extract `ORG`, `PRODUCT`, and `WORK_OF_ART` entities as potential skill/tool mentions. Filter against a stoplist to remove false positives (company names, universities, etc.).

**Work history**: Section-based extraction. Identify the "Experience" or "Work History" section by header keywords (`experience`, `employment`, `work history`, `professional experience`). Within that section:
- Extract job titles (heuristic: lines with title-case words near date ranges).
- Extract company names (`ORG` entities within the section).
- Extract date ranges (regex: `MMM YYYY - MMM YYYY`, `MM/YYYY - Present`, etc.).
- Extract descriptions (remaining text between entries).

**Education**: Same section-based approach, looking for headers like `education`, `academic`, `qualifications`. Extract:
- Degree (pattern matching: `B.S.`, `M.S.`, `PhD`, `Bachelor`, `Master`, etc.).
- Institution (`ORG` entities within the section).
- Year (4-digit numbers in the range 1970-2030).

**Total experience years**: Computed from work history date ranges. Sum of all non-overlapping employment periods. If dates cannot be parsed, this field is `null`.

#### CandidateProfile schema

```python
from pydantic import BaseModel

class WorkEntry(BaseModel):
    title: str | None = None
    company: str | None = None
    start_date: str | None = None      # "YYYY-MM" or "YYYY"
    end_date: str | None = None        # "YYYY-MM", "YYYY", or null (current)
    description: str | None = None

class EducationEntry(BaseModel):
    degree: str | None = None
    institution: str | None = None
    year: int | None = None

class CandidateProfile(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    skills: list[str] = []
    work_history: list[WorkEntry] = []
    education: list[EducationEntry] = []
    certifications: list[str] = []
    projects: list[str] = []
    total_experience_years: float | None = None
```

#### Accuracy expectations

Resume parsing from unstructured text is inherently imprecise. For v1, the goal is:
- **Name**: ~90% accuracy (PERSON NER is reliable when present).
- **Email/Phone**: ~98% accuracy (regex-based, well-defined patterns).
- **Skills**: ~70-80% recall against the taxonomy. Precision depends on taxonomy quality.
- **Work history**: ~60-70% accuracy for structured extraction. Many resumes use non-standard formats.
- **Education**: ~75% accuracy.

These numbers are estimates. Actual accuracy should be measured against a manually labeled test set once the pipeline is running.

### 6.3 Stage 3: Scoring

**Input**: Raw text, `CandidateProfile`, job description text.
**Output**: `ScoringResult` (Pydantic model).
**Libraries**: `scikit-learn` (TF-IDF vectorizer, cosine similarity).

The scoring stage produces a relevance score from 0 to 100 for each resume against the job description. The score is a weighted combination of three sub-scores.

#### Sub-score 1: Text Similarity (weight: 0.40)

**Method**: TF-IDF cosine similarity.

1. Combine the job description and all resume texts into a corpus.
2. Fit a `TfidfVectorizer` on the corpus (parameters: `max_features=5000`, `stop_words="english"`, `ngram_range=(1, 2)`).
3. Transform the job description and each resume text into TF-IDF vectors.
4. Compute cosine similarity between the job description vector and each resume vector.
5. Scale to 0-100.

**Why TF-IDF over embeddings**: TF-IDF is deterministic, fast, requires no model downloads beyond scikit-learn, and produces interpretable results (you can inspect which terms contributed most). Semantic embedding models (sentence-transformers) would improve accuracy for paraphrased content but add a 400MB+ model dependency. This is a candidate for a v2 upgrade.

**Corpus scope**: The vectorizer is fit per-session (one job description + N resumes). This means the vocabulary and IDF weights are specific to each session, which is appropriate since resumes within a session are compared against the same job.

#### Sub-score 2: Skill Match (weight: 0.35)

**Method**: Set intersection between required skills and candidate skills.

1. Extract "required skills" from the job description using the same taxonomy-matching logic from the parse stage.
2. Compare against the candidate's extracted skills.
3. Compute: `score = (matched / required) * 100`, capped at 100.

If no skills can be extracted from the job description (e.g., vague JD), this sub-score defaults to 50 (neutral) and its weight is redistributed to text similarity.

The breakdown includes:
- `matched`: skills found in both JD and resume.
- `missing`: skills in JD but not in resume.
- `extra`: skills in resume but not in JD (informational, not penalized).

#### Sub-score 3: Experience Fit (weight: 0.25)

**Method**: Compare candidate's total experience years against the job's implied requirement.

1. Extract years-of-experience from the job description using regex patterns (e.g., `"5+ years"`, `"3-5 years of experience"`, `"minimum 7 years"`).
2. Compare against `CandidateProfile.total_experience_years`.
3. Scoring curve:
   - Exact match or exceeds requirement: 100.
   - Within 1 year below: 80.
   - Within 2 years below: 60.
   - More than 2 years below: 40.
   - Cannot determine (no dates parseable): 50 (neutral).

If no experience requirement can be extracted from the JD, this sub-score defaults to 50 and its weight is redistributed.

#### Final score

```
overall_score = (text_similarity * w1) + (skill_match * w2) + (experience_fit * w3)
```

Where `w1 + w2 + w3 = 1.0`. Default weights: `w1=0.40, w2=0.35, w3=0.25`.

Weights are defined as constants in the pipeline configuration and can be adjusted without code changes.

#### ScoringResult schema

```python
class SubScore(BaseModel):
    score: float                  # 0-100
    weight: float                 # 0.0-1.0
    description: str              # Human-readable explanation
    details: dict | None = None   # Sub-score-specific data (matched skills, etc.)

class ScoringResult(BaseModel):
    overall_score: float          # 0-100, weighted combination
    breakdown: dict[str, SubScore]  # keyed by "text_similarity", "skill_match", "experience_fit"
```

### 6.4 Stage 4: Summarization

**Input**: `CandidateProfile`, `ScoringResult`.
**Output**: Plain text summary string (2-3 sentences).

This stage generates a concise, recruiter-friendly summary of each candidate. It uses template-based generation, not an LLM.

#### Template logic

```
"{name} is a {current_or_most_recent_title} with {experience_years} years of experience
specializing in {top_3_skills}. {education_sentence}. {highlight_sentence}."
```

**Sentence construction rules**:

1. **Opening**: `"{name} is a {title} with {years} years of experience specializing in {skills}."`
   - `name`: from parsed profile, or "This candidate" if not extracted.
   - `title`: most recent work history title, or "professional" if not available.
   - `years`: `total_experience_years`, omitted if null.
   - `skills`: top 3 skills by frequency/position, comma-separated.

2. **Education** (if available): `"Holds a {degree} from {institution}."`
   - Uses the highest-level degree found.

3. **Highlight** (conditional):
   - If certifications exist: `"Certified in {certifications}."`
   - If experience exceeds JD requirement by 2+ years: `"Brings significantly more experience than required."`
   - If skill match > 90%: `"Strong alignment with required skill set."`

**Maximum length**: 500 characters. Truncate with ellipsis if exceeded.

---

## 7. Database Schema Additions

Two new tables are added to `packages/shared/src/schemas/index.ts`.

### 7.1 `pipeline_job`

Tracks each pipeline execution. One row per profiling session start attempt.

```
pipeline_job
├── id                  UUID PK, default randomUUIDv7()
├── session_id          UUID FK -> profiling_session.id, ON DELETE CASCADE
├── status              VARCHAR(32), enum: "queued" | "running" | "completed" | "failed"
├── pipeline_version    VARCHAR(50), NOT NULL
├── total_files         INTEGER, NOT NULL
├── processed_files     INTEGER, NOT NULL, default 0
├── error_message       TEXT, nullable
├── queued_at           TIMESTAMP WITH TZ, default now()
├── started_at          TIMESTAMP WITH TZ, nullable
├── completed_at        TIMESTAMP WITH TZ, nullable
├── created_at          TIMESTAMP WITH TZ, default now()
├── updated_at          TIMESTAMP WITH TZ, default now(), $onUpdate
│
├── INDEX on session_id
└── INDEX on status
```

**Rationale**: Separated from `profiling_session` because a session might be retried (multiple jobs for one session). The `pipeline_job` provides granular execution tracking without cluttering the session table.

### 7.2 `candidate_result`

Stores the pipeline output for each resume in a session.

```
candidate_result
├── id                  UUID PK, default randomUUIDv7()
├── session_id          UUID FK -> profiling_session.id, ON DELETE CASCADE
├── file_id             BIGINT FK -> resume_file.id, ON DELETE CASCADE
├── job_id              UUID FK -> pipeline_job.id, ON DELETE CASCADE
├── candidate_name      VARCHAR(255), nullable
├── candidate_email     VARCHAR(320), nullable
├── candidate_phone     VARCHAR(50), nullable
├── raw_text            TEXT, NOT NULL
├── parsed_profile      JSONB, NOT NULL
├── overall_score       NUMERIC(5,2), NOT NULL
├── score_breakdown     JSONB, NOT NULL
├── summary             TEXT, NOT NULL
├── skills_matched      JSONB, NOT NULL, default '[]'
├── pipeline_version    VARCHAR(50), NOT NULL
├── created_at          TIMESTAMP WITH TZ, default now()
│
├── INDEX on session_id
├── INDEX on file_id
├── INDEX on overall_score
├── UNIQUE on (session_id, file_id)
```

**Column notes**:

- `raw_text`: Stored in the DB (not R2) because it is needed for full-text search across candidates. Resume PDFs are typically small (< 50KB of text). For 50 resumes per session, this is ~2.5MB per session, which is acceptable in Postgres.
- `parsed_profile`: The full `CandidateProfile` as JSONB. Enables flexible querying without schema migrations when fields are added.
- `score_breakdown`: The full `ScoringResult.breakdown` as JSONB. Contains per-criterion scores, weights, and explanations.
- `skills_matched`: Denormalized array of matched skill names, stored separately for fast filtering (`WHERE skills_matched ? 'Python'`).
- `UNIQUE (session_id, file_id)`: Prevents duplicate results for the same file in the same session. If a session is re-run, old results must be deleted first (or the job creates new `candidate_result` rows linked to a new `pipeline_job`).

### 7.3 Schema migration notes

- These tables reference existing tables (`profiling_session`, `resume_file`) with foreign keys.
- The `profiling_session.status` enum does not need changes; `ready | processing | completed | failed` already covers the pipeline lifecycle.
- No changes to existing tables are required.

---

## 8. API Surface Changes

### 8.1 Modified: `POST /api/v2/sessions/:id/start`

**Current behavior**: Sets session status to `processing`. Has a `// TODO: Trigger actual profiling service here.` comment.

**New behavior**:

1. Validate session ownership and status (`ready`).
2. Update `profiling_session.status` to `processing`.
3. Query the session's file manifest.
4. Insert a `pipeline_job` row with status `queued`.
5. Publish a job message to RabbitMQ (see Section 5.1).
6. Return `{ status: "ok", message: "Profiling started", jobId: "<uuid>" }`.

### 8.2 New: `POST /api/internal/pipeline/callback`

**Purpose**: Receives progress, completion, and error callbacks from the Celery worker.

**Authentication**: `Authorization: Bearer <PIPELINE_CALLBACK_SECRET>`. This is a shared secret, not a user token. The route does NOT use the `auth: true` macro.

**Request body**: One of the three callback types defined in Section 5 (progress, completion, error), discriminated by the `type` field.

**Behavior by type**:

- `type: "progress"`: Update `pipeline_job.processed_files`, `pipeline_job.status` to `running`, `pipeline_job.started_at` (if not set).
- `type: "completion"`: Insert `candidate_result` rows for each result. Update `pipeline_job` to `completed`. Update `profiling_session.status` to `completed`.
- `type: "error"`: Update `pipeline_job` to `failed` with `error_message`. Update `profiling_session.status` to `failed` with `error_message`. Optionally store `partial_results`.

**Response**: `{ status: "ok" }` on success, or `4xx` with error details.

**Idempotency**: The handler must be safe to call multiple times for the same job (in case of retries). It uses `pipeline_job.status` as a guard: if the job is already `completed` or `failed`, the callback is acknowledged but ignored.

### 8.3 New: `GET /api/v2/sessions/:id/results`

**Purpose**: Fetch scored candidate results for a completed session.

**Authentication**: User auth (`auth: true`). Session must belong to the authenticated user.

**Query parameters**:
- `sort`: `score_desc` (default), `score_asc`, `name_asc`, `name_desc`.
- `min_score`: number (optional), filter candidates below this score.
- `skill`: string (optional, repeatable), filter candidates who matched this skill.

**Response**:

```json
{
  "session": { "id": "...", "name": "...", "status": "completed", ... },
  "results": [
    {
      "id": "result-uuid",
      "file_id": 42,
      "original_name": "resume-john-doe.pdf",
      "candidate_name": "John Doe",
      "candidate_email": "john@example.com",
      "overall_score": 87.3,
      "skills_matched": ["Python", "Kubernetes", "AWS"],
      "summary": "John Doe is a Senior Software Engineer...",
      "score_breakdown": { ... }
    }
  ],
  "total": 10
}
```

### 8.4 New: `GET /api/v2/sessions/:id/results/:resultId`

**Purpose**: Fetch the full detail for a single candidate result, including the complete parsed profile and raw text.

**Response**: The full `candidate_result` row, including `parsed_profile` and `raw_text`.

### 8.5 New: `GET /api/v2/sessions/:id/export`

**Purpose**: Export session results as CSV or JSON.

**Query parameters**:
- `format`: `csv` or `json` (default: `json`).
- Same filter parameters as the results endpoint.

**CSV columns**: `rank, candidate_name, candidate_email, candidate_phone, overall_score, text_similarity_score, skill_match_score, experience_fit_score, skills_matched, summary`.

---

## 9. Infrastructure

### 9.1 RabbitMQ (CloudAMQP)

**Service**: CloudAMQP managed RabbitMQ.
**Plan**: Little Lemur (free) for development; upgrade as needed for production.
**Connection**: AMQP URL provided as `CLOUDAMQP_URL` environment variable, in the format `amqps://user:pass@host/vhost`.

**Queue configuration**:
- Queue name: `profiling.jobs`
- Durable: `true` (survives broker restart)
- Delivery mode: persistent (messages survive broker restart)
- Prefetch count: `1` per worker (process one job at a time per worker)

Both the Elysia API (publisher) and the Celery worker (consumer) connect to the same CloudAMQP instance.

**Elysia publishes to RabbitMQ** using the `amqplib` npm package (or `rascal` for higher-level abstractions). The message must be formatted as a Celery-compatible task message. Celery's wire protocol is documented and stable:

```json
{
  "id": "unique-task-id",
  "task": "pipeline.process_session",
  "args": [{ ...job_payload }],
  "kwargs": {},
  "retries": 0,
  "eta": null
}
```

The message properties must include:
- `content_type`: `application/json`
- `content_encoding`: `utf-8`
- `correlation_id`: the task ID (same as `body.id`)
- `reply_to`: (empty, no result backend needed initially)

### 9.2 Docker Compose (local development)

A `docker-compose.yml` at the repo root for local development. In production, CloudAMQP replaces the local RabbitMQ container.

```yaml
services:
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"     # AMQP
      - "15672:15672"   # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: resumemo
      RABBITMQ_DEFAULT_PASS: resumemo
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  pipeline-worker:
    build: ./services/pipeline
    depends_on:
      - rabbitmq
    env_file: ./services/pipeline/.env
    environment:
      CELERY_BROKER_URL: amqp://resumemo:resumemo@rabbitmq:5672//
    volumes:
      - ./services/pipeline:/app
    command: celery -A worker worker --loglevel=info --queues=profiling.jobs --concurrency=2

volumes:
  rabbitmq_data:
```

### 9.3 Python environment

**Python version**: 3.12+
**Package manager**: `uv` (fast, Rust-based pip replacement). Falls back to `pip` if `uv` is unavailable.
**Virtual environment**: Managed by `uv` inside `services/pipeline/`.

The `pyproject.toml` defines all dependencies. No `requirements.txt`.

---

## 10. Project Layout

```
services/
└── pipeline/
    ├── pyproject.toml              # Project metadata, dependencies, scripts
    ├── uv.lock                     # Lockfile (auto-generated by uv)
    ├── Dockerfile                  # Production container image
    ├── .env.example                # Required environment variables template
    ├── .python-version             # Pin: 3.12
    ├── worker.py                   # Celery app definition + task registration
    ├── celeryconfig.py             # Celery settings (broker URL, serializer, etc.)
    ├── pipeline/
    │   ├── __init__.py
    │   ├── extract.py              # Stage 1: text extraction
    │   ├── parse.py                # Stage 2: structured parsing (spaCy)
    │   ├── score.py                # Stage 3: TF-IDF scoring
    │   ├── summarize.py            # Stage 4: template-based summaries
    │   ├── storage.py              # R2/S3 file fetching (boto3)
    │   ├── callback.py             # HTTP POST to Elysia callback endpoint
    │   ├── models.py               # Pydantic models (CandidateProfile, ScoringResult, etc.)
    │   └── config.py               # Pipeline constants (weights, thresholds, version)
    ├── data/
    │   └── skills_taxonomy.json    # Curated skills list for matching
    └── tests/
        ├── conftest.py             # Shared fixtures (sample texts, profiles)
        ├── test_extract.py         # Extraction tests with sample files
        ├── test_parse.py           # Parsing tests with known resumes
        ├── test_score.py           # Scoring tests with controlled inputs
        ├── test_summarize.py       # Summary generation tests
        └── fixtures/
            ├── sample-resume.pdf   # Test PDF
            ├── sample-resume.docx  # Test DOCX
            └── sample-resume.txt   # Test TXT
```

**Not in this directory**: Database schemas (stay in `packages/shared/`), API routes (stay in `api/src/`), frontend components (stay in `web/src/`).

---

## 11. Configuration and Environment

### 11.1 Pipeline service (`services/pipeline/.env`)

```bash
# RabbitMQ (CloudAMQP)
CELERY_BROKER_URL=amqps://user:pass@host.cloudamqp.com/vhost

# Cloudflare R2 (for fetching resume files)
R2_ENDPOINT_URL=https://account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=resumemo

# Callback auth
PIPELINE_CALLBACK_SECRET=shared-secret-here

# Pipeline settings (optional, have defaults)
PIPELINE_VERSION=0.1.0
SCORING_WEIGHT_TEXT_SIMILARITY=0.40
SCORING_WEIGHT_SKILL_MATCH=0.35
SCORING_WEIGHT_EXPERIENCE_FIT=0.25
```

### 11.2 Elysia API (additions to existing `.env`)

```bash
# RabbitMQ (for publishing jobs)
CLOUDAMQP_URL=amqps://user:pass@host.cloudamqp.com/vhost

# Pipeline callback auth
PIPELINE_CALLBACK_SECRET=shared-secret-here
```

### 11.3 Shared secret

`PIPELINE_CALLBACK_SECRET` is a random string shared between the API and the pipeline service. It authenticates callback requests so that only the pipeline can update job/session state. Generate with:

```bash
openssl rand -base64 32
```

---

## 12. Error Handling and Retries

### 12.1 Celery retry policy

```python
@celery.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,          # 60 seconds between retries
    acks_late=True,                   # Don't ack until task completes
    reject_on_worker_lost=True,       # Re-queue if worker crashes mid-task
)
def process_session(self, payload: dict):
    try:
        ...
    except RecoverableError as e:
        # Network errors, R2 timeouts, transient failures
        self.retry(exc=e)
    except Exception as e:
        # Unrecoverable: bad file format, parsing crash, etc.
        send_error_callback(payload, str(e))
        raise  # Let Celery mark the task as failed
```

**`acks_late=True`**: The message is only acknowledged after the task completes successfully. If the worker crashes, the message returns to the queue and is picked up by another worker.

**`reject_on_worker_lost=True`**: If the worker process is killed (OOM, SIGKILL), the message is rejected and re-queued.

### 12.2 Per-file error isolation

If one file in a batch fails (e.g., corrupt PDF), the pipeline:
1. Records the error for that file.
2. Continues processing remaining files.
3. Sends a completion callback with successful results and per-file error annotations.

The session is marked `completed` (not `failed`) if at least one file succeeded. The UI shows which files had errors.

### 12.3 Callback failure

If the worker cannot reach the Elysia callback endpoint:
1. Retry the HTTP POST 3 times with exponential backoff (1s, 5s, 15s).
2. If all retries fail, log the error and let the Celery task fail.
3. The Celery retry policy (Section 12.1) will re-queue the entire task.
4. Since the callback handler is idempotent (Section 8.2), re-processing and re-posting results is safe.

### 12.4 Stale jobs

A background check (either a periodic Celery beat task or a cron-like endpoint) should detect jobs stuck in `queued` or `running` for more than a configurable timeout (default: 30 minutes). These jobs are marked `failed` with a timeout error message. This prevents sessions from being stuck in `processing` indefinitely if a worker disappears without sending a callback.

---

## 13. Security

### 13.1 Callback authentication

The internal callback endpoint is not behind user auth. Instead, it validates:
1. `Authorization: Bearer <PIPELINE_CALLBACK_SECRET>` header matches the configured secret.
2. The `session_id` and `job_id` in the payload correspond to an existing, active job.

This is sufficient for an internal service-to-service call. For a stricter setup, HMAC request signing can be added later.

### 13.2 R2 access

The pipeline worker uses its own R2 credentials (potentially the same keys as the API, or dedicated read-only keys). The worker only needs `s3:GetObject` permission on the resume bucket. It never uploads or deletes files.

### 13.3 Network isolation

In production, the callback endpoint should ideally be restricted to the worker's IP range or internal network. In development, it runs on localhost. CloudAMQP connections use TLS (`amqps://`).

### 13.4 Sensitive data

Resume text contains PII (names, emails, phones, addresses). The pipeline processes this data in memory and sends it to the API via HTTPS callback. It does not persist data to disk (aside from temp files during extraction, which are cleaned up). Logs should avoid printing raw resume text; use truncated previews with redacted emails/phones.

---

## 14. Versioning and Reproducibility

### 14.1 Pipeline version

Every `candidate_result` and `pipeline_job` row stores a `pipeline_version` string (semver, e.g., `0.1.0`). This version is defined in `pipeline/config.py` and included in every callback payload.

### 14.2 When to increment

- **Patch** (0.1.x): Bug fixes, taxonomy updates, threshold tuning.
- **Minor** (0.x.0): New extraction capabilities, scoring formula changes, new fields in parsed profile.
- **Major** (x.0.0): Breaking changes to the callback contract or scoring methodology.

### 14.3 Reproducibility

Given the same pipeline version and the same input files + job description, the pipeline should produce identical results. This is achievable because:
- TF-IDF is deterministic.
- spaCy NER is deterministic for a given model version.
- No randomness or LLM calls in the pipeline.

The spaCy model version should also be recorded (in `pipeline/config.py`) and logged, but is not stored per-result since it changes very rarely.

---

## 15. Observability

### 15.1 Structured logging

The pipeline uses Python's `logging` module with JSON-formatted output. Every log line includes:
- `job_id`
- `session_id`
- `stage` (extract, parse, score, summarize)
- `file_id` (when processing a specific file)
- `duration_ms` (for performance tracking)

### 15.2 Metrics to track

| Metric | Source | Purpose |
|--------|--------|---------|
| Jobs queued | Elysia (on publish) | Queue depth monitoring |
| Jobs completed/failed | Callback handler | Success rate |
| Processing time per job | Worker (start to callback) | Performance baseline |
| Processing time per file | Worker (per stage) | Identify slow stages |
| Queue wait time | Worker (received - queued_at) | Capacity planning |
| Extraction failures | Worker (per file) | Data quality |
| Callback failures | Worker (HTTP errors) | Connectivity issues |

### 15.3 Health check

The Celery worker exposes health via `celery inspect ping`. For containerized deployments, a simple health check script:

```python
# healthcheck.py
import sys
from celery import Celery
app = Celery()
app.config_from_object("celeryconfig")
try:
    app.control.ping(timeout=5)
    sys.exit(0)
except:
    sys.exit(1)
```

---

## 16. Implementation Phases

### Phase 1: Foundation

Set up the project skeleton, infrastructure connections, and the job lifecycle without any actual ML logic.

**Deliverables**:
- `services/pipeline/` directory with `pyproject.toml`, `Dockerfile`, `worker.py`, `celeryconfig.py`.
- Celery app that connects to CloudAMQP and consumes from `profiling.jobs`.
- A no-op task (`process_session`) that receives a job, logs it, waits 5 seconds, and POSTs a mock completion callback to Elysia.
- `amqplib` integration in Elysia to publish Celery-compatible messages.
- Internal callback endpoint in Elysia with shared-secret auth.
- `pipeline_job` and `candidate_result` Drizzle schema definitions.
- `docker-compose.yml` for local RabbitMQ.
- Updated `/:id/start` route that publishes a real job to the queue.

**Validation**: Start a session, see it move through `ready -> processing -> completed` via the mock worker.

### Phase 2: Text Extraction

**Deliverables**:
- `pipeline/extract.py` with PDF, DOCX, and TXT extractors.
- `pipeline/storage.py` with R2 file fetching.
- Integration into the task: fetch files from R2, extract text, include `raw_text` in callback results.
- Unit tests with fixture files.

**Validation**: Process a session with real resume files and verify extracted text appears in `candidate_result.raw_text`.

### Phase 3: Structured Parsing

**Deliverables**:
- `pipeline/parse.py` with spaCy NER and section-based extraction.
- `pipeline/models.py` with all Pydantic models.
- `data/skills_taxonomy.json` with initial curated skills list.
- Integration into the task: parse extracted text, include `parsed_profile` in results.
- Unit tests.

**Validation**: Process resumes and verify structured data (names, skills, work history) appears in `candidate_result.parsed_profile`.

### Phase 4: Scoring

**Deliverables**:
- `pipeline/score.py` with TF-IDF cosine similarity, skill matching, and experience fit.
- `pipeline/config.py` with scoring weights.
- Integration into the task: score each resume against the job description.
- Unit tests with controlled inputs and expected score ranges.

**Validation**: Process a session and verify scores are reasonable (relevant resumes score higher than irrelevant ones).

### Phase 5: Summarization and Full Integration

**Deliverables**:
- `pipeline/summarize.py` with template-based summary generation.
- Full end-to-end task: extract -> parse -> score -> summarize -> callback.
- Progress callbacks during processing.
- Per-file error isolation.
- Results API endpoints (`GET /:id/results`, `GET /:id/results/:resultId`, `GET /:id/export`).

**Validation**: Full end-to-end test with a batch of resumes. Verify all data appears correctly in the API responses.

### Phase 6: Frontend

**Deliverables**:
- Session results page showing ranked candidates.
- Candidate detail view with parsed profile, score breakdown, and summary.
- Export functionality (CSV/JSON download).
- Processing progress indicator.
- Error state display for failed files.

**Validation**: Recruiter can upload resumes, start profiling, see progress, view ranked results, and export.

---

## 17. Open Questions and Future Work

### Deferred decisions

| Question | Current stance | Revisit when |
|----------|----------------|--------------|
| OCR for scanned PDFs | Not supported in v1. Scanned PDFs produce empty text and score 0. | User feedback indicates many scanned resumes. |
| Semantic embeddings vs TF-IDF | TF-IDF for v1. Simpler, faster, deterministic. | Scoring accuracy needs improvement. Consider `sentence-transformers` or spaCy vectors. |
| Custom-trained NER model | Using off-the-shelf `en_core_web_md`. | Parsing accuracy is insufficient. Train on labeled resume data. |
| Multi-language support | English only in v1. | International user base requires it. Add language detection + multilingual spaCy models. |
| Celery result backend | Not used. Results go through HTTP callback. | Need task result inspection or monitoring dashboards like Flower. |
| Real-time progress (WebSocket/SSE) | Frontend polls for status. | Polling latency is unacceptable. Add SSE or WebSocket for live progress. |
| Partial result storage on failure | Currently: partial results may be included in error callback but storage is optional. | Define clear policy once failure patterns are observed. |
| Skill taxonomy maintenance | Manual JSON file. | Build admin UI for taxonomy management, or auto-expand using NLP. |
| Scoring weight customization per job | Weights are global constants. | Recruiters want to emphasize different criteria per job posting. |
| Re-run / re-score a session | Not supported. Starting a new profiling job on an already-completed session is undefined. | Add explicit re-run flow that creates a new `pipeline_job` and replaces `candidate_result` rows. |

### Future enhancements (post-v1)

- **Candidate deduplication**: Detect the same candidate across sessions (by email or name+phone).
- **Bias detection**: Analyze scoring patterns for demographic bias indicators.
- **Model evaluation**: Compare pipeline versions by running both on the same input and measuring score correlation.
- **Batch prioritization**: Process urgent/small sessions before large ones (queue priority).
- **Caching**: Skip re-extraction for files already processed (keyed by file fingerprint + pipeline version).

---

## 18. Decision Log

Decisions made during planning, with rationale.

| # | Decision | Choice | Alternatives considered | Rationale |
|---|----------|--------|-------------------------|-----------|
| 1 | AI approach | Classical NLP + ML | LLM-based, Hybrid | Full control, no API costs, no external dependency for core scoring, works offline. |
| 2 | Pipeline language | Python | TypeScript (Bun) | Best-in-class ML/NLP ecosystem (spaCy, scikit-learn, PyMuPDF). Not practical in TS. |
| 3 | Project location | `services/pipeline/` | `packages/pipeline/`, separate repo | Clean separation from the Bun workspace. Within monorepo for co-versioning. Not under `packages/` since it is not a Bun workspace member. |
| 4 | Job queue | Celery + RabbitMQ (CloudAMQP) | BullMQ, Dramatiq, Procrastinate | Celery is the standard Python task queue. RabbitMQ via CloudAMQP provides managed infrastructure with TLS, monitoring, and persistence. |
| 5 | Broker | RabbitMQ (CloudAMQP) | Redis, SQS | Managed service, no self-hosting. AMQP is more feature-rich than Redis pub/sub (persistence, acknowledgments, dead-letter queues). |
| 6 | Worker model | Pure Celery consumer (no HTTP server) | FastAPI + Celery, HTTP-only | Simplest architecture. No HTTP surface to secure or deploy for the worker. Single responsibility: consume and process. |
| 7 | API-to-worker communication | Elysia publishes to RabbitMQ directly | HTTP call to worker, shared database polling | Direct publishing is the natural Celery pattern. No intermediary needed. |
| 8 | Result delivery | HTTP callback from worker to Elysia | Worker writes to DB directly, shared R2 artifacts | Centralizes all DB writes in the API. Worker doesn't need DB credentials. Clear ownership. Elysia can validate, transform, and ACL-check before persisting. |
| 9 | Text extraction | PyMuPDF + python-docx | Apache Tika, pdfplumber | Pure Python, no Java dependency. PyMuPDF is the fastest PDF library. python-docx covers DOCX well. |
| 10 | NLP framework | spaCy (`en_core_web_md`) | HuggingFace Transformers, NLTK | Production-grade, fast, includes NER + word vectors. NLTK lacks modern NER. Transformers are overkill and require GPU for speed. |
| 11 | Scoring method | TF-IDF cosine similarity | Sentence embeddings, supervised classifier, keyword rules | No training data required. Deterministic. Fast. Good baseline. Embeddings are a clear upgrade path. |
| 12 | Summarization | Template-based | LLM-generated | Deterministic, no API cost, instant. Quality is acceptable for structured data. LLM summaries are a future upgrade. |
| 13 | DB writes | API-only (via callback) | Worker writes to DB | Single source of truth for schema and access control. Avoids sharing DB credentials with the worker. Simplifies migrations. |
