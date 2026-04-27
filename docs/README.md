# Documentation Map

Use this index to find the current source of truth before relying on older plans or design notes.

## Current / Core Docs

- `README.md` - main project entry point, current product summary, and quick start
- `AGENTS.md` - contributor and coding-agent guide for repo structure, commands, and conventions
- `docs/architecture-structure.md` - current architecture snapshot and subsystem boundaries
- `docs/system-guidelines.md` - current product behavior and workflow guidance
- `docs/codebase-operations.md` - repo operations, environment, and deployment notes
- `docs/pipeline-spec.md` - current v2 pipeline contract and official AI artifact model
- `research/README.md` - map of research material behind the production pipeline

Current backend implementation notes:

- `api/src/routes/` stays thin and delegates HTTP behavior to usecases in `api/src/usecases/`.
- `api/src/repositories/` is the raw data-access layer and should not return HTTP-oriented wrapper states.
- The mounted product API is the `/api/v2` profiling flow plus `/api/internal/pipeline/callback`.
- JD template routes under `/api/v2/sessions/job-description-templates` support frequently reused role briefs without duplicating JD text on every session.
- There is no mounted `/api/v3` screening path in this checkout.

## Operational Docs

- `deploy/ec2/README.md` - EC2 deployment runbook for the current server flow
- `docker-compose.yml` - local RabbitMQ and pipeline worker runtime helper
- `docker-compose.prod.yml` - production compose stack for `nginx`, `api`, and `pipeline`
- `deploy/ec2/env/api.env.example` - production API env reference
- `deploy/ec2/env/pipeline.env.example` - production pipeline env reference

## Research Reference

- `research/` contains notebooks, data, processed taxonomy assets, papers, and algorithm notes.
- Production code must live in `services/pipeline/`; research files are references and fixtures unless explicitly copied into runtime assets.

## Historical Docs

- `docs/ml-pipeline-architecture.md` - legacy pipeline design reference; not the current source of truth
- Older documents may describe planned or superseded architecture. Prefer files in the current/core section when guidance conflicts.

## Working Plans

- `docs/plans/` - implementation plans, design drafts, and work-in-progress decision records
- Plans are useful context, but they do not override live code or current-state docs unless implemented and reflected in the core docs.

## Maintenance Rule

When the repo structure, runtime surface, routes, scripts, or deployment entry points change, update at least:

- `README.md`
- `docs/README.md`
- `AGENTS.md`

If the change affects runtime contracts or operations, update the relevant core doc in `docs/` in the same pass.
