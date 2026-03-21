# Resumemo

Resumemo is a recruiter-facing resume screening app for running profiling sessions against a job brief, ranking uploaded resumes, and exporting the results.

## Current Status

- Early-stage product: core profiling flows work, but behavior and docs will continue to move.
- Current implementation uses a Bun monorepo for `web`, `api`, and `core`, plus a standalone Python/Celery pipeline in `services/pipeline/`.
- The pipeline is active in production today, but it is a replaceable subsystem rather than a permanent architecture commitment.

## Repository Overview

```text
resumemo/
|- web/                  Vite + React recruiter UI
|- api/                  Elysia API on Bun
|- core/                 shared schemas, types, and constants
|- services/pipeline/    standalone Python worker project
|- deploy/               deployment scripts and nginx config
|- docs/                 current docs, operational notes, and plans
|- docker-compose.yml    local RabbitMQ + pipeline worker
`- docker-compose.prod.yml
```

Current runtime shape:

- `web` serves the recruiter interface for sign-in, dashboard, profiling session creation, session list, and result review.
- `api` handles auth, upload presigning, session creation, retry flows, results, exports, and the internal pipeline callback.
- `core` holds shared TypeScript contracts used by `web` and `api`.
- `services/pipeline` consumes queue jobs, reads files from storage, runs extraction/parsing/scoring/summarization, and calls back into the API.

## Quick Start

```bash
bun install

# start web + api
bun run dev

# if you already have RabbitMQ/CELERY_BROKER_URL available, start the worker
bun run pipeline

# or run the fully local queue + worker stack with Docker
docker compose up -d rabbitmq pipeline-worker
```

Default local endpoints:

- web: Vite dev server, usually `http://localhost:5173`
- api: `http://localhost:8080`

## Key Commands

### Root

```bash
bun run dev        # web + api
bun run web        # web only
bun run api        # api only
bun run pipeline   # standalone Python worker
bun run build      # build workspaces through Turbo
bun run lint       # lint workspaces through Turbo
bun run start      # preview web + start compiled api
```

### Workspace Notes

- `web`: `bun run dev`, `bun run build`, `bun run lint`, `bun run preview`
- `api`: `bun run dev`, `bun run build`, `bun run push`, `bun run generate`
- `services/pipeline`: `bun run sync`, `bun run spacy`, `bun run dev`

## Feature Surface Today

- Landing page and login flow at `/` and `/login`
- Recruiter dashboard at `/dashboard`
- Profiling session list, filtering, and search at `/profiling`
- New profiling session flow at `/profiling/new` with presigned uploads
- Profiling result view at `/profiling/:id`
- Session retry flows for rerun, clone, and replace variants
- Session exports from the API in `csv` and `json` formats
- Internal pipeline callback route for worker completion and failure reporting

## Docs Map

- `docs/README.md` - documentation index and document roles
- `AGENTS.md` - contributor and coding agent guide for this repo
- `docs/architecture-structure.md` - current architecture snapshot and subsystem boundaries
- `docs/system-guidelines.md` - product behavior and workflow notes
- `docs/codebase-operations.md` - operations guide, env touchpoints, and deployment references
- `docs/pipeline-spec.md` - current pipeline contract and implementation snapshot

## Unstable Areas

- The profiling pipeline contract matters today, but the Python/Celery implementation may be replaced later.
- Deployment is currently split across `deploy/`, `docker-compose.prod.yml`, GHCR images, and web Wrangler scripts.
- The product surface is narrower than the long-term vision; prefer current routes and live code over older aspirational docs.

For the full documentation hierarchy, start with `docs/README.md`.
