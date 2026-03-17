"""HTTP callback to the Elysia API for reporting pipeline results."""

from __future__ import annotations

import logging
import time

import httpx

from config import (
    CALLBACK_RETRY_ATTEMPTS,
    CALLBACK_RETRY_BACKOFF,
    PIPELINE_CALLBACK_SECRET,
    PIPELINE_CALLBACK_URL,
    PIPELINE_SECRET_HEADER_NAME,
)
from models import JobPayload

logger = logging.getLogger(__name__)
headers = {
    PIPELINE_SECRET_HEADER_NAME: PIPELINE_CALLBACK_SECRET,
    "Content-Type": "application/json",
}


def _post_callback(payload: JobPayload, body: dict):
    """POST a callback to the Elysia API with retry logic."""
    last_error: Exception | None = None

    for attempt in range(CALLBACK_RETRY_ATTEMPTS):
        try:
            with httpx.Client(timeout=30) as client:
                response = client.post(PIPELINE_CALLBACK_URL, json=body, headers=headers)
                response.raise_for_status()

            return

        except (httpx.HTTPError, httpx.TimeoutException) as error:
            last_error = error
            if attempt < CALLBACK_RETRY_ATTEMPTS - 1:
                delay = CALLBACK_RETRY_BACKOFF[attempt]
                time.sleep(delay)

    logger.error(
        "All callback attempts failed",
        extra={
            "session_id": payload.session_id,
            "run_id": payload.run_id,
            "type": body.get("type"),
            "error": str(last_error),
        },
    )
    raise RuntimeError(f"Failed to send callback after {CALLBACK_RETRY_ATTEMPTS} attempts: {last_error}")


def send_completion(payload: JobPayload, results: list[dict]):
    """Send a completion callback with all results."""
    body = {
        "type": "completion",
        "session_id": payload.session_id,
        "run_id": payload.run_id,
        "status": "completed",
        "results": results,
    }
    _post_callback(payload, body)


def send_error(
    payload: JobPayload,
    error: str,
    partial_results: list[dict] | None = None,
):
    """Send an error callback."""
    body = {
        "type": "error",
        "session_id": payload.session_id,
        "run_id": payload.run_id,
        "status": "failed",
        "error": error,
        "partial_results": partial_results or [],
    }
    try:
        _post_callback(payload, body)
    except RuntimeError:
        logger.error(
            "Error callback failed",
            extra={
                "session_id": payload.session_id,
                "run_id": payload.run_id,
                "error": error,
            },
        )
