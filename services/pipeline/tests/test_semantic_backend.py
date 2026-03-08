from models import CandidateProfile
from stages import score as score_module


def test_semantic_breakdown_reports_backend() -> None:
    result = score_module.score_resume(
        raw_text="Python backend engineer building APIs on AWS.",
        profile=CandidateProfile(skills=["Python", "AWS"]),
        job_description="Backend engineer with Python and AWS experience.",
    )

    semantic = result.breakdown["semantic_similarity"]
    assert semantic.details is not None
    assert semantic.details["backend"] in {"sentence-transformers", "spacy-fallback"}


def test_semantic_scoring_falls_back_when_transformer_unavailable(monkeypatch) -> None:
    monkeypatch.setattr(score_module, "_semantic_model", None)
    monkeypatch.setattr(score_module, "_semantic_backend", "sentence-transformers")

    def raise_error():
        raise RuntimeError("model unavailable")

    monkeypatch.setattr(score_module, "_get_semantic_model", raise_error)
    score = score_module._score_semantic_similarity(
        "Python APIs with distributed systems",
        "Python engineer with API experience",
    )

    assert score >= 0
    assert score_module._semantic_backend == "spacy-fallback"
