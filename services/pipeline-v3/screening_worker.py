"""Celery worker entrypoint for the screening pipeline."""

from dotenv import load_dotenv
load_dotenv()

import logging

from celery import Celery
from celery.exceptions import SoftTimeLimitExceeded

from models import FileManifestItem, FileResult, PipelinePayload
from stages.artifacts import build_candidate_profile, build_empty_candidate_profile, build_resume_artifact
from stages.extract import extract_text
from stages.jd_profile import build_job_description_artifact
from stages.parse import parse_resume
from stages.score import score_candidate
from stages.screening_summary import summarize_candidate
from utils.callback import send_completion, send_error
from utils.storage import fetch_file


logger = logging.getLogger(__name__)

app = Celery("screening")
app.config_from_object("celeryconfig")


@app.task(
	name="screening.process_session",
	bind=True,
	default_retry_delay=60,
	acks_late=True,
	reject_on_worker_lost=True,
)
def process_session(self, raw_payload: dict):
	payload = PipelinePayload.model_validate(raw_payload)
	results: list[dict] = []
	errors: list[dict] = []
	job_description_artifact = build_job_description_artifact(payload.job_description)

	try:
		for file in payload.files:
			try:
				results.append(_process_single_file(file, job_description_artifact))
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
			send_completion(
				payload=payload,
				job_description_artifact=job_description_artifact,
				results=results,
			)
		else:
			send_error(
				payload=payload,
				error=f"All {len(errors)} files failed processing",
				job_description_artifact=job_description_artifact,
				partial_results=[],
			)

	except SoftTimeLimitExceeded:
		send_error(
			payload=payload,
			error="Pipeline job exceeded time limit",
			job_description_artifact=job_description_artifact,
			partial_results=results,
		)
		raise
	except Exception as error:
		send_error(
			payload=payload,
			error=str(error),
			job_description_artifact=job_description_artifact,
			partial_results=results,
		)
		raise


def _empty_score_artifact() -> dict:
	return {
		"scores": {
			"hardSkillsScore": 0.0,
			"hardConstraintsScore": 0.0,
			"baseScore": 0.0,
			"bonusScore": 0.0,
			"totalScore": 0.0,
		},
		"breakdown": {
			"hardSkills": {
				"achieved": 0.0,
				"possible": 0.0,
				"ratio": 0.0,
				"matchedMustHave": [],
				"matchedNiceToHave": [],
				"matchedExpansion": [],
				"missingMustHave": [],
				"missingNiceToHave": [],
				"missingExpansion": [],
			},
			"hardConstraints": {
				"experience": {"required": None, "candidate": None, "passed": False},
				"degree": {"required": None, "candidate": None, "passed": False},
			},
			"surplusSkills": [],
			"softSkills": {"matched": [], "missing": [], "score": 0.0},
			"certifications": {"matched": [], "extra": [], "score": 0.0},
			"spillover": {"hardSkillRatio": 0.0, "bonusScore": 0.0},
		},
		"matchedSkills": [],
		"missingSkills": [],
		"extraSkills": [],
	}


def _process_single_file(file: FileManifestItem, job_description_artifact: dict) -> dict:
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
			candidate_profile=build_empty_candidate_profile(),
			score_artifact=_empty_score_artifact(),
			overall_score=0.0,
			base_score=0.0,
			bonus_score=0.0,
			summary="Could not extract text from this document.",
			skills_matched=[],
		).model_dump()

	profile = parse_resume(raw_text)
	resume_artifact = build_resume_artifact(raw_text)
	candidate_profile = build_candidate_profile(profile, resume_artifact, raw_text)
	scoring = score_candidate(candidate_profile, job_description_artifact)
	summary = summarize_candidate(candidate_profile, scoring["score_artifact"])

	return FileResult(
		file_id=file.file_id,
		candidate_name=profile.name,
		candidate_email=profile.email,
		candidate_phone=profile.phone,
		raw_text=raw_text,
		resume_artifact=resume_artifact,
		candidate_profile=candidate_profile,
		score_artifact=scoring["score_artifact"],
		overall_score=scoring["overall_score"],
		base_score=scoring["base_score"],
		bonus_score=scoring["bonus_score"],
		summary=summary,
		skills_matched=scoring["skills_matched"],
	).model_dump()
