"""Stage 1: Text extraction from PDF, DOCX, and TXT files."""
from __future__ import annotations
import logging
from io import BytesIO
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_text(file_bytes: bytes, file_name: str):
    """Extract plain text from a file based on its filename extension.

    Args:
        file_bytes: Raw file contents.
        file_name: Original file name.

    Returns:
        Extracted plain text, or empty string if extraction fails.
    """
    extension = Path(file_name).suffix.lower()
    extractors = {
        ".pdf": _extract_pdf,
        ".docx": _extract_docx,
        ".txt": _extract_txt,
    }

    extractor = extractors.get(extension)
    if extractor is None:
        logger.warning("Unsupported file extension for extraction", extra={"file_name": file_name, "extension": extension})
        return ""

    try:
        text = extractor(file_bytes)
        logger.info(
            "Text extracted",
            extra={"file_name": file_name, "extension": extension, "text_length": len(text)},
        )
        return text
    except Exception as e:
        logger.error(
            "Text extraction failed",
            extra={"file_name": file_name, "extension": extension, "error": str(e)},
            exc_info=True,
        )
        return ""


def _extract_pdf(file_bytes: bytes):
    """Extract text from a PDF using PyMuPDF."""
    import pymupdf

    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    pages = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return "\n".join(pages).strip()


def _extract_docx(file_bytes: bytes):
    """Extract text from a DOCX using python-docx."""
    from docx import Document

    doc = Document(BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def _extract_txt(file_bytes: bytes):
    """Extract text from a plain text file."""
    return file_bytes.decode("utf-8", errors="replace").strip()
