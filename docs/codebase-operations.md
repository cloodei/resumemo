# Codebase Operations Guide

## Project Summary
Recruiter-facing resume screening platform with AI-assisted ranking, search, export, and analytics. Built with NextJS for UI, ElysiaJS on Bun for API services, Postgres for data, and Drizzle ORM for typed persistence.

## Stack Overview
- **Frontend**: Vite + React 19, TypeScript, Tailwind CSS v4.
- **Backend**: ElysiaJS (Bun 1.3.6 runtime), TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
- **Storage**: Cloudflare R2 (S3-compatible) for raw resumes.
- **AI Pipeline**: Python 3.12+, Celery workers, spaCy, scikit-learn.
- **Message Broker**: RabbitMQ via CloudAMQP.
- **Infrastructure**: Docker Compose for local services, Turborepo for monorepo orchestration.

## Repository Layout
```
web/                        # Vite React application (port 5000)
api/                        # ElysiaJS API server (port 8080)
packages/shared/            # Types, Drizzle schemas, validation
services/pipeline/          # Python AI pipeline (Celery workers)
docs/                       # Project documentation
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

## Environment Variables (Template)
```
DATABASE_URL=postgres://...
OBJECT_STORAGE_URL=...
OBJECT_STORAGE_BUCKET=...
AUTH_SECRET=...
```

## Suggested Scripts (Example)
```
# root
bun run dev
bun run lint
bun run build

# web
bun run dev --filter web

# api
bun run dev --filter api
```

## Onboarding Checklist
- Configure environment variables.
- Start local database and storage services.
- Run migrations and seeds.
- Start `apps/api` and `apps/web`.

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
