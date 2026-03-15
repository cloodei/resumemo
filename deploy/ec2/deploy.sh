#!/usr/bin/env bash

set -euo pipefail

STACK_DIR="/opt/resumemo"
COMPOSE_FILE="$STACK_DIR/docker-compose.prod.yml"
HEALTH_URL="http://127.0.0.1/health"

# export GHCR_OWNER="${GHCR_OWNER:?GHCR_OWNER is required}"
export GHCR_OWNER="cloodei"
export API_IMAGE_TAG="${API_IMAGE_TAG:?API_IMAGE_TAG is required}"
# export PIPELINE_IMAGE_TAG="${PIPELINE_IMAGE_TAG:?PIPELINE_IMAGE_TAG is required}"
export PIPELINE_IMAGE_TAG="${API_IMAGE_TAG}"

docker compose -f "$COMPOSE_FILE" pull
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
docker compose -f "$COMPOSE_FILE" ps

for attempt in $(seq 1 20); do
	if curl -fsS "$HEALTH_URL" >/dev/null; then
		echo "API healthcheck passed on attempt $attempt"
		exit 0
	fi

	sleep 3
done

echo "API healthcheck failed after deployment" >&2
exit 1
