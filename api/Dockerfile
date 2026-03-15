FROM oven/bun:1.3.9-alpine AS builder

WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json
COPY core/package.json ./core/package.json

RUN bun install --frozen-lockfile

COPY api ./api
COPY core ./core

WORKDIR /app/api
RUN bun build --compile --minify --target=bun-linux-x64-baseline --outfile main index.ts

FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chmod=755 /app/api/main ./main

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1

CMD ["./main"]
