FROM python:3.15-rc-alpine AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	UV_LINK_MODE=copy \
	UV_COMPILE_BYTECODE=1

FROM base AS builder

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.10.9-python3.13-trixie /uv /uvx /usr/local/bin/
COPY services/pipeline/pyproject.toml services/pipeline/uv.lock ./

RUN uv sync --frozen --no-dev --no-install-project

COPY services/pipeline ./

RUN uv sync --frozen --no-dev

FROM base AS runtime

WORKDIR /app

COPY --from=builder /app /app

ENV PATH="/app/.venv/bin:$PATH"

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
	CMD celery -A worker inspect ping --timeout=5 || exit 1

CMD ["celery", "-A", "worker", "worker", "--loglevel=info", "--queues=profiling.jobs", "--pool=solo", "--concurrency=2"]
