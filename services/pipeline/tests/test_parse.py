from stages.parse import parse_resume


def test_parse_flags_invalid_top_line_identity() -> None:
    raw_text = "Professional Summary\npython.dev@example.com\n+1 555 1212\nSkills\nPython\n"
    profile = parse_resume(raw_text)

    assert profile.name is None
    assert "name_missing_or_invalid" in profile.parse_warnings


def test_parse_computes_non_overlapping_experience_years() -> None:
    raw_text = """
    Experience
    Senior Engineer Jan 2020 - Present Acme Corp
    Engineer Jan 2018 - Dec 2021 Beta LLC
    Skills
    Python
    AWS
    """
    profile = parse_resume(raw_text)

    assert profile.total_experience_years is not None
    assert profile.total_experience_years >= 4
