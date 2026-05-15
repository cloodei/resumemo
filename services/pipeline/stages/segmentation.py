"""Optional Gemini resume segmentation stage."""

from __future__ import annotations

import logging
import re

from config import (
    ENABLE_GEMINI_SEGMENTATION,
    GEMINI_API_KEY,
    GEMINI_MODEL_NAME,
    RESUME_SEGMENTATION_WORD_THRESHOLD,
)

logger = logging.getLogger(__name__)

SECTION_TAGS = {
    "INFORMATION_SECTION": "Information",
    "SUMMARY_SECTION": "Summary",
    "SKILLS_SECTION": "Skills",
    "EXPERIENCE_SECTION": "Experience",
    "EDUCATION_SECTION": "Education",
}


def segment_resume_text(cleaned_text: str) -> str:
    """Return sectioned resume text, using Gemini when explicitly enabled."""
    if not ENABLE_GEMINI_SEGMENTATION:
        return cleaned_text

    if not GEMINI_API_KEY:
        raise RuntimeError("ENABLE_GEMINI_SEGMENTATION is true but GEMINI_API_KEY is not set")

    try:
        from google import genai

        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model=GEMINI_MODEL_NAME,
            contents=_segmentation_prompt(cleaned_text),
        )
        segmented = (response.text or "").strip()
    except Exception as error:
        logger.warning("Gemini resume segmentation failed; using deterministic parser", extra={"error": str(error)})
        return cleaned_text

    if not segmented:
        return cleaned_text

    sectioned = _tagged_xml_to_headings(segmented)
    return sectioned or cleaned_text


def _segmentation_prompt(cleaned_text: str) -> str:
    mode = "summarize long prose but preserve every skill, date range, company, title, credential, email, and phone"
    if len(cleaned_text.split()) <= RESUME_SEGMENTATION_WORD_THRESHOLD:
        mode = "restructure only; do not summarize"

    return f"""
You are segmenting a resume for a deterministic scoring pipeline.

Rules:
- {mode}.
- Return only these XML-like tags, in this order:
  <INFORMATION_SECTION>, <SUMMARY_SECTION>, <SKILLS_SECTION>, <EXPERIENCE_SECTION>, <EDUCATION_SECTION>.
- Keep work experience date ranges and environment/tool lists intact.
- Do not invent skills, employers, degrees, dates, contact details, or years of experience.
- If a section is missing, return an empty tag for that section.

Resume:
{cleaned_text}
""".strip()


def _tagged_xml_to_headings(segmented: str) -> str:
    parts: list[str] = []
    for tag, heading in SECTION_TAGS.items():
        match = re.search(rf"<{tag}>\s*(.*?)\s*</{tag}>", segmented, flags=re.I | re.S)
        content = match.group(1).strip() if match else ""
        parts.append(f"{heading}\n{content}".strip())

    return "\n\n".join(part for part in parts if part)
