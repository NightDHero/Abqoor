# Content Management System - Abqoor

## Purpose

Define how administrators manage question content throughout its lifecycle in Abqoor.

The Content Management System (CMS) is responsible for creating, importing, editing, organizing, reviewing, and deleting question content.

The CMS must support question operations without changing the core principle that question content is image-based and metadata-driven.

---

## Codex Instructions

- Do not invent CMS implementation details.
- Do not redefine importer, media, or Excel enrichment behavior.
- Reference existing specifications where behavior is already defined.
- Leave unknown workflows, permissions, audit fields, and UI details as TODOs.
- Keep CMS scope limited to content administration.
- Do not implement adaptive learning, study sessions, subscriptions, or student-facing practice logic in the CMS.

---

## Scope

The CMS is responsible for:

- Importing questions
- Viewing questions
- Searching questions
- Filtering questions
- Editing questions
- Deleting questions
- Bulk operations
- Import history
- Rollback of imports

The CMS is not responsible for:

- Student practice sessions
- Adaptive question selection
- Progress tracking
- Payment or subscription logic
- AI interpretation of question images
- Text extraction from images

---

## Question Lifecycle

Question content should move through a defined administrative lifecycle.

```text
Draft
  ->
Imported
  ->
Reviewed
  ->
Available for Students
  ->
Archived (future)
```

### Draft

Placeholder state for content that has not yet been imported or approved.

TODO:

- Define whether draft questions are stored in the production questions table.
- Define who can create draft content.
- Define how drafts are reviewed.

### Imported

Questions that have been created through the importer system but have not necessarily completed administrative review.

TODO:

- Define how imported questions are grouped into batches.
- Define how import validation status is stored.
- Define whether imported questions are immediately visible to students.

### Reviewed

Questions that have passed administrative review.

TODO:

- Define review roles.
- Define review checklist.
- Define review approval workflow.

### Available for Students

Questions approved for student-facing practice and study flows.

TODO:

- Define publication rules.
- Define whether availability is controlled by question status, metadata, or another mechanism.
- Define how unavailable questions are hidden from student APIs.

### Archived (Future)

Questions removed from active student use without permanent deletion.

TODO:

- Define archive rules.
- Define restore behavior.
- Define whether archived questions remain visible in admin search.

---

## Import Management

The CMS must use the existing importer specifications as the source of truth for import behavior:

- `docs/03-engineering/question-importer.md`
- `docs/03-engineering/media-system.md`
- `docs/02-content/excel-import.md`

This document does not redefine importer behavior.

### Preview

Placeholder for reviewing an import plan before writing changes.

TODO:

- Define preview UI.
- Define preview summary fields.
- Define how per-question validation errors are displayed.

### Commit

Placeholder for finalizing an import after validation.

TODO:

- Define commit confirmation behavior.
- Define commit permissions.
- Define how committed import batches are recorded.

### Cancel Import

Placeholder for stopping or discarding an import before commit.

TODO:

- Define whether generated temporary files are retained or removed.
- Define whether cancelled imports are recorded in history.

### Import Progress

Placeholder for tracking large imports while processing.

TODO:

- Define progress states.
- Define progress polling or realtime updates.
- Define how per-page failures are surfaced.

### Import History

Placeholder for viewing previous imports.

TODO:

- Define import batch fields.
- Define import status values.
- Define import owner tracking.
- Define import report retention.

### Rollback of Imports

Placeholder for reverting an import batch.

TODO:

- Define rollback permissions.
- Define whether rollback deletes question images.
- Define whether rollback archives or deletes question records.
- Define rollback audit requirements.

---

## Question Management

The CMS must allow administrators to manage individual and grouped questions.

### Edit Question

Placeholder for editing administrative question fields.

TODO:

- Define editable fields.
- Define validation rules.
- Define whether edits require review.

### Replace Question Image

Placeholder for replacing the image associated with a question.

TODO:

- Define allowed file types.
- Define whether replaced images are versioned.
- Define whether replacement requires review.

### Change Correct Answer

Placeholder for changing the correct answer metadata.

TODO:

- Define allowed answer values.
- Define whether answer changes require audit notes.
- Define whether answer changes invalidate previous student attempts.

### Change Metadata

Placeholder for editing metadata such as subject, topic, subtopic, difficulty, skill tags, and related fields.

TODO:

- Define required metadata fields.
- Define controlled vocabularies.
- Define metadata validation rules.

### Delete Question

Placeholder for deleting a single question.

TODO:

- Define hard delete vs soft delete.
- Define whether associated media is deleted.
- Define delete permissions.

### Bulk Delete

Placeholder for deleting multiple questions.

TODO:

- Define selection rules.
- Define confirmation requirements.
- Define rollback behavior.

---

## Search & Filters

The CMS must support finding and organizing questions for administrative workflows.

### Search by Question ID

TODO:

- Define exact-match and partial-match behavior.
- Define supported ID formats.

### Filter by Subject

TODO:

- Define available subject values.
- Define whether subject values are fixed or configurable.

### Filter by Topic

TODO:

- Define topic source of truth.
- Define topic naming rules.

### Filter by Difficulty

TODO:

- Define difficulty range.
- Define multi-select or range filtering behavior.

### Filter by Import Batch

TODO:

- Define import batch identifier.
- Define batch search behavior.
- Define how batches relate to rollback.

---

## Bulk Operations

The CMS should support administrative bulk operations where appropriate.

TODO:

- Define supported bulk actions.
- Define permission requirements.
- Define preview and confirmation behavior.
- Define how bulk operation failures are reported.

---

## Audit History

The CMS must eventually support audit history for content changes.

Audit history should describe:

- Who modified a question
- When the modification occurred
- What changed

Implementation details are not yet defined.

### Who Modified a Question

TODO:

- Define user identity fields.
- Define whether system/importer actions are recorded differently from human admin actions.

### When a Question Was Modified

TODO:

- Define timestamp format.
- Define timezone handling.
- Define whether created and updated timestamps are sufficient or if separate audit events are required.

### What Changed

TODO:

- Define changed-field tracking.
- Define before/after value storage.
- Define whether media changes require special audit records.

---

## Future Features

### Bulk Metadata Editing

TODO:

- Define supported metadata fields.
- Define validation rules.
- Define preview behavior before commit.

### Duplicate Detection

TODO:

- Define duplicate detection strategy.
- Define whether duplicates are detected by image, metadata, question ID, or import source.

### Version History

TODO:

- Define versioning model.
- Define whether images and metadata are versioned together.
- Define how versions are restored.

### Restore Deleted Questions

TODO:

- Define soft-delete model.
- Define restore permissions.
- Define media restoration behavior.

---

## Related Documents

- `docs/02-content/question-format.md`
- `docs/02-content/excel-import.md`
- `docs/03-engineering/question-importer.md`
- `docs/03-engineering/media-system.md`

---

## TODO

- Define CMS admin roles and permissions.
- Define CMS navigation and page structure.
- Define content status model.
- Define import batch data model.
- Define audit event data model.
- Define rollback behavior.
- Define deletion and archival policy.
