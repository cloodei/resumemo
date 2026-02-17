# Architecture and Structure Guidelines

## Goal
Provide a scalable, modular architecture for a recruiter-focused resume screening platform built with NextJS (frontend) and ElysiaJS (backend on Bun), backed by Postgres and Drizzle ORM.

This document is written in a system prompt style for AI agents and contributors.

## Architectural Principles
- Separate UI, API, and ML services for clean ownership and scaling.
- Keep parsing and ranking pipelines independent from core app logic.
- Optimize for explainability, auditability, and reproducibility.
- Favor modular, versioned services over monolith-only deployments.

## System Components
**Frontend (NextJS)**
- Recruiter UI for upload, search, scoring, and exports.
- Admin UI for roles, permissions, and configuration.
- Dashboard UI for pipeline metrics and historical review.

**Backend (ElysiaJS on Bun)**
- API gateway for auth, resume ingestion, and candidate data access.
- Parsing service interface (pipeline orchestration layer).
- Scoring service interface (model routing, weights, rule adjustments).

**Data Layer**
- Postgres for canonical data (candidates, roles, job postings, scores).
- Object storage for raw resumes.
- Drizzle ORM for typed schema and queries.

## Service Boundaries (Logical)
- **Resume Service**: Ingestion, storage pointers, and parsing initiation.
- **Candidate Service**: Structured fields, search index, filters.
- **Scoring Service**: Model routing, scoring policies, explainability data.
- **Export Service**: CSV/JSON export with filter context.
- **Audit Service**: Immutable logs of uploads, exports, and score changes.

## Folder Structure (Proposed)
```
resumemo/
  apps/
    web/                    # NextJS recruiter/admin UI
    api/                    # ElysiaJS API (Bun runtime)
  packages/
    db/                     # Drizzle schema and migrations
    shared/                 # Types, validation schemas, utilities
    ui/                     # Reusable UI components
  services/
    parser/                 # NLP parsing pipeline (future)
    scorer/                 # ML ranking pipeline (future)
  infra/
    docker/                 # Dockerfiles and compose
    scripts/                # Setup, migration, seeding scripts
  docs/
    system-guidelines.md
    architecture-structure.md
    codebase-operations.md
```

## Backend (ElysiaJS) Layout
```
apps/api/
  src/
    index.ts                # Server entry
    routes/                 # HTTP routes per domain
    middleware/             # Auth, logging, validation
    services/               # Domain services (resume, scoring, export)
    repositories/           # DB access (Drizzle)
    schemas/                # Validation and DTOs
    integrations/           # Storage, external APIs
```

## Frontend (NextJS) Layout
```
apps/web/
  app/                      # App Router pages
  components/               # UI building blocks
  features/                 # Domain features (search, ranking, export)
  hooks/                    # UI state and data hooks
  lib/                      # API clients, helpers
```

## Agent Guidance (Prompt Style)
- Prefer domain service boundaries over route logic.
- Keep search/filter logic centralized and reusable.
- Persist both raw and extracted candidate data for auditability.
- Preserve historical screening snapshots; do not overwrite prior results.
- Ensure every candidate score stores an explanation payload.

## Data Flow (High Level)
1. Recruiter uploads resumes.
2. API stores file metadata + raw file pointer.
3. Parsing pipeline extracts structured data into Postgres.
4. Scoring pipeline generates scores and explanations.
5. UI queries and filters candidate data and exports results.

## Extensibility Notes
- Parsing/scoring services can start as stub modules and later evolve.
- Version scoring models and track which model produced each score.
- Reserve room for implementing and integrating AI service once ML pipeline begins.
