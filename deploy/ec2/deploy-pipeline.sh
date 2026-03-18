#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="/opt/resumemo"
APP_DIR="${APP_ROOT}/pipeline-app"
BACKUP_DIR="${APP_ROOT}/backups"
ROLLBACK_ARCHIVE="${BACKUP_DIR}/pipeline-app-prev.tar.gz"
ARTIFACT_PATH="${PIPELINE_ARTIFACT_PATH:-${APP_ROOT}/pipeline-deploy.tar.gz}"
ENV_FILE="${APP_ROOT}/env/pipeline.env"
SERVICE_NAME="resumemo-pipeline.service"
UV_BIN="${UV_BIN:-/usr/local/bin/uv}"

LOG_DIR="/var/log/resumemo"
LOG_FILE="${LOG_DIR}/pipeline-deploy.log"

DEPLOY_SHA="${DEPLOY_SHA:-unknown}"
DEPLOY_RUN_ID="${DEPLOY_RUN_ID:-manual}"
MIN_FREE_KB="${MIN_FREE_KB:-1572864}"

CURRENT_STAGE="init"
SNAPSHOT_READY=0

log_event() {
	local level="$1"
	local message="$2"
	local ts
	ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

	local line
	line="ts=${ts} level=${level} stage=${CURRENT_STAGE} deploy_sha=${DEPLOY_SHA} deploy_run_id=${DEPLOY_RUN_ID} message=${message}"

	printf '%s\n' "$line" | tee -a "$LOG_FILE" >/dev/null
	logger -t resumemo-pipeline-deploy "$line"
}

ensure_prerequisites() {
	CURRENT_STAGE="preflight"
	mkdir -p "$APP_DIR" "$BACKUP_DIR" "$LOG_DIR"

	if [ ! -f "$ARTIFACT_PATH" ]; then
		log_event "error" "artifact_missing path=${ARTIFACT_PATH}"
		exit 1
	fi

	if [ ! -f "$ENV_FILE" ]; then
		log_event "error" "env_missing path=${ENV_FILE}"
		exit 1
	fi

	if [ ! -x "$UV_BIN" ]; then
		log_event "error" "uv_missing"
		exit 1
	fi

	local free_kb
	free_kb="$(df -Pk "$APP_ROOT" | awk 'NR==2 { print $4 }')"
	if [ "$free_kb" -lt "$MIN_FREE_KB" ]; then
		log_event "error" "insufficient_disk free_kb=${free_kb} required_kb=${MIN_FREE_KB}"
		exit 1
	fi
}

create_snapshot() {
	CURRENT_STAGE="snapshot"
	rm -f "$ROLLBACK_ARCHIVE"

	if [ -d "$APP_DIR" ] && [ -n "$(ls -A "$APP_DIR" 2>/dev/null)" ]; then
		tar --exclude='.venv' --exclude='__pycache__' --exclude='*.pyc' -czf "$ROLLBACK_ARCHIVE" -C "$APP_DIR" .
		SNAPSHOT_READY=1
		log_event "info" "snapshot_created archive=${ROLLBACK_ARCHIVE}"
	else
		log_event "info" "snapshot_skipped_empty_app_dir"
	fi
}

restore_snapshot() {
	CURRENT_STAGE="rollback"

	if [ "$SNAPSHOT_READY" -ne 1 ] || [ ! -f "$ROLLBACK_ARCHIVE" ]; then
		log_event "error" "rollback_unavailable"
		return 1
	fi

	rm -rf "$APP_DIR"
	mkdir -p "$APP_DIR"
	tar -xzf "$ROLLBACK_ARCHIVE" -C "$APP_DIR"

	(
		cd "$APP_DIR"
		uv sync --frozen --no-dev
	)

	sudo systemctl restart "$SERVICE_NAME"
	sudo systemctl is-active --quiet "$SERVICE_NAME"

	log_event "warn" "rollback_success"
	return 0
}

on_error() {
	local exit_code="$?"
	trap - ERR

	log_event "error" "deploy_failed exit_code=${exit_code}"

	if restore_snapshot; then
		log_event "warn" "deploy_rolled_back"
	else
		log_event "error" "rollback_failed"
	fi

	exit "$exit_code"
}

trap on_error ERR

CURRENT_STAGE="start"
log_event "info" "deploy_started artifact=${ARTIFACT_PATH}"

ensure_prerequisites
create_snapshot

CURRENT_STAGE="extract"
find "$APP_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf "$ARTIFACT_PATH" -C "$APP_DIR" --strip-components=2
log_event "info" "artifact_extracted app_dir=${APP_DIR}"

CURRENT_STAGE="sync"
(
	cd "$APP_DIR"
	uv sync --frozen --no-dev
	uv run --no-sync python -c "import worker"
)
log_event "info" "uv_sync_complete"

CURRENT_STAGE="restart"
sudo systemctl daemon-reload
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl is-active --quiet "$SERVICE_NAME"
log_event "info" "service_active service=${SERVICE_NAME}"

CURRENT_STAGE="cleanup"
rm -f "$ARTIFACT_PATH"
log_event "info" "artifact_removed path=${ARTIFACT_PATH}"

CURRENT_STAGE="done"
log_event "info" "deploy_success"
