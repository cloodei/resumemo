# Original Job-Based UI Design (Deprecated)

This directory contains the original job-based UI design before the pivot to the "Profiling" concept.

## Files Archived

- `new-job-deprecated.tsx` - Original job creation page with 3-step wizard (Create job → Upload resumes → Review & launch)
- `job-results.tsx` - Job results page showing ranked candidates and analytics

## Key Features of Original Design

### New Job Flow
1. **Create job** - Provide JD or select template
2. **Upload resumes** - Drag & drop PDF, DOCX, or TXT files with S3 upload queue
3. **Review & launch** - Confirm details and start ranking

### Job Results Page
- Summary tiles (resumes processed, shortlisted, avg score, turnaround)
- Ranking summary with highlights
- Filter tabs (Scores, Location, Tags)
- Ranked candidates table with actions
- Candidate spotlight sidebar

### UI Components Used
- Card-based layout with shadows and hover effects
- Progress indicators for upload queue
- Tabs for templates/history and filters
- Tables for candidate ranking
- Badge components for status
- Motion animations via Framer Motion

## Why Deprecated

Moving to a clearer separation of concerns:
- **Upload Phase**: Batch resume uploads with progress tracking (separate from scoring)
- **Profiling Phase**: JD-based resume scoring as a distinct service

This separation allows users to upload massive batches of resumes first, review them, add a job description later, and only trigger the AI profiling when ready.

## Design Language (Preserved)

```
- Cards with shadow-x, shadow-m, shadow-l classes
- Gradient text: bg-linear-to-br from-foreground to-foreground/70
- Badge variants: outline, secondary
- Muted backgrounds: bg-muted/30, bg-muted/20
- Border styles: border-border/50, border-dashed
- Transitions: hover:-translate-y-0.5, hover:shadow-l
```

---
*Archived on: 2026-01-31*
