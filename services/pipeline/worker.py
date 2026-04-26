"""Celery application for the official Resumemo AI pipeline."""

from __future__ import annotations

# Load .env before imports that read os.environ at module level.
from dotenv import load_dotenv

load_dotenv()

import logging

from celery import Celery
from celery.exceptions import SoftTimeLimitExceeded

from models import FileManifestItem, FileResult, JobPayload
from stages.cv import extract_candidate_dna
from stages.extract import extract_text
from stages.jd import enrich_job_description
from stages.score import score_candidate
from stages.summarize import summarize_candidate
from stages.taxonomy import get_taxonomy_index
from utils.callback import send_completion, send_error
from utils.storage import fetch_file

logger = logging.getLogger(__name__)

app = Celery("pipeline")
app.config_from_object("celeryconfig")


@app.task(
    name="pipeline.process_session",
    bind=True,
    default_retry_delay=60,
    acks_late=True,
    reject_on_worker_lost=True,
)
def process_session(self, raw_payload: dict):
    """Process all resumes in a profiling session.

    The queue and callback contract intentionally remain compatible with the
    existing `/api/v2` flow. Internally, the worker now builds research-backed
    JD, candidate DNA, and score artifacts.
    """
    payload = JobPayload.model_validate(raw_payload)
    results: list[dict] = []
    errors: list[dict] = []

    try:
        taxonomy = get_taxonomy_index()
        job_artifact = enrich_job_description(payload.job_description, taxonomy=taxonomy)

        for file in payload.files:
            try:
                results.append(_process_single_file(file, job_artifact, taxonomy))
            except Exception as error:
                logger.error(
                    "Failed to process file",
                    extra={
                        "session_id": payload.session_id,
                        "file_id": file.file_id,
                        "original_name": file.original_name,
                        "error": str(error),
                    },
                    exc_info=True,
                )
                errors.append({
                    "file_id": file.file_id,
                    "original_name": file.original_name,
                    "error": str(error),
                })

        if results or not errors:
            send_completion(payload=payload, results=results)
        else:
            send_error(
                payload=payload,
                error=f"All {len(errors)} files failed processing",
                partial_results=[],
            )

    except SoftTimeLimitExceeded:
        logger.error("Pipeline job timed out", extra={"session_id": payload.session_id})
        send_error(payload=payload, error="Pipeline job exceeded time limit", partial_results=results)
        raise

    except Exception as error:
        logger.error(
            "Pipeline job failed",
            extra={"session_id": payload.session_id, "error": str(error)},
            exc_info=True,
        )
        send_error(payload=payload, error=str(error), partial_results=results)
        raise


def _process_single_file(file: FileManifestItem, job_artifact, taxonomy):
    file_bytes = fetch_file(file.storage_key)
    raw_text = extract_text(file_bytes, file.original_name)

    if not raw_text.strip():
        return FileResult(
            file_id=file.file_id,
            candidate_name=None,
            candidate_email=None,
            candidate_phone=None,
            raw_text="",
            parsed_profile={},
            overall_score=0.0,
            score_breakdown={
                "job_description_artifact": job_artifact.model_dump(),
                "resume_artifact": {"error": "empty_text"},
                "score_artifact": {"total_score": 0, "base_score": 0, "bonus_score": 0},
            },
            summary="Could not extract text from this document.",
            skills_matched=[],
        ).model_dump()

    candidate_dna = extract_candidate_dna(raw_text, taxonomy=taxonomy)
    score_artifact = score_candidate(job_artifact, candidate_dna)
    summary = summarize_candidate(candidate_dna, job_artifact, score_artifact)

    return FileResult(
        file_id=file.file_id,
        candidate_name=candidate_dna.candidate_name,
        candidate_email=candidate_dna.candidate_email,
        candidate_phone=candidate_dna.candidate_phone,
        raw_text=raw_text,
        parsed_profile=candidate_dna.model_dump(),
        overall_score=score_artifact.total_score,
        score_breakdown={
            "pipeline": "research-backed-ai",
            "job_description_artifact": job_artifact.model_dump(),
            "resume_artifact": {
                "schema_version": candidate_dna.schema_version,
                "parse_warnings": candidate_dna.parse_warnings,
                "taxonomy_trace_count": len(candidate_dna.taxonomy_traces),
            },
            "score_artifact": score_artifact.model_dump(),
            "base_score": score_artifact.base_score,
            "bonus_score": score_artifact.bonus_score,
            "total_score": score_artifact.total_score,
            "matched_skills": score_artifact.matched_skills,
            "missing_skills": score_artifact.missing_skills,
            "surplus_skills": score_artifact.surplus_skills,
        },
        summary=summary,
        skills_matched=score_artifact.matched_skills,
    ).model_dump()
