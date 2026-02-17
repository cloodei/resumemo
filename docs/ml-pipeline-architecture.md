# ML Pipeline Architecture and File Handling

> **Superseded**: This document described the original high-level intent for the ML pipeline. It has been replaced by [`docs/pipeline-spec.md`](./pipeline-spec.md), which contains the full implementation specification including architecture, message contracts, database schemas, pipeline stages, infrastructure, and phased implementation plan. Refer to that document for all pipeline-related decisions and details.

---

*The original content is preserved below for historical reference.*

---

Overview
This document describes the proposed end-to-end flow for file uploads and the ML profiling pipeline. It focuses on implementation intent and system behavior, not specific names for endpoints, types, or functions. The goal is to keep raw files out of the database while preserving strong tracking, auditability, and reproducibility for profiling runs.

Goals
- Keep raw file content outside the database (object storage or filesystem).
- Track profiling progress, outcomes, and metadata in the database.
- Use async processing with a worker queue (Celery) for ML tasks.
- Maintain deterministic, versioned artifacts for auditability and repeatability.
- Allow future splitting of services without changing the overall contract.

Non-Goals
- This document does not define specific schemas, field names, or API routes.
- This document does not pick a message broker or storage vendor.

Key Concepts
- Raw file storage: Object storage (S3-compatible) or filesystem, used for uploaded files and ML artifacts.
- Metadata index: Minimal database records to link files, jobs, users, and artifacts.
- Job ledger: A database-backed status record for each profiling run.
- Queue: A message broker used by workers to pick up profiling work.
- Artifacts: Structured outputs (JSON) stored in object storage; DB stores pointers and metadata.

Data Categories
1) Raw files
- Stored in object storage or filesystem.
- Immutable once uploaded.
- Referenced by storage key and checksum.

2) Control metadata (DB)
- File reference records (owner, storage key, checksum, size, timestamps).
- Job records (status, timing, model version, artifact pointer, error state).
- Optional job events for analytics and progress visualization.

3) Artifacts (object storage)
- Profiling output, parse results, scoring explanations, and derived metadata.
- Versioned by job id and model version.

High-Level Pipeline
1) Upload
2) Enqueue profiling job
3) Worker processing
4) Artifact persistence
5) Completion signal
6) Backend finalization
7) UI polling or notifications

Detailed Pipeline

1) Upload
- Client uploads a resume file to the backend.
- Backend streams file to object storage.
- Backend creates a file metadata record in DB with a storage key and checksum.
- Backend returns a file reference to the client.

Rationale: The DB record is minimal and required for access control, auditability, and job linkage.

2) Enqueue Profiling Job
- Backend creates a new job record with status queued.
- Backend sends a queue message containing the job id and file references.
- Optional: include model version, requested pipeline stages, or profile options.

Rationale: The DB is the source of truth for job state, the queue is only the delivery mechanism.

3) Worker Processing
- Celery worker consumes a job message from the queue.
- Worker fetches raw files using storage keys.
- Worker runs pipeline stages (extract, parse, score) as configured.
- Worker writes intermediate output to memory or temp storage only; final artifacts are persisted.

Rationale: Keep workers stateless and ensure the canonical outputs are artifacts in storage.

4) Artifact Persistence
- Worker writes output artifacts to object storage under a deterministic key, for example:
  jobs/<job_id>/result.json
  jobs/<job_id>/explanations.json
- Worker includes model version and stage metadata in artifact payloads.

Rationale: Artifacts are stored outside DB for size, versioning, and portability.

5) Completion Signal
- Worker notifies backend of completion using one of:
  a) HTTP callback to the backend, or
  b) a queue message indicating completion
- Worker includes job id, artifact storage keys, stage results, and error info if any.

Rationale: Backend remains the source of truth for job status and reporting.

6) Backend Finalization
- Backend updates the job record to succeeded or failed.
- Backend stores artifact pointers and summary metadata in DB.
- Backend updates any aggregated analytics or derived data needed for UI.

Rationale: The DB retains essential data for product behavior, auditability, and traceability.

7) UI Polling or Notifications
- Client polls the backend for job status, or
- Backend emits a notification/event for the client to update UI.

Rationale: Job state is centralized in the backend; UI never reads directly from object storage.

Failure and Retry Strategy
- Queue messages are retried by the broker or Celery on failure.
- Workers write artifacts only on successful stage completion.
- Backend handles idempotent completion updates to avoid duplicate job finalization.
- Failed jobs record error details and optionally partial stage output pointers.

Consistency and Idempotency
- Job creation is atomic in the backend.
- Worker completion updates must be idempotent (safe to repeat).
- Artifacts are immutable; re-runs generate new job ids and new artifact keys.

Versioning and Reproducibility
- Each job has a model version and pipeline version reference.
- Artifacts include version metadata in the payload.
- Reprocessing the same file produces a new job record and artifacts.

Security and Access Control
- Backend validates access to file records and job records for a user or tenant.
- Object storage access is restricted to backend and worker roles.
- Clients never access object storage directly unless via signed URLs.

Operational Notes
- Start with a single Celery worker and broker.
- Keep worker stateless and horizontally scalable.
- Splitting pipeline stages into separate services later should only require queue routing changes.

Observability
- Log structured job events with job id and stage.
- Track queue latency, processing time, and failure rates.
- Track artifact sizes for cost management.

Open Decisions (For Later)
- Choice of broker (Redis, RabbitMQ, etc.).
- Storage provider (S3/R2/minio/local).
- Completion signaling mechanism (HTTP callback vs completion queue).
- Optional: separate queues per stage for scaling.
