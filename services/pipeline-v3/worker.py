"""Compatibility entrypoint that forwards to the screening worker."""

from screening_worker import app, process_session

__all__ = ["app", "process_session"]
