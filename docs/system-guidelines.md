# System Guidelines

This document describes the product behavior Resumemo supports today, with light guidance for future-safe changes.

## Product intent

Resumemo helps recruiters screen batches of resumes against a hiring brief without turning the workflow into a black box.

Current product goals:

- reduce the time needed to review many resumes
- keep recruiters in control of the final judgment
- show ranked outputs that can be reviewed, retried, and exported
- preserve a practical workflow around uploads, background processing, and follow-up review

## What the product is today

Today, Resumemo is a recruiter-facing profiling workflow with these core pieces:

- sign-in
- dashboard overview of existing profiling sessions
- session list with search and status filtering
- new profiling session flow from a job title, job description, and uploaded files
- background processing of resumes
- session detail view for processing, retrying, failed, and completed states
- ranked result review with candidate detail drill-down
- retry actions for failed or stale sessions
- result export

It is not yet a broad hiring operations suite. Avoid describing unbuilt admin tooling, global analytics, or governance surfaces as if they already exist.

## Recruiter workflow today

### 1. Start a profiling session

- The recruiter enters a session name, optional job title, and a required job description.
- The recruiter uploads resume files through the browser.
- Current upload rules come from shared code in `core/`:
  - supported formats: PDF, DOCX, TXT
  - max 50 files per session
  - max 2 MB per file

### 2. Background processing

- After upload verification, the API creates a profiling session and queues background work.
- The session moves through running states such as `processing` or `retrying`.
- The recruiter does not need to keep the page open while the worker runs.

### 3. Session review

- The session list shows current status and supports search by session name or job title.
- A completed session shows ranked candidate results.
- Candidate review focuses on practical screening signals already produced by the current pipeline, such as score, summary, matched skills, contact details, and parsed profile fields.

### 4. Failure and retry handling

- Failed sessions stay visible rather than disappearing.
- The current product supports multiple retry paths:
  - rerun the current session
  - clone the current session
  - clone with updated brief data
  - replace the current session contents with updated brief data
- Retry behavior is tied to the active `run_id`, so stale worker callbacks should not overwrite a newer run.

### 5. Export

- The API currently supports `csv` and `json` export formats for completed sessions.
- The current web flow downloads CSV.
- Exports should reflect the stored results for the active run of the selected session.

## UX and behavior expectations

- Keep recruiter-facing language clear and operational, not research-heavy.
- Prefer showing status and next actions over exposing pipeline internals.
- Preserve original uploads and treat derived resume analysis as secondary data.
- Show failures in a recoverable way when retry is possible.
- Keep session history understandable: one session can have multiple runs, but the UI should emphasize the active result set.

## Current result interpretation rules

- Scores are useful ranking signals, not final hiring decisions.
- Summaries should help a recruiter triage quickly, not replace reading the resume.
- Parsed data can be incomplete or noisy, especially for low-quality documents.
- Empty or unreadable documents may legitimately result in low scores or minimal extracted data.

## System boundaries

- The frontend is a recruiter workflow client.
- The API is the source of truth for auth, sessions, files, statuses, results, and exports.
- The pipeline is an internal processing subsystem. Its current implementation is replaceable as long as the job and callback contract is preserved.

## Future direction, stated carefully

These are reasonable extension areas, but they should be described as future work unless implemented in live code:

- richer recruiter collaboration and review workflows
- more detailed progress reporting during long-running jobs
- broader search and filtering across candidate result attributes
- stronger model/version visibility and evaluation tooling
- alternate worker implementations behind the same API-facing contract

When adding docs or features, separate "current behavior" from "future direction" instead of blending them together.
