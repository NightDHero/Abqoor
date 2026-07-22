# Roadmap - Abqoor

## Purpose

Break down the Abqoor project into clear build phases before implementation begins.

This roadmap organizes approved systems from the existing documentation into a sequential implementation plan.

---

## Codex Instructions

- Do not add new features that are not already represented in existing documentation.
- Do not redesign systems.
- Use this roadmap to sequence approved work only.
- Keep the roadmap high-level and execution-focused.
- Leave detailed requirements in the relevant specification documents.

---

## Phase 1 - Core Infrastructure

Goal:

Establish the technical foundation required for all future systems.

Includes:

- Authentication system
- Database setup
- Media system
- Basic API structure

Primary references:

- `docs/03-engineering/authentication.md`
- `docs/03-engineering/database.md`
- `docs/03-engineering/media-system.md`
- `docs/03-engineering/api.md`
- `docs/03-engineering/tech-stack.md`

---

## Phase 2 - Content System

Goal:

Build the content layer that stores, imports, enriches, and manages question content.

Includes:

- Question system
- Import system for PDF and Excel
- Question image pipeline
- Content management system

Primary references:

- `docs/02-content/question-format.md`
- `docs/02-content/import-data-sources.md`
- `docs/02-content/excel-import.md`
- `docs/02-content/content-management.md`
- `docs/02-content/import-jobs.md`
- `docs/03-engineering/question-importer.md`
- `docs/03-engineering/media-system.md`

---

## Phase 3 - Learning Engine

Goal:

Build the student learning flow and the systems that represent learning progress.

Includes:

- Study Session Engine
- Question Selection Engine
- Mastery System
- Progress System

Primary references:

- `docs/01-product/phase-3-learning-engine.md`
- `docs/01-product/study-session-engine.md`
- `docs/01-product/question-selection-engine.md`
- `docs/01-product/mastery-system.md`
- `docs/01-product/progress-system.md`
- `docs/03-engineering/system-integration.md`

---

## Phase 4 - Admin Tools

Goal:

Build administrative tooling for maintaining and auditing content after import.

Includes:

- Question editing
- Question deletion
- Import jobs management
- Audit system

Primary references:

- `docs/02-content/content-management.md`
- `docs/02-content/import-jobs.md`
- `docs/03-engineering/system-integration.md`

---

## Phase 5 - Polish & Expansion

Goal:

Improve reliability, visibility, and future readiness after core systems are implemented.

Includes:

- Performance optimization
- Analytics
- Future scalability improvements

Primary references:

- `docs/03-engineering/architecture.md`
- `docs/03-engineering/system-integration.md`
- `docs/03-engineering/tech-stack.md`

TODO:

- Define performance targets.
- Define analytics requirements.
- Define scalability milestones.

---

## Rules

- Do not add new features not in existing docs.
- Do not redesign systems.
- Only organize existing approved systems.
- Keep it high-level and execution-focused.

---

## TODO

- Define phase completion criteria.
- Define release readiness checklist per phase.
- Define implementation ownership.
- Revalidate roadmap after each completed phase.
