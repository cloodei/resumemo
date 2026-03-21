## Project Overview

Resumemo is a recruiter-facing resume screening app. Recruiters create profiling sessions from a job brief, upload resumes, wait for background processing, then review ranked candidates and export results.

Use this file for contributor and agent workflow guidance. Prefer live code over older plans when anything conflicts.

## Repository Structure

```text
resumemo/
|- web/                       Vite + React app
|  |- src/pages/             route pages
|  |- src/components/        feature, layout, and ui components
|  |- src/layouts/           app shell layouts
|  |- src/lib/               api client, auth, queries, utils
|  |- src/routes/            route definitions and titles
|  `- src/stores/            Zustand upload flow state
|- api/                       Elysia API
|  |- src/lib/               auth, db, queue, storage helpers
|  |- src/repositories/      session and file data access
|  `- src/routes/            HTTP route modules
|- core/                      shared schemas, types, constants
|  `- src/
|     |- schemas/
|     |- types/
|     `- constants/
|- services/pipeline/         standalone Python worker project
|  |- worker.py              Celery entrypoint
|  |- stages/                extract, parse, score, summarize
|  |- utils/                 callback and storage helpers
|  |- config.py              environment loading
|  `- celeryconfig.py        queue config
|- deploy/                    deployment scripts, env examples, nginx config
|- docs/                      current docs and working plans
|- docker-compose.yml         local RabbitMQ + pipeline worker
`- docker-compose.prod.yml    production compose stack
```

## Commands

You **must not** run build, lint, or test commands unless the user explicitly asks.

### Root

```bash
bun run dev
bun run web
bun run api
bun run pipeline
bun run build
bun run lint
bun run start
bun run clean
```

### Web

```bash
cd web
bun run dev
bun run build
bun run lint
bun run preview
```

Notes:

- Vite dev usually serves on `http://localhost:5173`.
- `bun run preview` delegates to `npm run build && wrangler dev`.

### API

```bash
cd api
bun run dev
bun run build
bun run start
bun run push
bun run generate
```

### Pipeline

```bash
cd services/pipeline
bun run sync
bun run spacy
bun run dev
```

Notes:

- `bun run dev` for the worker expects RabbitMQ to already be reachable through `CELERY_BROKER_URL`.


## Conventions

### Formatting and style

- Use tabs with width 2.
- Keep TypeScript strict.
- Prefer `type` over `interface` unless there is a clear reason not to.
- Keep file names kebab-case and React components PascalCase.

### Path aliases

```ts
// web
@/* -> web/src/*
@resumemo/core/* -> core/src/*
@api -> api/src/index.ts

// api
~/* -> api/src/*
@resumemo/core -> core/src
@resumemo/core/* -> core/src/*
```

### Shared contracts

- Put shared TypeScript schemas, constants, and cross-package types in `core/`.
- Keep documentation and imports aligned to the current `core/` workspace layout.

## Architecture Notes

### Frontend

- React Router routes live in `web/src/routes/route-defs.tsx`.
- Current user-facing routes include `/`, `/login`, `/dashboard`, `/profiling`, `/profiling/new`, and `/profiling/:id`.
- The dashboard and profiling pages use TanStack Query for server data.
- New session upload state lives in `web/src/stores/upload-store.ts`.
- UI primitives follow the local shadcn-style pattern in `web/src/components/ui/`.

### Backend

- API entrypoint is `api/src/index.ts`.
- Current mounted API surface centers on:
  - health check at `/health`
  - profiling session presign, create, retry, list, detail, results, result detail, and export routes under `/api/v2/sessions`
  - internal worker callback at `/api/internal/pipeline/callback`
- Session orchestration and persistence logic live in `api/src/repositories/session-repository.ts` and related helpers.
- Keep route handlers thin; push database and workflow logic into repository and lib layers.

### Pipeline

- `services/pipeline/` is an active worker project today.
- The worker consumes `profiling.jobs`, reads resume files from object storage, runs staged extraction/parsing/scoring/summarization, and POSTs results back to the API.
- Treat the external contract as important, but treat the Python/Celery implementation as replaceable.
- When documenting or modifying pipeline behavior, say "current implementation" unless a contract is intentionally permanent.

### Deployment surface

- Production compose stack lives in `docker-compose.prod.yml`.
- Server deployment assets live under `deploy/ec2/` and `deploy/nginx/`.
- Web also carries Wrangler-based deploy scripts in `web/package.json`.

## Frontend Guidance

- Follow existing React Router page patterns rather than introducing framework-specific conventions.
- Use TanStack Query for API-backed state, React Hook Form for forms, and Zustand only for client-side workflow state that spans components.
- Reuse existing profiling feature modules in `web/src/components/features/` before creating new top-level patterns.
- This is Vite + React, not Next.js. Do not add `use client` or Next-specific APIs.

## Backend Guidance

- Use Elysia route modules in `api/src/routes/` and keep request validation close to the route.
- Reuse `core` exports for shared schema and type needs.
- Maintain `run_id`-aware pipeline behavior; callbacks should only apply to the active run for a session.
- Preserve current error response shape where possible because the web app depends on it for retry and export UX.

## Pipeline Guidance

- Keep the worker self-contained inside `services/pipeline/`.
- Favor small stage-specific changes in `services/pipeline/stages/` and shared helpers in `services/pipeline/utils/`.
- If the worker contract changes, update `docs/pipeline-spec.md`, `README.md`, and `AGENTS.md` in the same work.

## File Placement

| What | Where |
| --- | --- |
| Route pages | `web/src/pages/` |
| Feature components | `web/src/components/features/` |
| UI primitives | `web/src/components/ui/` |
| Layout components | `web/src/components/layout/` or `web/src/layouts/` |
| Client stores | `web/src/stores/` |
| Shared TS contracts | `core/src/` |
| API routes | `api/src/routes/` |
| API repositories | `api/src/repositories/` |
| Pipeline stages | `services/pipeline/stages/` |
| Deployment assets | `deploy/` |
| Plans and long-form docs | `docs/` |

## Documentation Maintenance

- Keep `README.md` as the entry point for humans.
- Keep `docs/README.md` as the map of record for the documentation set.
- Keep `AGENTS.md` focused on contributor and coding-agent workflow, not product vision.
- When routes, scripts, workspace layout, or deployment entry points change, update these three files together:
  - `README.md`
  - `docs/README.md`
  - `AGENTS.md`
- Mark unstable areas explicitly instead of implying long-term architectural certainty.

## References

- `README.md` - project entry point
- `docs/README.md` - documentation map
- `docs/architecture-structure.md` - architecture snapshot; verify against live code during the current docs refresh
- `docs/system-guidelines.md` - current product workflow notes
- `docs/codebase-operations.md` - operational guidance; verify commands against package scripts during the current docs refresh
- `docs/pipeline-spec.md` - current pipeline contract
- `deploy/ec2/README.md` - EC2 deployment runbook
