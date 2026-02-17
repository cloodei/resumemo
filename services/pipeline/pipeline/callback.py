"""HTTP callback to the Elysia API for reporting pipeline progress and results."""

from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING

import httpx

from pipeline.config import CALLBACK_RETRY_ATTEMPTS, CALLBACK_RETRY_BACKOFF, PIPELINE_VERSION

if TYPE_CHECKING:
    from pipeline.models import JobPayload

logger = logging.getLogger(__name__)


def _post_callback(payload: "JobPayload", body: dict) -> None:
    """POST a callback to the Elysia API with retry logic."""
    headers = {
        "Authorization": f"Bearer {payload.callback_secret}",
        "Content-Type": "application/json",
    }

    last_error: Exception | None = None

    for attempt in range(CALLBACK_RETRY_ATTEMPTS):
        try:
            with httpx.Client(timeout=30) as client:
                response = client.post(payload.callback_url, json=body, headers=headers)
                response.raise_for_status()

            logger.info(
                "Callback sent successfully",
                extra={
                    "job_id": payload.job_id,
                    "type": body.get("type"),
                    "attempt": attempt + 1,
                },
            )
            return

        except (httpx.HTTPError, httpx.TimeoutException) as e:
            last_error = e
            if attempt < CALLBACK_RETRY_ATTEMPTS - 1:
                delay = CALLBACK_RETRY_BACKOFF[attempt]
                logger.warning(
                    "Callback failed, retrying",
                    extra={
                        "job_id": payload.job_id,
                        "attempt": attempt + 1,
                        "delay_s": delay,
                        "error": str(e),
                    },
                )
                time.sleep(delay)

    logger.error(
        "All callback attempts failed",
        extra={
            "job_id": payload.job_id,
            "type": body.get("type"),
            "error": str(last_error),
        },
    )
    raise RuntimeError(f"Failed to send callback after {CALLBACK_RETRY_ATTEMPTS} attempts: {last_error}")


def send_progress(
    payload: "JobPayload",
    processed: int,
    total: int,
    current_file: str | None,
) -> None:
    """Send a progress update callback."""
    body = {
        "type": "progress",
        "session_id": payload.session_id,
        "job_id": payload.job_id,
        "status": "running",
        "processed_files": processed,
        "total_files": total,
        "current_file": current_file,
    }
    try:
        _post_callback(payload, body)
    except RuntimeError:
        # Progress callbacks are best-effort — don't crash the pipeline
        logger.warning("Progress callback failed, continuing", extra={"job_id": payload.job_id})


def send_completion(payload: "JobPayload", results: list[dict]) -> None:
    """Send a completion callback with all results."""
    body = {
        "type": "completion",
        "session_id": payload.session_id,
        "job_id": payload.job_id,
        "status": "completed",
        "pipeline_version": PIPELINE_VERSION,
        "processed_files": len(results),
        "total_files": len(payload.files),
        "results": results,
    }
    _post_callback(payload, body)


def send_error(
    payload: "JobPayload",
    error: str,
    partial_results: list[dict] | None = None,
) -> None:
    """Send an error callback."""
    body = {
        "type": "error",
        "session_id": payload.session_id,
        "job_id": payload.job_id,
        "status": "failed",
        "error": error,
        "processed_files": len(partial_results) if partial_results else 0,
        "total_files": len(payload.files),
        "partial_results": partial_results or [],
    }
    try:
        _post_callback(payload, body)
    except RuntimeError:
        # If error callback itself fails, log and let Celery handle the retry
        logger.error("Error callback failed", extra={"job_id": payload.job_id, "error": error})
