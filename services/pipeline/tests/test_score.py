from models import CandidateProfile, WorkEntry
from stages.score import score_resume


def test_hybrid_scoring_prefers_relevant_resume() -> None:
    job_description = "Senior Python engineer with AWS, Docker, Kubernetes, and 5 years of experience building APIs."

    relevant_profile = CandidateProfile(
        name="Jordan Smith",
        skills=["Python", "AWS", "Docker", "Kubernetes", "APIs"],
        work_history=[WorkEntry(title="Senior Python Engineer", company="Acme", start_date="2018-01", end_date=None)],
        total_experience_years=7,
    )
    irrelevant_profile = CandidateProfile(
        name="Taylor Chen",
        skills=["Photoshop", "Illustrator", "Branding"],
        work_history=[WorkEntry(title="Graphic Designer", company="Studio Co", start_date="2022-01", end_date=None)],
        total_experience_years=2,
    )

    relevant_score = score_resume(
        raw_text="Senior Python engineer working with AWS, Docker, Kubernetes, and backend APIs.",
        profile=relevant_profile,
        job_description=job_description,
    )
    irrelevant_score = score_resume(
        raw_text="Graphic designer focused on illustration, branding, and creative campaigns.",
        profile=irrelevant_profile,
        job_description=job_description,
    )

    assert relevant_score.overall_score > irrelevant_score.overall_score
    assert "semantic_similarity" in relevant_score.breakdown


def test_neutral_weights_redistribute_when_jd_has_no_skills_or_years() -> None:
    profile = CandidateProfile(skills=["React"], total_experience_years=3)
    result = score_resume(
        raw_text="React frontend engineer building component libraries.",
        profile=profile,
        job_description="Frontend engineer for product team collaboration and UI delivery.",
    )

    total_weight = sum(item.weight for item in result.breakdown.values())
    assert round(total_weight, 2) == 1.0
