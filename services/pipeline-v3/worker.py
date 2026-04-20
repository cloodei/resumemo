"""
Celery application and task definitions for the Resumemo profiling pipeline.

Start the worker with:
    celery -A worker worker --loglevel=info --queues=profiling.v3.jobs --pool=solo --concurrency=1
"""

# Load .env before any project imports that read os.environ at module level
from dotenv import load_dotenv
load_dotenv()

import logging

from celery import Celery
from celery.exceptions import SoftTimeLimitExceeded

from utils.callback import send_completion, send_error
from stages.extract import extract_text
from models import FileManifestItem, JobPayload, FileResult
from stages.parse import parse_resume
from stages.score import score_resume
from utils.storage import fetch_file
from stages.summarize import summarize_candidate
from stages.jd_profile import build_job_description_artifact
from stages.artifacts import build_candidate_dna, build_resume_artifact, build_score_artifact

logger = logging.getLogger(__name__)

app = Celery("pipeline_v3")
app.config_from_object("celeryconfig")


@app.task(
    name="pipeline_v3.process_session",
    bind=True,
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

    results: list[dict] = []
    errors: list[dict] = []
    job_description_artifact = build_job_description_artifact(payload.job_description)

    try:
        for file in payload.files:
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

        # All files processed — send completion or error
        if results or not errors:
            send_completion(
                payload=payload,
                job_description_artifact=job_description_artifact,
                results=results,
            )
        else:
            # Every single file failed
            send_error(
                payload=payload,
                error=f"All {len(errors)} files failed processing",
                job_description_artifact=job_description_artifact,
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
            job_description_artifact=job_description_artifact,
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
            job_description_artifact=job_description_artifact,
            partial_results=results,
        )
        raise
def _process_single_file(file: FileManifestItem, payload: JobPayload):
    """Run the full pipeline on a single resume file."""
    # Stage 1: Fetch and extract text
    file_bytes = fetch_file(file.storage_key)
    raw_text = extract_text(file_bytes, file.original_name)

    if not raw_text.strip():
        return FileResult(
            file_id=file.file_id,
            candidate_name=None,
            candidate_email=None,
            candidate_phone=None,
            raw_text="",
            resume_artifact=None,
            candidate_dna={
                "information": {
                    "name": None,
                    "phone": None,
                    "email": None,
                    "location": None,
                    "linkedIn": None,
                    "jobTitleOriginal": None,
                    "jobTitleStandardized": None,
                    "yearsOfExperience": None,
                },
                "hardSkills": {
                    "directMention": [],
                    "certifications": [],
                },
                "softSkills": [],
                "education": {
                    "major": None,
                    "degree": None,
                },
                "parseWarnings": ["text_extraction_failed"],
            },
            score_artifact={
                "scores": {
                    "baseScore": 0.0,
                    "bonusScore": 0.0,
                    "totalScore": 0.0,
                },
                "breakdown": {},
                "matchedSkills": [],
                "missingSkills": [],
                "extraSkills": [],
            },
            overall_score=0.0,
            base_score=0.0,
            bonus_score=0.0,
            summary="Could not extract text from this document.",
            skills_matched=[],
        ).model_dump()

    # Stage 2: Parse structured data
    profile = parse_resume(raw_text)

    # Stage 3: Score against job description
    scoring = score_resume(
        raw_text=raw_text,
        profile=profile,
        job_description=payload.job_description.raw_text,
    )

    # Stage 4: Generate summary
    summary = summarize_candidate(profile=profile, scoring=scoring)
    resume_artifact = build_resume_artifact(raw_text)
    candidate_dna = build_candidate_dna(profile)
    score_artifact = build_score_artifact(scoring)

    return FileResult(
        file_id=file.file_id,
        candidate_name=profile.name,
        candidate_email=profile.email,
        candidate_phone=profile.phone,
        raw_text=raw_text,
        resume_artifact=resume_artifact,
        candidate_dna=candidate_dna,
        score_artifact=score_artifact,
        overall_score=scoring.overall_score,
        base_score=scoring.overall_score,
        bonus_score=0.0,
        summary=summary,
        skills_matched=scoring.get_matched_skills(),
    ).model_dump()
