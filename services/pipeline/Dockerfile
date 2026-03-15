FROM python:3.15-rc-alpine AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	UV_LINK_MODE=copy \
	UV_COMPILE_BYTECODE=1

FROM base AS builder

WORKDIR /app

FROM astral/uv:alpine AS uv
COPY services/pipeline/pyproject.toml services/pipeline/uv.lock ./

RUN uv sync --frozen --no-dev --no-install-project

COPY services/pipeline ./

# RUN uv sync --frozen --no-dev

RUN uv add https://github.com/explosion/spacy-models/releases/download/en_core_web_md-3.8.0/en_core_web_md-3.8.0-py3-none-any.whl

FROM base AS runtime

WORKDIR /app

COPY --from=builder /app /app

ENV PATH="/app/.venv/bin:$PATH"

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
	CMD /app/.venv/bin/celery -A worker inspect ping --timeout=5 || exit 1

CMD ["uv", "run", "celery", "-A", "worker", "worker", "--loglevel=info", "--queues=profiling.jobs", "--pool=solo", "--concurrency=2"]
