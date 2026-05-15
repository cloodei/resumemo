# Resumemo

Resumemo is a recruiter-facing resume screening app for running profiling sessions against a job brief, ranking uploaded resumes, and exporting results.

## Current Status

- The active product is the `/api/v2` profiling workflow: create a session, upload resumes, process in the background, review ranked candidates, retry, and export.
- The AI pipeline in `services/pipeline/` is the official research-backed worker, based on the artifacts and taxonomy design in `research/`.
- The worker preserves the current queue payload and callback contract. Python, Celery, and RabbitMQ are current runtime choices; the API-facing contract is the important boundary.
- Job descriptions are normalized through reusable per-user JD templates. Sessions reference the saved JD text instead of storing the same brief repeatedly.
- There is no mounted `/api/v3` screening route in this checkout. Older v3/screening notes should be treated as historical unless live code is added later.

## Repository Overview

```text
resumemo/
|- web/                  Vite + React recruiter UI
|- api/                  Elysia API on Bun
|- core/                 shared schemas, types, and constants
|- services/pipeline/    official research-backed AI worker
|- deploy/               deployment scripts and nginx config
|- docs/                 current docs, operational notes, and plans
|- docker-compose.yml    local RabbitMQ + pipeline worker helper
`- docker-compose.prod.yml
```

Current runtime shape:

- `web` serves the recruiter interface for sign-in, dashboard, profiling session creation, session list, result review, retry, and export.
- `api` handles auth, upload presigning, session creation, retry flows, results, exports, queue publishing, and the internal pipeline callback.
- `core` holds shared TypeScript contracts used by `web` and `api`.
- `services/pipeline` consumes queue jobs, reads files from object storage, builds JD/candidate/score artifacts, and calls back into the API.
- Runtime taxonomy and ChromaDB assets for the worker are packaged under `services/pipeline/data/`; `research/` remains the source reference.

## Quick Start

```bash
bun install

# start web + api
bun run dev

# if RabbitMQ/CELERY_BROKER_URL is available, start the worker
bun run pipeline

# or run the local queue + worker helper
docker compose up -d rabbitmq pipeline-worker
```

Default local endpoints:

- web: Vite dev server, usually `http://localhost:5173`
- api: `http://localhost:8080`

## Key Commands

```bash
bun run dev        # web + api
bun run web        # web only
bun run api        # api only
bun run pipeline   # official AI worker
bun run build      # build workspaces through Turbo
bun run lint       # lint workspaces through Turbo
bun run start      # preview web + start compiled api
```

Workspace notes:

- `web`: `bun run dev`, `bun run build`, `bun run lint`, `bun run preview`
- `api`: `bun run dev`, `bun run build`, `bun run push`, `bun run generate`
- `services/pipeline`: `bun run sync`, `bun run dev`

## Feature Surface Today

- Landing page and login flow at `/` and `/login`
- Recruiter dashboard at `/dashboard`
- Profiling session list, filtering, and search at `/profiling`
- New profiling session flow at `/profiling/new` with presigned uploads
- Frequently used JD selection in the new-session flow, backed by deduplicated JD templates
- Profiling result view at `/profiling/:id`
- Session retry flows for rerun, clone, and replace variants
- Session exports from the API in `csv` and `json` formats
- Internal worker callback route at `/api/internal/pipeline/callback`

## Docs Map

- `docs/README.md` - documentation index and document roles
- `docs/architecture-structure.md` - current architecture snapshot and subsystem boundaries
- `docs/system-guidelines.md` - product behavior and workflow notes
- `docs/codebase-operations.md` - operations guide, env touchpoints, and deployment references
- `docs/pipeline-spec.md` - current pipeline contract and official artifact model
- `research/README.md` - map of research references that support the production pipeline

## Backend Shape

- Session recruiter routes under `api/src/routes/session.ts` delegate to usecases in `api/src/usecases/session/`, including JD template listing and creation.
- The internal worker callback route in `api/src/routes/pipeline.ts` delegates to `api/src/usecases/pipeline/`.
- Repositories in `api/src/repositories/` are data-access focused; reads return raw data or `null`, while command-style writes return useful data, `true`, `false`, or successful void behavior.
- The current data model keeps profiling sessions, resume files, candidate results, and `job_description_template`; historical screening-schema tables are not part of the live schema.
- Shared request schemas for route validation can live alongside relevant usecase modules so routes and usecases stay aligned.

## Unstable Areas

- The official pipeline is now artifact-based, but model choices, taxonomy assets, and optional segmentation backends can still evolve.
- Deployment is split across `deploy/`, `docker-compose.prod.yml`, GHCR images, and web Wrangler scripts.
- The product surface is narrower than the long-term vision; prefer current routes and live code over older aspirational docs.
