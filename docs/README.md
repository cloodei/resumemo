# Documentation Map

Use this index to find the current source of truth before relying on older plans or design notes.

## Current / Core Docs

- `README.md` - main project entry point, current product summary, and quick start
- `AGENTS.md` - contributor and coding-agent guide for repo structure, commands, and conventions
- `docs/architecture-structure.md` - current architecture snapshot and subsystem boundaries
- `docs/system-guidelines.md` - current product behavior and workflow guidance
- `docs/codebase-operations.md` - repo operations, environment, and deployment notes
- `docs/pipeline-spec.md` - current pipeline contract and implementation snapshot

## Operational Docs

- `deploy/ec2/README.md` - EC2 deployment runbook for the current server flow
- `docker-compose.yml` - local RabbitMQ and pipeline worker runtime
- `docker-compose.prod.yml` - production compose stack for `nginx`, `api`, and `pipeline`
- `deploy/ec2/env/api.env.example` - production API env reference
- `deploy/ec2/env/pipeline.env.example` - production pipeline env reference

## Historical Docs

- `docs/ml-pipeline-architecture.md` - legacy pipeline design reference; not the current source of truth
- Older documents may describe planned or superseded architecture. Prefer files in the current/core section when guidance conflicts.

## Working Plans

- `docs/plans/` - implementation plans, design drafts, and work-in-progress decision records
- Plans are useful context, but they do not override live code or current-state docs unless they have been implemented and the main docs were updated

## Maintenance Rule

When the repo structure, runtime surface, routes, or deployment entry points change, update at least:

- `README.md`
- `docs/README.md`
- `AGENTS.md`

If the change affects runtime contracts or operations, update the relevant core doc in `docs/` in the same pass.
