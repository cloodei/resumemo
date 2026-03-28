# Pipeline Contract and Current Implementation

This document is the current source of truth for the resume profiling pipeline.

It describes two things separately:

- the stable boundary the API and worker rely on today
- the current Python/Celery implementation snapshot, which is important in production now but expected to be replaceable later

If live code conflicts with this file, fix this file in the same change.

## What Is Stable vs Replaceable

### Stable boundary

These are the parts other parts of the system depend on today:

- queue publisher payload fields: `session_id`, `run_id`, `job_description`, and `files[]`
- file manifest fields: `file_id`, `storage_key`, `original_name`
- callback endpoint: `POST /api/internal/pipeline/callback`
- callback auth shape: shared secret in the header named by `PIPELINE_SECRET_HEADER_NAME`, with value `PIPELINE_CALLBACK_SECRET`
- callback types: `completion` and `error`
- callback run awareness: callbacks only apply when payload `run_id` matches the session's active run
- session status model: `processing`, `retrying`, `completed`, `failed`
- result persistence: candidate results are stored against the active run, and stale callbacks are ignored

### Replaceable internals

These are implementation details, not long-term commitments:

- Python worker in `services/pipeline/`
- Celery + RabbitMQ transport details
- stage layout under `services/pipeline/stages/`
- parsing heuristics, spaCy model choice, and skills taxonomy
- scoring formulas, weights, fallback behavior, and model settings
- Docker packaging and local compose wiring

Any future replacement should preserve the stable boundary unless the API contract is intentionally changed.

## Current System Role

Today the API publishes profiling jobs to RabbitMQ and the worker consumes them, fetches resume files from object storage (currently Cloudflare R2), runs extract -> parse -> score -> summarize, then POSTs results back to the API. The worker does not write to Postgres directly; the API owns persistence and session state updates.

## Contract Surface

### Queue payload

The API publishes a Celery-compatible task for `pipeline.process_session` on `profiling.jobs`. The application payload is:

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

Field notes:

- `session_id`: profiling session being processed
- `run_id`: unique execution id for that session attempt or retry
- `job_description`: current session job description text
- `files`: file manifest for the worker to fetch from object storage

The queue transport is currently Celery wire format created in `api/src/lib/queue.ts`, but the contract that matters to the worker is the payload above.

### Callback auth

The worker calls `POST /api/internal/pipeline/callback`.

Authentication is not bearer auth. The worker sends the configured secret in the header named by `PIPELINE_SECRET_HEADER_NAME` (default `x-pipeline-secret`), and the API compares it to `PIPELINE_CALLBACK_SECRET`.

### Completion callback

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
      "overall_score": 87.3,
      "score_breakdown": {},
      "summary": "...",
      "skills_matched": ["python", "docker"]
    }
  ]
}
```

On success, the API deletes any existing `candidate_result` rows for the same `session_id` + `run_id`, inserts the new results, and marks the session `completed`.

### Error callback

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

## Run-Aware Behavior

Run awareness is a core part of the current contract.

Context naming used in this document:

- payload fields use snake_case, such as `run_id`
- API/runtime properties in TypeScript usually use camelCase, such as `activeRunId` and `runId`
- "active run" means the run currently stored on the session and allowed to mutate session state

- each create or retry path generates a fresh `run_id`
- the profiling session stores the active run in API code as `activeRunId`
- `candidate_result` rows are stored with `runId` in the current schema
- the callback route checks `activeRunId` before applying completion or error state
- stale callbacks for older runs return `{ status: "ok", skipped: true }` and do not overwrite current results

This is how reruns and retries avoid corrupting newer session state.

## Session State Model

Current session states in `core/src/schemas/index.ts`:

- `processing`: initial processing for a new or cloned session
- `retrying`: rerun or in-place replacement of an existing session
- `completed`: latest active run completed successfully
- `failed`: latest active run failed

There is no separate progress state in the callback contract today.

## Current Data Flow

### Create or retry

The session route and usecase flow in `api/src/routes/session.ts` and `api/src/usecases/session/`:

- create a new session or mutate/clone an existing one
- generate a new `run_id`
- set the session to `processing` or `retrying`
- publish the queue payload with the session and file manifest

### Worker execution

The current worker in `services/pipeline/worker.py`:

- validates the queue payload with `JobPayload`
- fetches each file from object storage using `storage_key`
- extracts text by file extension
- parses a structured profile from the extracted text
- scores the resume against the job description
- builds a text summary
- sends either a `completion` callback or an `error` callback

Per-file exceptions are collected. If at least one file succeeds, the worker currently sends `completion`; if every file fails, it sends `error`.

### API finalization

The callback route in `api/src/routes/pipeline.ts`, the pipeline usecase in `api/src/usecases/pipeline/`, and repository logic in `api/src/repositories/session-repository.ts`:

- verify the shared-secret header
- ignore stale callbacks whose `run_id` does not match the active run
- upsert current-run results by delete-then-insert for that run
- update session status and error fields
- refresh cached session and result views

Current backend layering for this flow:

- routes only adapt transport concerns and hand off to usecases
- usecases decide the HTTP-facing success/error result
- repositories perform raw persistence and cache updates without returning HTTP-shaped wrapper states

## Current Worker Layout

The replaceable worker project lives in `services/pipeline/`:

```text
services/pipeline/
|- worker.py
|- models.py
|- config.py
|- celeryconfig.py
|- stages/
|  |- extract.py
|  |- parse.py
|  |- score.py
|  `- summarize.py
|- utils/
|  |- callback.py
|  `- storage.py
`- data/
   `- skills_taxonomy.json
