"""Stage 1: Text extraction from PDF, DOCX, and TXT files."""

from __future__ import annotations

import logging
from io import BytesIO

logger = logging.getLogger(__name__)


def extract_text(file_bytes: bytes, mime_type: str) -> str:
    """Extract plain text from a file based on its MIME type.

    Args:
        file_bytes: Raw file contents.
        mime_type: The MIME type of the file.

    Returns:
        Extracted plain text, or empty string if extraction fails.
    """
    extractors = {
        "application/pdf": _extract_pdf,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": _extract_docx,
        "text/plain": _extract_txt,
    }

    extractor = extractors.get(mime_type)
    if extractor is None:
        logger.warning("Unsupported MIME type for extraction", extra={"mime_type": mime_type})
        return ""

    try:
        text = extractor(file_bytes)
        logger.info(
            "Text extracted",
            extra={"mime_type": mime_type, "text_length": len(text)},
        )
        return text
    except Exception as e:
        logger.error(
            "Text extraction failed",
            extra={"mime_type": mime_type, "error": str(e)},
            exc_info=True,
        )
        return ""


def _extract_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF using PyMuPDF."""
    import pymupdf

    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    pages = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return "\n".join(pages).strip()


def _extract_docx(file_bytes: bytes) -> str:
    """Extract text from a DOCX using python-docx."""
    from docx import Document

    doc = Document(BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def _extract_txt(file_bytes: bytes) -> str:
    """Extract text from a plain text file."""
    return file_bytes.decode("utf-8", errors="replace").strip()
