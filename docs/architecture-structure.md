# Architecture and Structure

This document is a current snapshot of the Resumemo codebase and runtime shape.

Resumemo is a recruiter-facing profiling app. Recruiters sign in, create profiling sessions from a job brief, upload resumes, wait for background processing, then review ranked candidates and export results.

## Current status

- The active app is narrower than the long-term product vision. Prefer live code over older design notes.
- The Python/Celery worker in `services/pipeline/` is the current implementation, not a permanent architecture requirement.
- The important contract today is: API publishes profiling jobs, a worker processes them, and the worker reports completion or failure back to the API.

## Repository structure

```text
resumemo/
|- web/                    Vite + React recruiter UI
|- api/                    Elysia API on Bun
|- core/                   shared TypeScript schemas, types, constants
|- services/pipeline/      standalone Python worker project
|- deploy/                 deployment scripts, env examples, nginx config
|- docs/                   current docs and plans
|- docker-compose.yml      local RabbitMQ + pipeline worker
`- docker-compose.prod.yml production runtime compose file
```

## Subsystems

### `web/`

- Recruiter-facing frontend built with Vite, React, React Router, TanStack Query, React Hook Form, and Zustand.
- Route definitions live in `web/src/routes/route-defs.tsx`.
- Current route surface includes `/`, `/login`, `/dashboard`, `/profiling`, `/profiling/new`, and `/profiling/:id`.
- Main UI responsibilities:
  - sign-in and session-aware navigation
  - dashboard metrics and recent sessions
  - new profiling session flow with presigned uploads
  - session list, session detail, retry actions, and result export

### `api/`

- Bun + Elysia service listening on port `8080` in local development.
- Entrypoint is `api/src/index.ts`.
- Current mounted runtime surface is intentionally small:
  - `GET /health`
  - Better Auth handler mounted through `authMiddleware`
  - profiling session routes under `/api/v2/sessions`
  - internal worker callback at `/api/internal/pipeline/callback`
- Route handlers in `api/src/routes/` are thin adapters.
- HTTP-aware orchestration and error mapping live in `api/src/usecases/`, currently centered on `api/src/usecases/session/` and `api/src/usecases/pipeline/`.
- Repository reads in `api/src/repositories/` return raw data or `null`; command-style writes return useful data, `true`, `false`, or successful void behavior.
- Storage, upload verification, and queue publishing stay in API-side helpers instead of the web app.

Important note: `api/src/routes/files.ts` and `api/src/routes/system.ts` exist in the repo, but they are not mounted by `api/src/index.ts` today. They should not be documented as active runtime surface unless they are wired in.

### `core/`

- Shared workspace for cross-package TypeScript contracts.
- Holds shared schemas, auth types, and constants such as file upload limits.
- `web` and `api` depend on `core`; the Python worker does not.

### `services/pipeline/`

- Standalone Python 3.12+ worker project.
- Current implementation uses Celery with the `profiling.jobs` queue.
- Main flow in `worker.py` is:
  - fetch resume file from object storage
  - extract text
  - parse structured profile data
  - score against the job description
  - summarize the candidate
  - POST completion or error data back to the API
- Stage modules live in `services/pipeline/stages/`; shared helpers live in `services/pipeline/utils/`.

Treat this worker as replaceable. The queue-plus-callback contract matters to the app today; Python, Celery, and the current stage internals do not need to be permanent.

### `deploy/`

- Holds deployment support files rather than application runtime code.
- `deploy/ec2/` contains bootstrap and deploy scripts plus example env files.
- `deploy/nginx/` contains the nginx config used by the production compose stack.

## Runtime topology

### Local development

Typical local shape:

1. `web` runs through Vite, usually at `http://localhost:5173`.
2. `api` runs on `http://localhost:8080`.
3. The worker can run separately with `bun run pipeline` if `CELERY_BROKER_URL` and callback settings are valid.
4. For a fully local queue + worker setup, `docker-compose.yml` starts `rabbitmq` and `pipeline-worker`.

`docker-compose.yml` does not start the web app or API. It is a queue/worker helper for local profiling runs.

### Production-oriented compose runtime

`docker-compose.prod.yml` defines:

- `nginx`
- `api`
- `pipeline`

It does not define RabbitMQ. The broker is expected to be provided through environment configuration such as `CELERY_BROKER_URL`.

## Boundaries and responsibilities

### Web -> API

- The frontend does not score resumes locally.
- It requests presigned upload URLs, uploads files to object storage, creates profiling sessions, polls/query-fetches session state, triggers retries, and downloads exports.

### API -> storage and queue

- The API validates upload metadata and ownership.
- It persists session and file records.
- It publishes profiling jobs to the broker.
- It owns session status transitions, result persistence, export generation, and run-aware retry behavior.

### Pipeline -> API callback

- The worker reads job payloads from the queue.
- It reads resume bytes from object storage, processes them, then calls the internal callback endpoint.
- Callback application is guarded by a shared secret and by `run_id`, so stale worker responses can be ignored.

## Current workflow data flow

1. Recruiter signs in and opens the new profiling flow.
2. The web app asks the API for presigned upload URLs.
3. The browser uploads resume files directly to object storage.
4. The web app calls `/api/v2/sessions/create` with session metadata and uploaded file references.
5. The API stores session state and publishes a `profiling.jobs` message.
6. The worker processes each file and sends completion or error data to `/api/internal/pipeline/callback`.
7. The API stores current-run results and exposes them through session detail, results, and export endpoints.
8. The web app shows processing, retrying, completed, or failed session states and lets the recruiter review or retry.

## Current API surface that matters to the product

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

## Documentation guardrails

- Do not refer to `packages/shared`; the shared workspace is `core/`.
- Do not document admin-only consoles or speculative back-office surfaces as if they exist today.
- Do not assume a local web port of `5000`; current Vite development is typically `5173`.
- When describing the pipeline, distinguish the external contract from the current Python/Celery implementation.
