# Pipeline Contract and Official AI Implementation

This document is the current source of truth for the Resumemo profiling pipeline.

It describes two things separately:

- the stable v2 API/worker boundary
- the official research-backed Python worker implementation in `services/pipeline/`

If live code conflicts with this file, fix this file in the same change.

## Stable Boundary

The active pipeline surface is the `/api/v2` profiling flow:

- queue: `profiling.jobs`
- task name: `pipeline.process_session`
- queue payload fields: `session_id`, `run_id`, `job_description`, and `files[]`
- file manifest fields: `file_id`, `storage_key`, `original_name`
- callback endpoint: `POST /api/internal/pipeline/callback`
- callback auth: shared secret in the header named by `PIPELINE_SECRET_HEADER_NAME`, with value `PIPELINE_CALLBACK_SECRET`
- callback types: `completion` and `error`
- callback run awareness: callbacks only apply when payload `run_id` matches the session's active run
- session status model: `processing`, `retrying`, `completed`, `failed`
- result persistence: candidate results are stored against the active run; stale callbacks are ignored
- JD persistence: API sessions reference `job_description_template`; the queue still receives the current JD text as `job_description`

There is no mounted `/api/v3` screening pipeline in this checkout.

## Queue Payload

The API publishes a Celery-compatible task for `pipeline.process_session` on `profiling.jobs`:

```json
{
  "session_id": "<session-uuid>",
  "run_id": "<run-uuid>",
  "job_description": "Senior backend engineer with Python and distributed systems experience...",
  "files": [
    {
      "file_id": 42,
      "storage_key": "uploads/user-1/resume.pdf",
      "original_name": "resume.pdf"
    }
  ]
}
```

The queue transport is currently Celery wire format created in `api/src/lib/queue.ts`, but the payload above is the meaningful worker contract.

The API may source `job_description` from a newly entered JD or a reused JD template. Reusing an unchanged JD does not duplicate the text in `profiling_session`; editing the JD creates or reuses a different template by content hash and still triggers a fresh scoring run.

## Callback Auth

The worker calls `POST /api/internal/pipeline/callback`.

Authentication is not bearer auth. The worker sends the configured secret in the header named by `PIPELINE_SECRET_HEADER_NAME` (default `x-pipeline-secret`), and the API compares it to `PIPELINE_CALLBACK_SECRET`.

## Completion Callback

```json
{
  "type": "completion",
  "session_id": "<session-uuid>",
  "run_id": "<run-uuid>",
  "status": "completed",
  "results": [
    {
      "file_id": 42,
      "candidate_name": "Jane Doe",
      "candidate_email": "jane@example.com",
      "candidate_phone": "+1-555-0100",
      "raw_text": "...",
      "parsed_profile": {},
      "overall_score": 96.2,
      "score_breakdown": {},
      "summary": "...",
      "skills_matched": ["Python", "Docker"]
    }
  ]
}
```

The callback shape is unchanged from v2. The official worker now maps research artifacts into the existing fields:

- `parsed_profile`: candidate DNA profile
- `score_breakdown.job_description_artifact`: structured JD artifact
- `score_breakdown.resume_artifact`: resume processing metadata
- `score_breakdown.score_artifact`: composite score artifact
- `score_breakdown.base_score`: capped base score
- `score_breakdown.bonus_score`: additional bonus score
- `score_breakdown.total_score`: total ranking score
- `overall_score`: same total ranking score used by existing result sorting
- `summary`: deterministic recruiter-facing explanation

On success, the API deletes existing `candidate_result` rows for the same `session_id` + `run_id`, inserts the new results, and marks the session `completed`.

## Error Callback

```json
{
  "type": "error",
  "session_id": "<session-uuid>",
  "run_id": "<run-uuid>",
  "status": "failed",
  "error": "All 3 files failed processing",
  "partial_results": []
}
```

On error, the API marks the session `failed`, stores the error message, and currently persists any `partial_results` for that run before returning success.

## Official Worker Stages

The worker in `services/pipeline/worker.py` runs:

1. Text extraction from PDF, DOCX, or TXT.
2. JD enrichment through regex constraints, taxonomy-backed hard/soft skill detection, and top-K sibling expansion.
3. CV preprocessing and candidate DNA extraction through text cleanup, section detection, taxonomy mapping, and interval-based experience evidence.
4. Composite scoring with capped base score, uncapped bonus score, matched skills, missing skills, surplus skills, and component traces.
5. Deterministic summary generation from the artifacts.
6. Completion or error callback to the API.

