# Architecture and Structure Guidelines

## Goal

Provide a scalable, modular architecture for a recruiter-focused resume screening platform built with Vite + React (frontend) and ElysiaJS (backend on Bun), backed by Postgres and Drizzle ORM.

This document is written in a system prompt style for AI agents and contributors.

## Status

> ⚠️ **Early Development**: The AI pipeline and core features are functional but undergoing active iteration. Expect breaking changes.

## Architectural Principles

- Separate UI, API, and ML services for clean ownership and scaling.
- Keep parsing and ranking pipelines independent from core app logic.
- Optimize for explainability, auditability, and reproducibility.
- Favor modular, versioned services over monolith-only deployments.

## System Components

**Frontend (Vite + React 19)**
- Recruiter UI for upload, search, scoring, and exports.
- Admin UI for roles, permissions, and configuration.
- Dashboard UI for pipeline metrics and historical review.

**Backend (ElysiaJS on Bun)**
- API gateway for auth, resume ingestion, and candidate data access.
- Parsing service interface (pipeline orchestration layer).
- Scoring service interface (model routing, weights, rule adjustments).

**AI Pipeline (Python + Celery)**
- Background workers for text extraction, NLP parsing, and scoring.
- RabbitMQ message queue for job distribution.
- HTTP callbacks for result persistence.

**Data Layer**
- Postgres for canonical data (candidates, roles, job postings, scores).
- Cloudflare R2 for raw resume storage.
- Drizzle ORM for typed schema and queries.

## Service Boundaries (Logical)

- **Resume Service**: Ingestion, storage pointers, and parsing initiation.
- **Candidate Service**: Structured fields, search index, filters.
- **Scoring Service**: Model routing, scoring policies, explainability data.
- **Export Service**: CSV/JSON export with filter context.
- **Audit Service**: Immutable logs of uploads, exports, and score changes.

## Folder Structure

```
resumemo/
├── web/                        # Vite React application
│   ├── src/pages/              # Route pages
│   ├── src/components/         # React components (ui/ for primitives)
│   ├── src/hooks/              # Custom hooks
│   ├── src/stores/             # Zustand stores
│   ├── src/lib/                # API client, utilities, auth
│   ├── src/routes/             # React Router definitions
│   └── src/layouts/            # Layout components
├── api/                        # ElysiaJS API server
│   ├── src/index.ts            # Server entry
│   ├── src/routes/             # HTTP routes per domain
│   │   ├── sessions/           # Profiling session endpoints
│   │   ├── files.ts            # File upload endpoints
│   │   ├── pipeline.ts         # Internal callback endpoint
│   │   └── system.ts           # Health/auth endpoints
│   └── src/lib/                # DB, auth, storage, utilities
├── packages/
│   └── shared/                 # Types, Drizzle schemas, constants
│       └── src/
│           ├── schemas/        # Database table definitions
│           ├── types/          # TypeScript type exports
│           └── constants/      # Shared constants
├── services/
│   └── pipeline/               # Python AI pipeline (Celery workers)
│       ├── pipeline/           # Core modules (extract, parse, score, summarize)
│       ├── worker.py           # Celery worker entry
│       └── pyproject.toml      # Python dependencies
├── docs/                       # Documentation
├── docker-compose.yml          # Local RabbitMQ + pipeline worker
└── turbo.json                  # Turborepo configuration
```

## Backend (ElysiaJS) Layout

```
api/
  src/
    index.ts                # Server entry, route composition
    routes/                 # HTTP routes per domain
      sessions/             # Profiling session endpoints (v1, v2)
      files.ts              # File upload endpoints
      pipeline.ts           # Internal callback endpoint
      system.ts             # Health/auth endpoints
    lib/
      db.ts                 # Drizzle database connection
      auth.ts               # Better Auth + auth macro
      storage.ts            # R2/S3 file operations
      queue.ts              # RabbitMQ publishing
```

## Frontend (Vite + React) Layout

```
web/
  src/
    main.tsx                # Entry point
    App.tsx                 # Route composition
    routes/
      route-defs.tsx        # Central route definitions
    pages/                  # Route page components
    components/             # UI building blocks
      ui/                   # shadcn-style primitives
    hooks/                  # Custom React hooks
    stores/                 # Zustand stores
    lib/
      api.ts                # Eden Treaty client
      auth.ts               # Better Auth client
      utils.ts              # Utilities (cn, etc.)
    layouts/                # Layout components
```

## Agent Guidance (Prompt Style)

- Prefer domain service boundaries over route logic.
- Keep search/filter logic centralized and reusable.
- Persist both raw and extracted candidate data for auditability.
- Preserve historical screening snapshots; do not overwrite prior results.
- Ensure every candidate score stores an explanation payload.

## Data Flow (High Level)

1. Recruiter uploads resumes.
2. API stores file metadata + raw file in R2.
3. Recruiter starts profiling session.
4. API publishes job to RabbitMQ.
5. Pipeline worker fetches files, extracts text, parses, scores.
6. Worker POSTs results to API callback endpoint.
7. API stores results in Postgres.
8. UI queries and displays ranked candidates.

## Extensibility Notes

- Parsing/scoring services are modular and can be updated independently.
- Version scoring models and track which model produced each score.
- Pipeline uses HTTP callbacks, allowing workers to be deployed separately from the API.

## Roadmap

### Current Focus (Early Stage)

- [ ] Pipeline stability and error handling
- [ ] Frontend results page improvements
- [ ] Export functionality (CSV/JSON)
- [ ] Session history and dashboards

### Planned Features

- [ ] OCR support for scanned PDFs
- [ ] Semantic embeddings (sentence-transformers)
- [ ] Real-time progress (WebSocket/SSE)
- [ ] Multi-language support
- [ ] Custom-trained NER model

### Deferred Decisions

| Question | Current State | Revisit When |
|----------|---------------|--------------|
| OCR for scanned PDFs | Not supported; produces score 0 | User feedback indicates need |
| Semantic embeddings vs TF-IDF | TF-IDF for simplicity | Scoring accuracy needs improvement |
| Real-time progress | Frontend polls for status | Polling latency unacceptable |
| Celery result backend | Not used; callbacks via HTTP | Need monitoring dashboards |
