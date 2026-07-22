# Import Jobs - Abqoor

## Purpose

Define how Abqoor tracks every import operation performed by administrators.

Import jobs provide a conceptual record of importer activity, including preview, commit, progress, cancellation, history, and future rollback workflows.

This document does not define database schema, API endpoints, or business rules.

---

## Codex Instructions

- Do not invent database schema.
- Do not invent API endpoints.
- Do not invent business rules.
- Do not redefine importer behavior.
- Reference existing importer and CMS documents where appropriate.
- Leave unknown implementation details as TODOs.

---

## Import Job Concept

An import job represents one administrator-initiated import operation.

An import job may correspond to:

- A preview attempt
- A committed import
- A cancelled import
- A failed import
- A future rollback operation

Import jobs are intended to help administrators understand what was imported, when it happened, who initiated it, and what the result was.

TODO:

- Define whether preview-only imports create persistent import jobs.
- Define whether failed imports are persisted.
- Define how import jobs relate to imported questions.
- Define how import jobs relate to generated media files.

---

## Import Job Fields (MVP Final)

The MVP import job conceptual model includes:

- `id`
- `sourceType` (`pdf` | `excel`)
- `status` (`preview` | `committed` | `failed` | `cancelled`)
- `startQuestionNumber`
- `createdAt`
- `createdBy`
- `totalPages`
- `successCount`
- `failureCount`

This section defines the minimal import job structure conceptually. It does not define database schema, API endpoints, or storage implementation.

---

## Import Lifecycle

The import job lifecycle should describe the administrative state of an import operation.

Conceptual lifecycle:

```text
Created
  ->
Previewing
  ->
Ready to Commit
  ->
Committing
  ->
Completed
```

Alternative outcomes:

```text
Cancelled
Failed
Rolled Back (future)
```

TODO:

- Define exact lifecycle transitions.
- Define which states are persisted.
- Define whether preview and commit are separate jobs or stages of the same job.
- Define whether partial failures keep an import job in a completed or failed state.

---

## Status Values

MVP import job statuses are:

- `preview`
- `committed`
- `failed`
- `cancelled`

TODO:

- Define terminal vs non-terminal statuses.
- Define whether partial success requires a separate status.
- Define how validation errors affect status.

---

## Import History

Import history should allow administrators to review prior import operations.

Import history may eventually show:

- Import job identity
- Import status
- Initiating administrator
- Import date and time
- Import source files
- Number of processed questions
- Number of successful questions
- Number of failed questions
- Validation report

TODO:

- Define exact fields shown in import history.
- Define retention policy.
- Define whether uploaded source files are retained.
- Define whether import manifests are persisted.
- Define filtering and search behavior for import history.

---

## Rollback Concept

Rollback is a future CMS capability for reverting the effects of a committed import.

Rollback should be considered carefully because imports can create or modify:

- Question records
- Question image files
- Metadata
- Future audit records

This document does not define rollback business rules.

TODO:

- Define who can perform rollback.
- Define whether rollback deletes, archives, or marks imported questions.
- Define whether rollback removes generated media files.
- Define how rollback handles questions edited after import.
- Define whether rollback itself creates a new import job or audit event.

---

## Cancellation Concept

Cancellation describes stopping or discarding an import operation before it is completed.

Cancellation may apply to:

- A preview operation
- A long-running import
- A commit operation that has not yet finalized

This document does not define cancellation behavior.

TODO:

- Define when cancellation is allowed.
- Define whether cancellation is best-effort.
- Define how temporary files are cleaned up.
- Define whether cancelled jobs appear in import history.
- Define how cancellation is communicated to the administrator.

---

## Relationship to Importer System

The import job concept must align with existing importer documentation:

- `docs/03-engineering/question-importer.md`
- `docs/03-engineering/media-system.md`
- `docs/02-content/excel-import.md`
- `docs/02-content/content-management.md`

Importer behavior remains defined by those documents.

TODO:

- Define where import job tracking belongs in the backend architecture.
- Define how importer manifests are connected to import jobs.
- Define how per-question errors are stored or displayed.

---

## TODO

- Define persistence model.
- Define admin permissions.
- Define lifecycle transitions.
- Define import history UI.
- Define rollback rules.
- Define cancellation rules.
- Define audit requirements.
