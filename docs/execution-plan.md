# Execution Plan - Abqoor

## Purpose

Convert all existing documentation into a strict, step-by-step build order that Codex must follow without deviation.

This document is the master execution control file for the entire Abqoor project.

---

## Execution Rules

- Codex must follow steps in order.
- Codex must not skip phases.
- Codex must not redesign systems during implementation.
- Codex must only implement what is specified in `/docs`.
- If something is missing, Codex must stop and report it.

---

## Phase 1 - Infrastructure

Tasks:

- Backend setup with Express, Node.js, and TypeScript
- Database connection with SQLite
- Authentication system
- Media system for question image storage
- Base project structure

Required references:

- `docs/03-engineering/tech-stack.md`
- `docs/03-engineering/architecture.md`
- `docs/03-engineering/api.md`
- `docs/03-engineering/database.md`
- `docs/03-engineering/authentication.md`
- `docs/03-engineering/media-system.md`

---

## Phase 2 - Content System

Tasks:

- Question database implementation
- Question image support
- Import system for PDF and Excel
- Import jobs tracking
- Content management system for admin workflows

Required references:

- `docs/02-content/question-format.md`
- `docs/02-content/import-data-sources.md`
- `docs/02-content/excel-import.md`
- `docs/02-content/content-management.md`
- `docs/02-content/import-jobs.md`
- `docs/03-engineering/question-importer.md`
- `docs/03-engineering/media-system.md`

---

## Phase 3 - Learning Core

Tasks:

- Study Session Engine implementation
- Question Selection Engine implementation
- Mastery System implementation
- Progress System implementation

Required references:

- `docs/01-product/phase-3-learning-engine.md`
- `docs/01-product/study-session-engine.md`
- `docs/01-product/question-selection-engine.md`
- `docs/01-product/mastery-system.md`
- `docs/01-product/progress-system.md`
- `docs/03-engineering/system-integration.md`

---

## Phase 4 - Admin Tools

Tasks:

- Question editing
- Question deletion
- Import cancel
- Import rollback
- Import history UI

Required references:

- `docs/02-content/content-management.md`
- `docs/02-content/import-jobs.md`
- `docs/03-engineering/system-integration.md`

---

## Phase 5 - Frontend Core

Tasks:

- Study session UI
- Question display UI using image-based questions
- Answer selection UI
- Progress dashboard UI

Required references:

- `docs/01-product/study-session-engine.md`
- `docs/01-product/progress-system.md`
- `docs/02-content/question-format.md`
- `docs/04-design/design-system.md`
- `docs/04-design/ui-principles.md`
- `docs/04-design/ux-principles.md`

---

## Phase 6 - Final Integration

Tasks:

- Full system integration testing
- Fix data flow issues
- Validate learning loop:

```text
Session -> Mastery -> Progress -> Next Session
```

Required references:

- `docs/03-engineering/system-integration.md`
- `docs/03-engineering/architecture.md`
- `docs/roadmap.md`

---

## Critical Rules

- No feature additions allowed.
- No redesigns allowed.
- No schema changes unless required by docs.
- No skipping phases.
- Must respect `/docs` as the single source of truth.

---

## Failure Handling

If Codex detects missing information:

- It must stop.
- It must report the missing spec.
- It must not guess or implement.

---

## Output

This document becomes the master execution control file for the entire project.

Codex must use this document before implementation work to determine:

- Which phase is active.
- Which documents must be read.
- Which work is allowed.
- Which missing specifications block implementation.