The research design comes from `research/project/` and processed taxonomy assets under `research/data/taxonomy/taxonomy_processed/`.

## Artifact Summaries

### JD artifact

Contains:

- `metadata`
- `hard_constraints.min_experience_years`
- `hard_constraints.required_degree`
- `hard_skills.must_have.tech_skills`
- `hard_skills.must_have.certifications`
- `hard_skills.nice_to_have.from_jd_desirable`
- `hard_skills.nice_to_have.from_taxonomy_expansion`
- `soft_skills`
- `taxonomy_traces`
- `warnings`

### Candidate DNA profile

Contains:

- candidate identity and contact signals
- declared or inferred years of experience
- direct hard skill evidence with taxonomy IDs, years, zones, and evidence lines
- soft skills
- education
- raw extracted entities
- taxonomy traces
- parse warnings

### Score artifact

Contains:

- `base_score`
- `bonus_score`
- `total_score`
- hard-skill component details
- constraint component details
- bonus component details
- matched, missing, and surplus skills
- explanation lines

## Run-Aware Behavior

Run awareness is a core part of the contract.

- each create or retry path generates a fresh `run_id`
- the profiling session stores the active run in API code as `activeRunId`
- `candidate_result` rows are stored with `runId`
- the callback route checks `activeRunId` before applying completion or error state
- stale callbacks for older runs return `{ status: "ok", skipped: true }` and do not overwrite current results

This protects retries and reruns from stale worker responses.

## Session State Model

Current session states in `core/src/schemas/index.ts`:

- `processing`: initial processing for a new or cloned session
- `retrying`: rerun or in-place replacement of an existing session
- `completed`: latest active run completed successfully
- `failed`: latest active run failed

There is no separate progress state in the callback contract today.

## Environment Touchpoints

API-side pipeline env:

- `CELERY_BROKER_URL`
- `PIPELINE_CALLBACK_SECRET`
- `PIPELINE_SECRET_HEADER_NAME`

Worker-side env:

- `CELERY_BROKER_URL`
- `PIPELINE_CALLBACK_URL`
- `PIPELINE_CALLBACK_SECRET`
- `PIPELINE_SECRET_HEADER_NAME`
- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `PIPELINE_TAXONOMY_DIR`
- `PIPELINE_CHROMA_DB_PATH`
- `EMBEDDING_MODEL_NAME`
- `GLINER_MODEL_NAME`
- `GEMINI_API_KEY`
- `GEMINI_MODEL_NAME`
- `ENABLE_GEMINI_SEGMENTATION`
- `ENABLE_SEMANTIC_TAXONOMY_MAPPING`
- scoring weights such as `SCORING_WEIGHT_HARD_SKILLS`, `SCORING_WEIGHT_CONSTRAINTS`, and related bucket weights

## Runtime Notes

- local helper runtime is `docker-compose.yml`, which starts `rabbitmq` and `pipeline-worker`
- the worker can also be started directly with `bun run pipeline`
- `services/pipeline/Dockerfile` builds a Python 3.12 image and runs Celery against `profiling.jobs`
- current Celery settings use late ack, worker-lost rejection, `prefetch=1`, and no result backend

## Current Limitations

- extraction is extension-based and handles `.pdf`, `.docx`, and `.txt`
- scanned-image PDFs still need an OCR path
- Gemini segmentation is optional and disabled by default
- taxonomy mapping uses local processed taxonomy assets and deterministic fallbacks when semantic models are unavailable
- there are no progress callbacks; only terminal `completion` or `error`
- callback authentication is a shared secret header, not signed requests or mTLS

## Source Files to Check When Updating This Doc

- `api/src/lib/queue.ts`
- `api/src/routes/pipeline.ts`
- `api/src/routes/session.ts`
- `api/src/usecases/pipeline/`
- `api/src/usecases/session/`
- `api/src/repositories/session-repository.ts`
- `core/src/schemas/index.ts`
- `services/pipeline/worker.py`
- `services/pipeline/models.py`
- `services/pipeline/config.py`
- `services/pipeline/celeryconfig.py`
- `services/pipeline/stages/`
- `services/pipeline/utils/`
- `research/README.md`

## Change Rule

If the queue payload, callback payloads, auth header behavior, session state model, run-aware persistence, or artifact semantics change, update this file in the same change.
