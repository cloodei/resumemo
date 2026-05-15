# Codebase Operations

This guide covers current commands, runtime dependencies, and operational touchpoints.

## Runtime Shape

```text
web                 Vite + React recruiter UI
api                 Bun + Elysia API
core                shared TypeScript contracts
services/pipeline   official Python AI worker
research            AI reference material and taxonomy assets
```

The pipeline is not part of the Bun workspaces. It is a separate Python project under `services/pipeline/`, started through root scripts for convenience.

## Commands

Root commands:

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

Workspace commands:

```bash
cd web
bun run dev
bun run build
bun run lint
bun run preview

cd api
bun run dev
bun run build
bun run start
bun run push
bun run generate

cd services/pipeline
bun run sync
bun run dev
```

Repository workflow note: do not run build, lint, or test commands unless explicitly requested.

## Local Queue + Worker

`docker-compose.yml` is a helper for RabbitMQ plus the pipeline worker:

```bash
docker compose up -d rabbitmq pipeline-worker
```

The API and web app still run separately unless you start them yourself. If your API is running locally, make sure the worker callback URL points somewhere the worker can reach.

The local compose worker mounts `services/pipeline` into `/app`, including packaged runtime taxonomy and ChromaDB assets under `services/pipeline/data/`.

## API Environment Touchpoints

The API needs:

- `DATABASE_URL`
- auth settings used by Better Auth
- object storage settings used for presigned uploads
- `CELERY_BROKER_URL`
- `PIPELINE_CALLBACK_SECRET`
- `PIPELINE_SECRET_HEADER_NAME`

The API publishes jobs to `profiling.jobs` and accepts worker callbacks at `/api/internal/pipeline/callback`.

## Pipeline Environment Touchpoints

The worker needs broker, callback, object storage, and AI pipeline settings:

- `CELERY_BROKER_URL`
- `PIPELINE_CALLBACK_URL`
- `PIPELINE_CALLBACK_SECRET`
- `PIPELINE_SECRET_HEADER_NAME`
- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `PIPELINE_TAXONOMY_DIR`
- `PIPELINE_CHROMA_DB_PATH`
- `EMBEDDING_MODEL_NAME`
- `GLINER_MODEL_NAME`
- `GEMINI_API_KEY`
- `GEMINI_MODEL_NAME`
- `ENABLE_GEMINI_SEGMENTATION`
- `ENABLE_SEMANTIC_TAXONOMY_MAPPING`

Defaults:

- `PIPELINE_TAXONOMY_DIR` defaults to `services/pipeline/data/taxonomy` when packaged assets exist, with `research/data/taxonomy/taxonomy_processed` as a local fallback.
- `PIPELINE_CHROMA_DB_PATH` defaults to `services/pipeline/data/chroma_db` when packaged assets exist, with `research/data/chroma_db` as a local fallback.
- `EMBEDDING_MODEL_NAME` defaults to `sentence-transformers/all-MiniLM-L6-v2`.
- `GLINER_MODEL_NAME` defaults to `urchade/gliner_multi-v2.1`.
- Gemini segmentation is optional and disabled by default.

Practical note: a working pipeline run needs broker connectivity, object storage access, callback auth, and readable taxonomy assets. A broker alone is not enough.

## Pipeline Artifacts

The worker stores artifact data through the existing callback fields:

- `parsed_profile`: candidate DNA profile
- `score_breakdown.job_description_artifact`: enriched JD artifact
- `score_breakdown.score_artifact`: composite scoring artifact
- `overall_score`: total ranking score

The API persists these values in the existing `candidate_result` table for the active run.

## Database Notes

The active profiling data model is intentionally small:

- `job_description_template` stores each distinct per-user JD text once, with `use_count` and `last_used_at` for frequent-template selection.
- `profiling_session` references `job_description_template` through `job_description_template_id`; the public API still returns `jobDescription` by joining to the template row.
- `candidate_result` stores candidate DNA in `parsed_profile` and score artifacts in `score_breakdown`.
- Historical screening-schema tables are removed by the cleanup migration and should not be treated as live product data.

## Deployment References

- `docker-compose.prod.yml`
- `deploy/ec2/README.md`
- `deploy/ec2/env/api.env.example`
- `deploy/ec2/env/pipeline.env.example`
- `deploy/nginx/`

Production compose currently includes `nginx`, `api`, and `pipeline`. RabbitMQ is expected through environment configuration.

## Maintenance Notes

- Keep runtime command docs aligned with `package.json`.
- Keep pipeline contract changes aligned across `docs/pipeline-spec.md`, `README.md`, `docs/README.md`, and `AGENTS.md`.
- Do not document absent `/api/v3` or `services/pipeline-v3/` surfaces as current runtime.
- Keep recruiter-facing behavior docs separate from research-heavy implementation detail.
