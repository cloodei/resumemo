# Codebase Operations Guide

## Project Summary

Recruiter-facing resume screening platform with AI-assisted ranking, search, export, and analytics. Built with Vite + React for UI, ElysiaJS on Bun for API services, Postgres for data, and Drizzle ORM for typed persistence.

## Status

> ⚠️ **Early Development**: The AI pipeline and core features are functional but undergoing active iteration. Expect breaking changes.

## Stack Overview

| Layer | Technology |
|-------|------------|
| **Runtime** | Bun 1.3.6 |
| **Frontend** | Vite + React 19 + React Router DOM, Tailwind CSS v4 |
| **Backend** | ElysiaJS (Bun runtime), TypeScript |
| **Database** | PostgreSQL with Drizzle ORM |
| **Storage** | Cloudflare R2 (S3-compatible) for raw resumes |
| **AI Pipeline** | Python 3.12+, Celery workers, spaCy, scikit-learn |
| **Message Broker** | RabbitMQ via CloudAMQP |
| **Infrastructure** | Docker Compose for local services, Turborepo for monorepo orchestration |

## Repository Layout

```
resumemo/
├── web/                        # Vite React application (port 5000)
├── api/                        # ElysiaJS API server (port 8080)
├── packages/shared/            # Types, Drizzle schemas, constants
├── services/pipeline/          # Python AI pipeline (Celery workers)
├── docs/                       # Project documentation
├── docker-compose.yml          # Local RabbitMQ + pipeline worker
└── turbo.json                  # Turborepo configuration
```

## Key Domains

- **Resume Intake**: upload, file storage, metadata tracking.
- **Parsing**: text extraction, structured candidate fields.
- **Scoring**: model scoring and explainability payloads.
- **Search/Filter**: role, skills, experience, education, signals.
- **Export**: CSV/JSON results aligned with filters.
- **History**: past screening sessions and dashboards.

## Operational Conventions

- Keep raw files immutable; derived data is versioned.
- Every score includes explanation metadata for auditability.
- Search filters must be deterministic and cached where possible.
- Candidate data never mutates historical screens.

## Environment Variables

### API (`.env`)

```bash
DATABASE_URL=postgres://...
CLOUDAMQP_URL=amqps://user:pass@host.cloudamqp.com/vhost
PIPELINE_CALLBACK_SECRET=shared-secret-here

# R2 Storage
R2_ENDPOINT_URL=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=resumemo

# Auth
BETTER_AUTH_SECRET=...
```

### Pipeline (`services/pipeline/.env`)

```bash
CELERY_BROKER_URL=amqps://...
R2_ENDPOINT_URL=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=resumemo
PIPELINE_CALLBACK_SECRET=shared-secret-here
```

## Common Commands

### Root (Turborepo)

```bash
bun run dev              # Start web + api in dev mode
bun run build            # Build all packages
bun run lint             # Lint all packages
bun run start            # Production mode
bun run web              # Dev mode web only
bun run api              # Dev mode api only
bun run clean            # Clean build artifacts
```

### Web

```bash
cd web
bun run dev              # Start dev server (port 5000)
bun run build            # Production build
bun run lint             # Run ESLint
bun run preview          # Preview production build
```

### API

```bash
cd api
bun run dev              # Watch mode (port 8080)
bun run build            # Compile to standalone binary
bun run push             # Push Drizzle schema to database
bun run generate         # Generate Better Auth files
```

### Pipeline (Docker Compose)

```bash
# Start local RabbitMQ + pipeline worker
docker-compose up -d

# View logs
docker-compose logs -f pipeline-worker

# Stop
docker-compose down
```

### Pipeline (Local Python)

```bash
cd services/pipeline

# Install with uv
uv sync

# Run worker
celery -A worker worker --loglevel=info --queues=profiling.jobs
```

## Onboarding Checklist

1. Install Bun 1.3.6+
2. Configure environment variables (`.env` files)
3. Run `bun install`
4. Start database and run migrations: `cd api && bun run push`
5. Start services: `bun run dev`
6. (Optional) Start pipeline worker: `docker-compose up -d`

## AI Pipeline Documentation

The AI profiling pipeline is fully specified in [`docs/pipeline-spec.md`](./pipeline-spec.md). That document is the authoritative reference covering:

- Architecture (Celery workers on Python, RabbitMQ via CloudAMQP, HTTP callbacks to Elysia)
- Pipeline stages (text extraction, structured parsing, TF-IDF scoring, template-based summarization)
- Message contracts (job messages, progress/completion/error callbacks)
- Database schema additions (`pipeline_job`, `candidate_result`)
- API surface changes (callback endpoint, results endpoints, export)
- Infrastructure, configuration, error handling, security, versioning
- Implementation phases and decision log

The pipeline lives in `services/pipeline/` as a standalone Python project, separate from the Bun workspace.
