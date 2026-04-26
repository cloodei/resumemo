# Architecture and Structure

This document is a current snapshot of the Resumemo codebase and runtime shape.

Resumemo is a recruiter-facing profiling app. Recruiters sign in, create profiling sessions from a job brief, upload resumes, wait for background AI processing, then review ranked candidates and export results.

## Current Status

- The active app is narrower than the long-term product vision. Prefer live code over older design notes.
- The official AI worker lives in `services/pipeline/` and is based on the research artifacts in `research/`.
- The stable boundary today is: API publishes v2 profiling jobs, the worker processes them, and the worker reports completion or failure back to the API.
- There is no mounted `/api/v3` screening route or separate `services/pipeline-v3/` service in this checkout.

## Repository Structure

```text
resumemo/
|- web/                    Vite + React recruiter UI
|- api/                    Elysia API on Bun
|- core/                   shared TypeScript schemas, types, constants
|- services/pipeline/      official research-backed AI worker
|- research/               AI research references and taxonomy assets
|- deploy/                 deployment scripts, env examples, nginx config
|- docs/                   current docs and plans
|- docker-compose.yml      local RabbitMQ + pipeline worker helper
`- docker-compose.prod.yml production runtime compose file
```

## Subsystems

### `web/`

- Recruiter-facing frontend built with Vite, React, React Router, TanStack Query, React Hook Form, and Zustand.
- Route definitions live in `web/src/routes/route-defs.tsx`.
- Current route surface includes `/`, `/login`, `/dashboard`, `/profiling`, `/profiling/new`, and `/profiling/:id`.
- Main UI responsibilities are sign-in, session navigation, uploads, session detail, retry actions, and exports.

### `api/`

- Bun + Elysia service listening on port `8080` in local development.
- Entrypoint is `api/src/index.ts`.
- Current mounted runtime surface:
  - `GET /health`
  - Better Auth handler mounted through `authMiddleware`
  - profiling session routes under `/api/v2/sessions`
  - internal worker callback at `/api/internal/pipeline/callback`
- Route handlers in `api/src/routes/` are thin adapters.
- HTTP-aware orchestration and error mapping live in `api/src/usecases/`, currently centered on `api/src/usecases/session/` and `api/src/usecases/pipeline/`.
- Repository reads in `api/src/repositories/` return raw data or `null`; command-style writes return useful data, `true`, `false`, or successful void behavior.

Important note: `api/src/routes/files.ts` and `api/src/routes/system.ts` exist, but they are not mounted by `api/src/index.ts` today.

### `core/`

- Shared workspace for cross-package TypeScript contracts.
- Holds shared schemas, auth types, and constants such as file upload limits.
- `web` and `api` depend on `core`; the Python worker communicates through the queue/callback JSON contract instead of importing `core`.

### `services/pipeline/`

- Standalone Python 3.12+ worker project.
- Current runtime uses Celery with the `profiling.jobs` queue.
- Main flow in `worker.py`:
  - fetch resume file from object storage
  - extract text
  - enrich the JD into a structured artifact
  - extract candidate DNA from each resume
  - compute composite base, bonus, and total scores
  - generate a deterministic recruiter summary
  - POST completion or error data back to the API
- Stage modules live in `services/pipeline/stages/`; shared helpers live in `services/pipeline/utils/`.

The API-facing contract matters more than Celery itself. Future worker runtimes may replace Celery if they preserve the v2 queue/callback behavior or intentionally migrate it.

### `research/`

- Reference material for the official AI pipeline.
- Contains notebooks, processed taxonomy JSON, ChromaDB research assets, sample data, papers, and algorithm documentation.
- Production code should not import notebooks or scratch files directly.

### `deploy/`

- Holds deployment support files rather than application runtime code.
- `deploy/ec2/` contains bootstrap and deploy scripts plus example env files.
- `deploy/nginx/` contains the nginx config used by the production compose stack.

## Runtime Topology

### Local Development

1. `web` runs through Vite, usually at `http://localhost:5173`.
2. `api` runs on `http://localhost:8080`.
3. The worker can run separately with `bun run pipeline` if broker, storage, callback, and taxonomy settings are valid.
4. For a local queue + worker setup, `docker-compose.yml` starts `rabbitmq` and `pipeline-worker`.

`docker-compose.yml` does not start the web app or API. It is a queue/worker helper for local profiling runs.

### Production-Oriented Compose Runtime

`docker-compose.prod.yml` defines:

- `nginx`
- `api`
- `pipeline`

It does not define RabbitMQ. The broker is expected to be provided through environment configuration such as `CELERY_BROKER_URL`.

## Boundaries and Responsibilities

### Web -> API

- The frontend does not score resumes locally.
- It requests presigned upload URLs, uploads files to object storage, creates profiling sessions, polls/query-fetches session state, triggers retries, and downloads exports.

### API -> Storage and Queue

- The API validates upload metadata and ownership.
- It persists session and file records.
- It publishes profiling jobs to the broker.
- It owns session status transitions, result persistence, export generation, and run-aware retry behavior.

### Pipeline -> API Callback

- The worker reads job payloads from the queue.
- It reads resume bytes from object storage, processes them, then calls the internal callback endpoint.
- Callback application is guarded by a shared secret and by `run_id`, so stale worker responses can be ignored.

## Current Workflow Data Flow

1. Recruiter signs in and opens the new profiling flow.
2. The web app asks the API for presigned upload URLs.
3. The browser uploads resume files directly to object storage.
4. The web app calls `/api/v2/sessions/create` with session metadata and uploaded file references.
5. The API stores session state and publishes a `profiling.jobs` message.
6. The worker builds JD, candidate DNA, and score artifacts for the active run.
7. The worker sends completion or error data to `/api/internal/pipeline/callback`.
8. The API stores current-run results and exposes them through session detail, results, and export endpoints.
9. The web app shows processing, retrying, completed, or failed session states and lets the recruiter review or retry.

## Current API Surface That Matters

The active recruiter workflow centers on `/api/v2/sessions`:

- `POST /presign`
- `POST /create`
- `POST /:id/retry`
- `GET /`
- `GET /:id`
- `GET /:id/results`
- `GET /:id/results/:resultId`
- `GET /:id/export`

Internal worker integration uses:

- `POST /api/internal/pipeline/callback`

## Documentation Guardrails

- Do not refer to `packages/shared`; the shared workspace is `core/`.
- Do not document unmounted `/api/v3` or absent `services/pipeline-v3/` surfaces as current behavior.
- Do not assume a local web port of `5000`; current Vite development is usually `5173`.
- When describing the pipeline, distinguish the v2 API contract from the current Python/Celery runtime choice.