```

Current responsibilities:

- `worker.py`: Celery app and `pipeline.process_session`
- `models.py`: queue, result, parse, and scoring models
- `config.py`: callback, model, retry, and scoring env-backed settings
- `celeryconfig.py`: broker URL, queue routing, ack/retry, pool, and limits
- `stages/`: extract, parse, score, summarize pipeline stages
- `utils/storage.py`: object storage fetch helper
- `utils/callback.py`: callback POST with retries

## Current Scoring Snapshot

The current implementation uses a hybrid score made from:

- lexical similarity via TF-IDF cosine similarity
- semantic similarity via `sentence-transformers/all-MiniLM-L6-v2`
- skill match based on the skills taxonomy
- experience fit based on years-of-experience extraction from the job description

Current default weights from `services/pipeline/config.py`:

- `text_similarity`: `0.25`
- `semantic_similarity`: `0.25`
- `skill_match`: `0.30`
- `experience_fit`: `0.20`

If semantic scoring fails, the worker falls back to spaCy document similarity. These algorithms and weights are current implementation details, not a permanent scoring contract.

## Environment Touchpoints

### API

Current API-side env usage tied to the pipeline:

- `CELERY_BROKER_URL`: RabbitMQ connection used by the publisher in `api/src/lib/queue.ts`
- `PIPELINE_CALLBACK_SECRET`: shared secret expected on callbacks
- `PIPELINE_SECRET_HEADER_NAME`: callback header name expected by the internal callback route

### Worker

Current worker-side env usage:

- `CELERY_BROKER_URL`: broker connection
- `PIPELINE_CALLBACK_URL`: callback target URL
- `PIPELINE_CALLBACK_SECRET`: callback secret value
- `PIPELINE_SECRET_HEADER_NAME`: callback header name
- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `SPACY_MODEL`
- `SEMANTIC_MODEL_NAME`
- `SEMANTIC_MAX_CHARS`
- `SCORING_WEIGHT_TEXT_SIMILARITY`
- `SCORING_WEIGHT_SEMANTIC_SIMILARITY`
- `SCORING_WEIGHT_SKILL_MATCH`
- `SCORING_WEIGHT_EXPERIENCE_FIT`
- `CELERY_WORKER_POOL`
- `CELERY_WORKER_CONCURRENCY`

## Runtime and Deployment Notes

- local helper runtime is `docker-compose.yml`, which starts `rabbitmq` and `pipeline-worker`
- the worker can also be started directly with `bun run pipeline` from the repo root or `bun run dev` in `services/pipeline/`
- `services/pipeline/Dockerfile` builds a Python 3.12 image and runs Celery against `profiling.jobs`
- current Celery settings use late ack, worker-lost rejection, `prefetch=1`, and no result backend
- current defaults prefer `solo` pool, including on Windows

These runtime choices are operationally important today but still replaceable.

## Current Limitations

- extraction is extension-based and only handles `.pdf`, `.docx`, and `.txt`
- there is no OCR path for scanned-image PDFs
- parsing is English-centric and depends on the configured spaCy model and heuristics
- there are no progress callbacks; only terminal `completion` or `error`
- callback authentication is a shared secret header, not signed requests or mTLS
- the worker processes files sequentially inside one task
- lexical TF-IDF scoring is computed from the job description and one resume at a time in the current implementation
- if all files fail, the session becomes `failed`; if some files succeed, the worker reports `completion` and the session becomes `completed`
- partial results in an `error` callback are persisted today, but that behavior should still be treated as current implementation detail rather than a broad product promise

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

## Change Rule

If the queue payload, callback payloads, auth header behavior, session state model, or run-aware persistence changes, update this file in the same change.
