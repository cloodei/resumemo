#!/usr/bin/env bash

set -euo pipefail

COMPOSE_FILE="/opt/resumemo/docker-compose.prod.yml"
HEALTH_URL="http://127.0.0.1/health"

export GHCR_OWNER="${GHCR_OWNER:-cloodei}"
export API_IMAGE_TAG="${API_IMAGE_TAG:?API_IMAGE_TAG is required}"
export PIPELINE_IMAGE_TAG="${PIPELINE_IMAGE_TAG:?PIPELINE_IMAGE_TAG is required}"

docker compose -f "$COMPOSE_FILE" pull api pipeline nginx
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
docker compose -f "$COMPOSE_FILE" ps
docker system prune --volumes --all --force

for attempt in $(seq 1 5); do
	if curl -fsS "$HEALTH_URL" >/dev/null; then
		echo "API healthcheck passed on attempt $attempt"
		exit 0
	fi

	sleep 2
done

echo "API healthcheck failed after deployment" >&2
exit 1
