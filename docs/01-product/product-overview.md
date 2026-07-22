# Product Overview - Abqoor

## Purpose

Define what Abqoor is, who it serves, and which major product modes make up the current system.

This document is a product-level overview. Detailed behavior belongs in the related product, content, and engineering specifications.

---

## Codex Instructions

- Do not implement features from this document.
- Do not invent backend behavior that is not represented in the current system or related docs.
- Treat implemented behavior, partial concepts, and future concepts as separate states.
- Keep the product direction aligned with an Arabic-first Qudurat learning experience.

---

## What is Abqoor?

Abqoor is an Arabic-first Qudurat preparation platform for students in Saudi Arabia.

The platform combines:

- Image-based Qudurat-style questions imported from PDFs.
- Excel `.xlsx` metadata enrichment for correct answers and content metadata.
- Authenticated learning sessions.
- A basic adaptive selection layer for recommended practice.
- Admin validation tools for verifying imported content quality.

---

## Target Users

### Students

Students use Abqoor to practice Qudurat questions, receive recommended study sessions, and review their learning performance over time.

### Administrators

Administrators use Abqoor to import, validate, and inspect question content.

### Future Institutional Users

Institutions and instructors are possible future users, but they are outside the MVP unless explicitly specified later.

---

## Core Product Modes

### Practice Mode

Practice Mode is the direct learning path.

Expected flow:

```text
Pillar
  ->
Topic
  ->
Subtopic
  ->
Instant question session
```

Pillars:

- Math
- Arabic

Purpose:

- Let students choose exactly what they want to practice.
- Support focused topic and subtopic drilling.
- Provide immediate access to question practice.

Current implementation status:

- The Question System stores subject, topic, difficulty, and optional subtopic metadata.
- Full topic/subtopic navigation UI is not yet implemented.

TODO:

- Define official topic and subtopic taxonomy.
- Define whether Practice Mode uses the same session engine as recommended sessions.
- Define instant feedback behavior.

### Recommended Study Mode

Recommended Study Mode is the adaptive learning path.

Purpose:

- Select questions for the student based on prior answer history.
- Prioritize unanswered and previously incorrect questions.
- Lower priority for previously correct questions.
- Keep sessions short and focused.

Current implementation status:

- Implemented as the Phase 3 Learning Intelligence Layer.
- `POST /sessions/start` creates an adaptive learning session.
- Sessions currently select 15 questions.
- Selected question order is persisted with the session.
- The current MVP uses auditable rule-based adaptive selection, not an external AI model.

Product direction:

- Future AI-driven selection may enhance this mode after the MVP.
- Any future AI behavior must remain explainable and auditable.

Related document:

- `docs/01-product/phase-3-learning-engine.md`

### Exam Mode

Exam Mode is the structured evaluation path.

Purpose:

- Simulate the structure and pressure of a Qudurat-style exam.
- Present grouped sections rather than open-ended practice.
- Produce an exam-style score and review experience.

Current implementation status:

- Exam Mode is a future or partial product concept.
- It is not fully implemented as a production flow.

Expected high-level concept:

- Five-section exam structure.
- Timed or structured progression.
- Final score and review after completion.

TODO:

- Define exact exam section names and timing rules.
- Define whether Exam Mode uses the same session tables or a dedicated exam model.
- Define score calculation and review behavior.

### Validation Dashboard

The Validation Dashboard is an admin-only content inspection tool.

Purpose:

- Verify that imported questions are present.
- Confirm question images are accessible.
- Confirm correct answers are mapped.
- Detect missing or corrupted imported content.

Current implementation status:

- Implemented as a read-only admin dashboard.
- It reflects the imported question dataset and validation counts.

The Validation Dashboard is not a student learning mode.

---

## Content Foundation

The current content pipeline is:

```text
PDF pages
  ->
Question images
  ->
Excel .xlsx metadata
  ->
Question records
  ->
Validation dashboard
  ->
Learning sessions
```

Rules:

- PDF is the official source for question images.
- Excel `.xlsx` is the only spreadsheet import source.
- Google Sheets may be used externally for authoring, but it is not imported directly in the MVP.
- Questions are image-based.

Related documents:

- `docs/02-content/import-data-sources.md`
- `docs/02-content/excel-import.md`
- `docs/03-engineering/question-importer.md`
- `docs/03-engineering/media-system.md`

---

## Current MVP Capabilities

The system currently supports:

- User authentication.
- PDF and Excel-based question import.
- Static image serving for question images.
- Admin validation dashboard.
- Persistent learning sessions.
- Adaptive 15-question recommended sessions.
- Answer submission and scoring.

---

## Out of Scope for Current MVP

The current MVP does not include:

- Direct Google Sheets importing.
- Fully implemented Exam Mode.
- Full topic/subtopic Practice Mode UI.
- Global mastery analytics.
- Spaced repetition.
- External AI model-based recommendation.
- Social features.
- Leaderboards.
- Gamification.

---

## Product Goal

Help students prepare for the Qudurat exam through a clear Arabic-first learning experience that combines reliable content, focused practice, and progressively smarter recommendation.

---

## TODO

- Finalize the Math and Arabic topic taxonomy.
- Define subtopic hierarchy.
- Define Practice Mode acceptance criteria.
- Define Exam Mode section structure.
- Define future AI recommendation requirements.
