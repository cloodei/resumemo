FROM python:3.12-slim

WORKDIR /app

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files first for caching
COPY pyproject.toml uv.lock* ./

# Install dependencies
RUN uv pip install --system --no-cache .

# Download spaCy model
RUN python -m spacy download en_core_web_md

# Copy application code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD celery -A worker inspect ping --timeout 5 || exit 1

# Run the Celery worker
CMD ["celery", "-A", "worker", "worker", "--loglevel=info", "--queues=profiling.jobs", "--concurrency=2"]
