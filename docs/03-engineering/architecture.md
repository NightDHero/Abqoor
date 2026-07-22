# Architecture - Abqoor

## Purpose

Define the overall structure of Abqoor and how its major subsystems connect.

This document describes system relationships at a high level. It does not define implementation details, endpoints, database structure, or deployment infrastructure.

---

## Codex Instructions

- Keep this document architectural and conceptual.
- Do not implement anything from this document.
- Do not define API endpoints.
- Do not define database schema.
- Do not add technical implementation details unless explicitly approved elsewhere.
- Leave unknown architecture decisions as TODOs.

---

## System Overview

Abqoor consists of the following core systems:

- Authentication System
- Question System
- Media System
- Import System
- Study Session Engine
- Question Selection Engine
- Mastery System
- Progress System

Each system has a focused responsibility and should interact with other systems through clear conceptual boundaries.

---

## High-Level Architecture

Conceptual flow:

```text
User
  ->
Authentication
  ->
Study Session
  ->
Question Selection
  ->
Answer Submission
  ->
Session Completion
  ->
Mastery Update
  ->
Progress Update
```

This flow describes how the product experience connects major systems. It does not define technical implementation or runtime sequence details.

---

## System Boundaries

### Content Layer

The Content Layer manages question content and related media.

Includes:

- Questions
- Media
- Import system

Responsibilities:

- Store and expose question content.
- Store question image references.
- Import and enrich question content.
- Preserve image-based question content.

TODO:

- Define final content status model.
- Define how content review integrates with student availability.

### Learning Layer

The Learning Layer manages the student's study experience and learning state.

Includes:

- Study sessions
- Question selection
- Mastery system
- Progress system

Responsibilities:

- Create and manage study sessions.
- Select appropriate questions for sessions.
- Represent long-term mastery.
- Represent learning progress over time.

TODO:

- Define MVP learning system boundaries.
- Define how session results are handed to mastery and progress systems.

### User Layer

The User Layer manages identity and direct student interaction.

Includes:

- Authentication
- Session interaction

Responsibilities:

- Identify users.
- Protect authenticated experiences.
- Allow students to interact with study sessions.

TODO:

- Define final user roles.
- Define administrator vs student boundaries.

---

## Data Flow Overview

At a high level, data moves through Abqoor as follows:

1. A user authenticates.
2. A student starts a study session.
3. The Study Session Engine requests selected questions.
4. The Question Selection Engine uses available question content and future mastery inputs.
5. The student answers questions.
6. The session produces completion outputs.
7. Completion outputs inform future mastery updates.
8. Mastery and session outcomes inform progress views.

This overview does not define database schema, API contracts, calculations, or algorithms.

TODO:

- Define which data contracts are required between systems.
- Define which systems require synchronous vs asynchronous interaction.
- Define failure handling between dependent systems.

---

## Import System Role

The Import System is part of the Content Layer.

Imports:

- Populate the Question System.
- Generate question images.
- Feed the content layer.

The Import System must remain separate from learning behavior. It does not select questions, score sessions, update mastery, or update progress.

Related documents:

- `docs/03-engineering/question-importer.md`
- `docs/03-engineering/media-system.md`
- `docs/02-content/excel-import.md`
- `docs/02-content/content-management.md`
- `docs/02-content/import-jobs.md`

TODO:

- Define how import jobs are tracked architecturally.
- Define how imported content becomes available to students.

---

## Design Principles

### Modular Design

Each major system should remain independently understandable and replaceable where practical.

TODO:

- Define module ownership boundaries.

### Separation of Concerns

Content systems, learning systems, and user systems should not take on each other's responsibilities.

TODO:

- Define integration contracts between layers.

### Rule-Based MVP Logic

MVP behavior should favor clear, auditable rules over opaque optimization.

TODO:

- Define which systems require explicit MVP rules before implementation.

### No Tight Coupling Between Systems

Systems should depend on stable inputs and outputs rather than internal implementation details of other systems.

TODO:

- Define coupling risks as implementation progresses.

---

## Future Scaling Considerations

### Distributed Scaling

TODO:

- Define which systems may need independent scaling.
- Define background processing needs.
- Define media storage and delivery strategy.

### Analytics Systems

TODO:

- Define analytics data sources.
- Define privacy requirements.
- Define reporting needs.

### AI-Driven Enhancements (Not MVP)

TODO:

- Define where AI may support future workflows.
- Define auditability and safety requirements.
- Define which systems must remain rule-based during MVP.

---

## Related Documents

- `docs/01-product/study-session-engine.md`
- `docs/01-product/question-selection-engine.md`
- `docs/01-product/mastery-system.md`
- `docs/01-product/progress-system.md`
- `docs/02-content/question-format.md`
- `docs/03-engineering/question-importer.md`
- `docs/03-engineering/media-system.md`
- `docs/03-engineering/authentication.md`

---

## TODO

- Define final system context diagram.
- Define backend module boundaries.
- Define frontend module boundaries.
- Define integration contracts between systems.
- Define deployment architecture.
