# Codebase Operations

This guide covers current repo operations, commands, environment touchpoints, and deployment references for Resumemo.

## Repo shape

```text
resumemo/
|- web/                    Vite + React app
|- api/                    Elysia API on Bun
|- core/                   shared TypeScript workspace
|- services/pipeline/      standalone Python worker project
|- deploy/                 deployment scripts, env examples, nginx config
|- docs/                   project docs and plans
|- docker-compose.yml      local RabbitMQ + pipeline worker helper
`- docker-compose.prod.yml production compose runtime
```

## Package and runtime overview

- Root workspace packages: `web`, `api`, `core`
- Root package manager: `bun@1.3.9`
- Web runtime: Vite + React
- API runtime: Bun + Elysia
- Pipeline runtime: Python + Celery + uv

The pipeline is not part of the Bun workspaces. It is a separate project under `services/pipeline/`.

## Commands

Do not treat every listed command as part of normal onboarding. Use only what matches the task.

### Root

Common root commands:

```bash
bun install
bun run dev
bun run web
bun run api
bun run pipeline
bun run build
bun run lint
bun run start
bun run clean
```

What they do:

- `bun run dev` -> Turbo dev for workspace apps
- `bun run web` -> web dev server only
- `bun run api` -> API dev server only
- `bun run pipeline` -> starts the Python worker from `services/pipeline/`
- `bun run start` -> runs web preview and the compiled API binary together; build first so `api/main` exists

### Web

Common web commands:

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
- Wrangler deploy scripts also exist in `web/package.json` as `up` and `deploy`.

### API

Common API commands:

```bash
cd api
bun run dev
bun run build
bun run start
bun run push
bun run generate
```

Notes:

- Local API listens on port `8080`.
- `bun run build` compiles a standalone binary named `main`.
- `bun run push` pushes the Drizzle schema to the configured database.
- `bun run generate` runs Better Auth code generation.

### Pipeline

Common pipeline commands:

```bash
cd services/pipeline
bun run sync
bun run spacy
bun run dev
```

Notes:

- `bun run sync` installs Python dependencies through `uv`.
- `bun run spacy` installs the configured spaCy model wheel.
- `bun run dev` starts the Celery worker for the `profiling.jobs` queue.
- The worker needs a reachable broker through `CELERY_BROKER_URL`.
- The worker also needs callback settings such as `PIPELINE_CALLBACK_URL`, `PIPELINE_CALLBACK_SECRET`, and usually `PIPELINE_SECRET_HEADER_NAME`.

## Local runtime options

### Web + API only

```bash
bun install
bun run dev
```

This is enough for frontend and API work that does not require background processing.

### Local queue + worker helper

`docker-compose.yml` is for RabbitMQ plus the worker:

```bash
docker compose up -d rabbitmq pipeline-worker
```

What it gives you:

- local RabbitMQ on `5672`
- RabbitMQ management UI on `15672`
- a pipeline worker container wired to the local broker

What it does not give you:

- no web container
- no API container
- no database container

If your API is running locally, make sure the worker callback URL points somewhere the worker can reach.

## Environment touchpoints

Prefer example env files under `deploy/ec2/env/` as the durable reference for production-style variables:

- `deploy/ec2/env/api.env.example`
- `deploy/ec2/env/pipeline.env.example`

Common API env areas:

- database connection: `DATABASE_URL`
- auth: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- frontend origins: `FRONTEND_URL`, `FRONTEND_URLS`, `AUTH_COOKIE_CROSS_SITE`
- queue access: `CELERY_BROKER_URL`
- callback auth: `PIPELINE_CALLBACK_SECRET`, `PIPELINE_SECRET_HEADER_NAME`
- object storage: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- social auth providers: Google and GitHub client credentials

Common pipeline env areas:

- queue access: `CELERY_BROKER_URL`
- worker behavior: `CELERY_WORKER_POOL`, `CELERY_WORKER_CONCURRENCY`
- storage access: `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- callback target and auth: `PIPELINE_CALLBACK_URL`, `PIPELINE_CALLBACK_SECRET`, `PIPELINE_SECRET_HEADER_NAME`
- NLP/model settings: `SPACY_MODEL`, `SEMANTIC_MODEL_NAME`

Practical note: a working pipeline run needs both broker connectivity and callback configuration. A broker alone is not enough.

## Deployment references

### `deploy/`

Use `deploy/` as the home for deployment support files:

- `deploy/ec2/README.md` - current EC2 deployment runbook
- `deploy/ec2/bootstrap.sh` - host bootstrap helper
- `deploy/ec2/deploy.sh` - deployment script used on the server
- `deploy/ec2/env/*.example` - production env templates
- `deploy/nginx/api.conf` - nginx config for the API-facing production stack

### Production compose file

`docker-compose.prod.yml` defines a simple server runtime with:

- `nginx`
- `api`
- `pipeline`

The production compose file expects env files at:

- `./env/api.env`
- `./env/pipeline.env`

It does not define RabbitMQ, so production broker access must come from env configuration.

## Current mounted runtime surface

Useful operational endpoints and routes today:

- `GET /health` on the API
- Better Auth endpoints mounted by `authMiddleware`
- profiling session routes under `/api/v2/sessions`
- internal worker callback at `/api/internal/pipeline/callback`

Current backend layering note:

- `api/src/routes/` is transport-only and stays thin
- `api/src/usecases/` owns orchestration and HTTP-facing error mapping
- `api/src/repositories/` owns raw data access, cache updates, and persistence side effects

Repo note: `api/src/routes/files.ts` and `api/src/routes/system.ts` exist, but they are not mounted by `api/src/index.ts` today.

## Onboarding checklist

1. Install Bun and Python 3.12+.
2. Run `bun install` at repo root.
3. For pipeline work, run `cd services/pipeline && bun run sync`.
4. Create local env files based on the relevant examples and current deployment docs.
5. Start `bun run dev` for web + API.
6. If you need background profiling locally, either:
   - provide a real `CELERY_BROKER_URL` and run `bun run pipeline`, or
   - run `docker compose up -d rabbitmq pipeline-worker` and configure the callback URL correctly.

## Operational guardrails

- Prefer `core/` when documenting shared contracts; do not refer to `packages/shared`.
- Prefer `docker compose` spelling in docs and commands.
- Avoid stale local port claims; web is usually `5173`, API is `8080`.
- Keep pipeline notes explicit about external dependencies: broker access, object storage access, and callback auth all matter.
- When runtime entry points change, update `README.md`, `docs/README.md`, and `AGENTS.md` in the same pass.
