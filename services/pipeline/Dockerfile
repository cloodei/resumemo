FROM python:3.12-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock* ./

RUN uv pip install --system --no-cache .

RUN python -m spacy download en_core_web_md

COPY . .

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD celery -A worker inspect ping --timeout 5 || exit 1

CMD ["celery", "-A", "worker", "worker", "--loglevel=info", "--queues=profiling.jobs", "--concurrency=2"]
