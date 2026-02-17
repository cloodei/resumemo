"""Fetch resume files from Cloudflare R2 (S3-compatible)."""

from __future__ import annotations

import logging
import os

import boto3

logger = logging.getLogger(__name__)

_client = None


def _get_s3_client():
    """Lazily initialize the S3 client for R2."""
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=os.environ["R2_ENDPOINT_URL"],
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            region_name="auto",
        )
    return _client


def fetch_file(storage_key: str) -> bytes:
    """Download a file from R2 and return its contents as bytes.

    Args:
        storage_key: The S3 object key (e.g. "user-id/uuid-filename.pdf").

    Returns:
        The raw file bytes.

    Raises:
        Exception: If the file cannot be fetched (not found, access denied, etc.).
    """
    bucket = os.environ["R2_BUCKET_NAME"]
    client = _get_s3_client()

    logger.info("Fetching file from R2", extra={"storage_key": storage_key, "bucket": bucket})

    response = client.get_object(Bucket=bucket, Key=storage_key)
    data = response["Body"].read()

    logger.info(
        "File fetched",
        extra={"storage_key": storage_key, "size_bytes": len(data)},
    )

    return data
