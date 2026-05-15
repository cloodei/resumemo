from __future__ import annotations

from models import CandidateDnaProfile, FileResult
from stages.cv import extract_candidate_dna, merge_intervals
from stages.jd import enrich_job_description
from stages.score import score_candidate
from stages.taxonomy import TaxonomyIndex, TaxonomyTerm


def test_jd_enrichment_shape_and_expansion_limit():
    taxonomy = _taxonomy()

    artifact = enrich_job_description(
        "Backend Engineer\nRequirements: 3 years Python and FastAPI. Nice to have Docker. Strong communication.",
        taxonomy=taxonomy,
    )

    assert artifact.hard_constraints["min_experience_years"] == 3
    assert artifact.hard_skills["must_have"]["tech_skills"]
    assert len(artifact.hard_skills["nice_to_have"]["from_taxonomy_expansion"]) <= 10
    assert artifact.taxonomy_traces


def test_cv_dna_extraction_keeps_mapped_and_unmapped_shape():
    taxonomy = _taxonomy()

    profile = extract_candidate_dna(
        """
        Jane Doe
        jane@example.com
        Skills
        Python, FastAPI, Docker
        Experience
        Backend Engineer 2020 - 2024
        Built APIs with Python and FastAPI using Docker.
        Education
        Bachelor of Computer Science
        """,
        taxonomy=taxonomy,
    )

    direct = profile.hard_skills["direct_mention"]
    assert profile.information["name"] == "Jane Doe"
    assert any(item["canonical_name"] == "Python" for item in direct)
    assert all("taxonomy_id" in item for item in direct)


def test_interval_merging_for_overlapping_skill_experience():
    merged = merge_intervals([(2020 * 12, 2022 * 12), (2021 * 12, 2024 * 12), (2025 * 12, 2026 * 12)])

    assert merged == [(2020 * 12, 2024 * 12), (2025 * 12, 2026 * 12)]


def test_cv_skill_years_support_numeric_dates_and_declared_year_cap():
    taxonomy = _taxonomy()

    profile = extract_candidate_dna(
        """
        Jane Doe
        jane@example.com
        3 years of experience
        Skills
        React.js
        Experience
        Frontend Engineer 01/2020 - 03/2026
        Built product interfaces with React.js.
        """,
        taxonomy=taxonomy,
    )

    react = next(item for item in profile.hard_skills["direct_mention"] if item["canonical_name"] == "React.js")
    assert react["years"] == 3


def test_composite_scoring_base_bonus_and_total():
    taxonomy = _taxonomy()
    jd = enrich_job_description("Requirements: 3 years Python and FastAPI. Nice to have Docker.", taxonomy=taxonomy)
    profile = CandidateDnaProfile(
        information={"name": "Jane Doe", "years_of_experience": 5},
        hard_skills={
            "direct_mention": [
                {
                    "skill": "Python",
                    "canonical_name": "Python",
                    "taxonomy_id": "Software.Backend.Python",
                    "years": 5,
                    "zones": ["experience"],
                },
                {
                    "skill": "FastAPI",
                    "canonical_name": "FastAPI",
                    "taxonomy_id": "Software.Backend.FastAPI",
                    "years": 4,
                    "zones": ["experience"],
                },
                {
                    "skill": "Docker",
                    "canonical_name": "Docker",
                    "taxonomy_id": "Infra.DevOps.Docker",
                    "years": 4,
                    "zones": ["experience"],
                },
            ],
            "certifications": [],
        },
        education={"degree": "bachelor"},
    )

    score = score_candidate(jd, profile)

    assert score.base_score > 0
    assert score.total_score >= score.base_score
    assert "Python" in score.matched_skills


def test_callback_payload_serialization_matches_v2_shape():
    result = FileResult(
        file_id=1,
        candidate_name="Jane Doe",
        candidate_email="jane@example.com",
        candidate_phone=None,
        raw_text="resume",
        parsed_profile={"schema_version": "candidate-dna.v1"},
        overall_score=91.2,
        score_breakdown={"score_artifact": {"total_score": 91.2}},
        summary="Jane Doe is a backend engineer.",
        skills_matched=["Python"],
    ).model_dump()

    assert set(result) == {
        "file_id",
        "candidate_name",
        "candidate_email",
        "candidate_phone",
        "raw_text",
        "parsed_profile",
        "overall_score",
        "score_breakdown",
        "summary",
        "skills_matched",
    }


def _taxonomy() -> TaxonomyIndex:
    return TaxonomyIndex([
        TaxonomyTerm("Python", "python", "Software.Backend.Python", "tech", ("Software", "Backend", "Python")),
        TaxonomyTerm("FastAPI", "fastapi", "Software.Backend.FastAPI", "tech", ("Software", "Backend", "FastAPI")),
        TaxonomyTerm("React.js", "react.js", "Software.Frontend.React", "tech", ("Software", "Frontend", "React.js")),
        TaxonomyTerm("Django", "django", "Software.Backend.Django", "tech", ("Software", "Backend", "Django")),
        TaxonomyTerm("Docker", "docker", "Infra.DevOps.Docker", "tech", ("Infra", "DevOps", "Docker")),
        TaxonomyTerm(
            "Strong communication",
            "strong communication",
            "Soft.Communication.Strong",
            "soft",
            ("Soft", "Communication", "Strong"),
        ),
    ])
