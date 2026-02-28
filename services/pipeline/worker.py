"""
Celery application and task definitions for the Resumemo profiling pipeline.

Start the worker with:
    celery -A worker worker --loglevel=info --queues=profiling.jobs
"""

import logging
import time

from celery import Celery
from celery.exceptions import SoftTimeLimitExceeded

from utils.callback import send_completion, send_error
from stages.extract import extract_text
from models import FileManifestItem, JobPayload, FileResult
from stages.parse import parse_resume
from stages.score import score_resume
from utils.storage import fetch_file
from stages.summarize import summarize_candidate

logger = logging.getLogger(__name__)

app = Celery("pipeline")
app.config_from_object("celeryconfig")


@app.task(
    name="pipeline.process_session",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    reject_on_worker_lost=True,
)
def process_session(self, raw_payload: dict):
    """Process all resumes in a profiling session.

    Fetches files from R2, runs extract -> parse -> score -> summarize,
    and POSTs results back to the Elysia API via HTTP callback.
    """
    payload = JobPayload.model_validate(raw_payload)

    logger.info(
        "Starting pipeline job",
        extra={
            "session_id": payload.session_id,
            "total_files": len(payload.files),
            "pipeline_version": payload.pipeline_version,
        },
    )

    results: list[dict] = []
    errors: list[dict] = []

    try:
        for i, file in enumerate(payload.files):
            file_start = time.monotonic()

            try:
                result = _process_single_file(file, payload)
                results.append(result)
            except Exception as e:
                logger.error(
                    "Failed to process file",
                    extra={
                        "session_id": payload.session_id,
                        "file_id": file.file_id,
                        "original_name": file.original_name,
                        "error": str(e),
                    },
                    exc_info=True,
                )
                errors.append({
                    "file_id": file.file_id,
                    "original_name": file.original_name,
                    "error": str(e),
                })

            elapsed = time.monotonic() - file_start
            logger.info(
                "File processed",
                extra={
                    "session_id": payload.session_id,
                    "file_id": file.file_id,
                    "file_index": f"{i + 1}/{len(payload.files)}",
                    "duration_ms": round(elapsed * 1000),
                    "success": len(errors) == 0 or errors[-1].get("file_id") != file.file_id,
                },
            )

        # All files processed — send completion or error
        if results or not errors:
            send_completion(payload=payload, results=results)
        else:
            # Every single file failed
            send_error(
                payload=payload,
                error=f"All {len(errors)} files failed processing",
                partial_results=[],
            )

    except SoftTimeLimitExceeded:
        logger.error(
            "Pipeline job timed out",
            extra={"session_id": payload.session_id},
        )
        send_error(
            payload=payload,
            error="Pipeline job exceeded time limit",
            partial_results=results,
        )
        raise

    except Exception as e:
        logger.error(
            "Pipeline job failed",
            extra={
                "session_id": payload.session_id,
                "error": str(e),
            },
            exc_info=True,
        )
        send_error(
            payload=payload,
            error=str(e),
            partial_results=results,
        )
        raise


def _process_single_file(file: FileManifestItem, payload: JobPayload):
    """Run the full pipeline on a single resume file."""
    # Stage 1: Fetch and extract text
    file_bytes = fetch_file(file.storage_key)
    raw_text = extract_text(file_bytes, file.mime_type)

    if not raw_text.strip():
        return FileResult(
            file_id=file.file_id,
            candidate_name=None,
            candidate_email=None,
            candidate_phone=None,
            raw_text="",
            parsed_profile={},
            overall_score=0.0,
            score_breakdown={},
            summary="Could not extract text from this document.",
            skills_matched=[],
        ).model_dump()

    # Stage 2: Parse structured data
    profile = parse_resume(raw_text)

    # Stage 3: Score against job description
    scoring = score_resume(
        raw_text=raw_text,
        profile=profile,
        job_description=payload.job_description,
        job_title=payload.job_title,
    )

    # Stage 4: Generate summary
    summary = summarize_candidate(profile=profile, scoring=scoring)

    return FileResult(
        file_id=file.file_id,
        candidate_name=profile.name,
        candidate_email=profile.email,
        candidate_phone=profile.phone,
        raw_text=raw_text,
        parsed_profile=profile.model_dump(),
        overall_score=scoring.overall_score,
        score_breakdown=scoring.model_dump()["breakdown"],
        summary=summary,
        skills_matched=scoring.get_matched_skills(),
    ).model_dump()
