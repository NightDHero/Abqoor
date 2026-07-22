# Study Session Engine - Abqoor

## Purpose

Define the complete lifecycle of a student's study session in Abqoor.

The Study Session Engine describes how a session begins, progresses, collects answers, completes, and produces a summary.

This document does not define implementation details.

---

## Codex Instructions

- Do not invent adaptive learning behavior.
- Do not invent database schema.
- Do not invent API endpoints.
- Do not define scoring, mastery, or progress update rules unless explicitly specified elsewhere.
- Leave unknown decisions as TODOs.
- Keep this document focused on the study session lifecycle.

---

## Scope

This document governs:

- Session creation
- Session lifecycle
- Question delivery
- Answer collection
- Session completion
- Session summary

This document does not govern:

- Question importer behavior
- Content management workflows
- Payment or subscription rules
- Adaptive learning algorithms
- Progress tracking implementation

---

## Data Flow

At a conceptual level, a study session follows this flow:

```text
Student starts session
  ->
Question Selection Engine selects questions
  ->
Student answers questions
  ->
Session results are generated
  ->
Mastery System is updated
  ->
Progress System is updated
```

This data flow describes system alignment only. It does not define algorithms, calculations, database schema, or API endpoints.

TODO:

- Define when question selection occurs relative to session creation.
- Define which session result fields are passed to mastery and progress systems.
- Define failure handling between completion, mastery updates, and progress updates.

---

## System Dependencies

The Study Session Engine depends on related product systems for selection, mastery, and progress workflows.

### Question Selection Engine (Input)

The Question Selection Engine provides the selected question IDs and session sequence used by the study session.

Related document:

- `docs/01-product/question-selection-engine.md`

TODO:

- Define the selection request inputs.
- Define how selected question IDs are attached to a session.
- Define behavior when selection cannot return enough questions.

### Mastery System (Updates)

The Mastery System receives completed session outcomes as future input for learning progress representation.

Related document:

- `docs/01-product/mastery-system.md`

TODO:

- Define which completed session data is eligible for mastery updates.
- Define when mastery updates occur after session completion.

### Progress System (Output)

The Progress System uses completed session outcomes and mastery data to represent student learning improvement over time.

Related document:

- `docs/01-product/progress-system.md`

TODO:

- Define which session outputs are visible in progress views.
- Define how progress updates relate to session summaries.

---

## Session Lifecycle

### Session Created

Placeholder state for a session that has been initialized but not yet started.

TODO:

- Define what information is required to create a session.
- Define whether questions are selected at creation time or later.
- Define how long an unstarted session remains valid.

### Session Started

Placeholder state for a session that the student has begun.

TODO:

- Define what action starts a session.
- Define whether timing begins at this state.
- Define whether a started session can return to created state.

### Session In Progress

Placeholder state for a session where questions are being delivered and answers are being collected.

TODO:

- Define question delivery order.
- Define navigation behavior.
- Define autosave requirements.
- Define how unanswered questions are represented.

### Session Completed

Placeholder state for a session submitted or otherwise finalized.

TODO:

- Define completion requirements.
- Define whether incomplete answers are allowed.
- Define when results become visible to the student.

### Session Cancelled

Placeholder state for a session intentionally exited before completion.

TODO:

- Define cancellation rules.
- Define whether cancelled sessions affect progress.
- Define whether cancelled sessions can be resumed.

### Session Expired (Future)

Placeholder state for sessions that expire because of time, inactivity, or future policy rules.

TODO:

- Define expiration conditions.
- Define whether expired sessions can be resumed.
- Define whether expired sessions affect progress.

---

## Session Structure

A study session contains session-level information needed to deliver questions and collect student answers.

### Student

Represents the student associated with the session.

TODO:

- Define student identity requirements.
- Define whether anonymous sessions are allowed.

### Questions

Represents the questions included in the session.

TODO:

- Define how questions are selected.
- Define whether question order is fixed or dynamic.
- Define how unavailable questions are handled.

### Answers

Represents student answers submitted during the session.

TODO:

- Define answer format.
- Define whether answers can be changed.
- Define how unanswered questions are stored.

### Timing Information

Represents timing data associated with the session.

TODO:

- Define whether timing is required for MVP.
- Define per-question vs whole-session timing.
- Define inactivity handling.

### Final Result

Represents the final outcome of the session.

TODO:

- Define result fields.
- Define when the result is generated.
- Define whether results are visible immediately.

---

## Student Actions

### Start Session

Placeholder for the student action that begins a study session.

TODO:

- Define start conditions.
- Define what happens if a session has no questions.

### Answer Question

Placeholder for selecting or submitting an answer for a question.

TODO:

- Define whether answers are saved immediately.
- Define whether students can revise answers.
- Define validation behavior for answer options.

### Navigate Questions

Placeholder for moving between questions in a session.

TODO:

- Define whether free navigation is allowed.
- Define whether questions can be skipped.
- Define whether navigation differs by session type.

### Submit Session

Placeholder for final session submission.

TODO:

- Define confirmation behavior.
- Define handling for unanswered questions.
- Define whether submission can be undone.

### Exit Session

Placeholder for leaving a session before completion.

TODO:

- Define exit behavior.
- Define whether exiting cancels, pauses, or preserves the session.
- Define whether exit requires confirmation.

---

## Session Completion

Session completion may trigger future scoring, mastery, progress, and summary workflows.

This document does not define those systems.

At session completion, the system produces:

- Answer records
- Score summary
- Performance snapshot

This document does not define score calculations, mastery update rules, or progress aggregation formulas.

### Score Calculation

Placeholder for calculating the student's session score.

TODO:

- Define scoring rules.
- Define whether scoring is immediate.
- Define how skipped or unanswered questions affect scoring.

### Mastery Updates

Placeholder for future integration with the adaptive learning system.

Related document:

- `docs/01-product/adaptive-learning.md`

TODO:

- Define mastery update rules.
- Define which session data is used for mastery updates.

### Progress Updates

Placeholder for future integration with progress tracking.

TODO:

- Define progress metrics.
- Define when progress updates are persisted.
- Define how progress updates relate to session completion.

### Session Summary Generation

Placeholder for generating a student-facing session summary.

TODO:

- Define summary fields.
- Define whether explanations are included.
- Define whether summaries are saved.

---

## Consistency Rules

The Study Session Engine must remain consistent with the Mastery System and Progress System.

- Session results must align with mastery updates.
- Progress must reflect session outcomes.
- No system may update independently without session completion.

TODO:

- Define consistency checks.
- Define retry or recovery behavior for failed downstream updates.
- Define how cancelled or expired sessions interact with consistency rules.

---

## Future Features

### Timed Sessions

TODO:

- Define timing rules.
- Define timer display behavior.
- Define what happens when time expires.

### Practice Mode

TODO:

- Define practice mode goals.
- Define whether practice mode affects progress.
- Define answer feedback behavior.

### Resume Session

TODO:

- Define resumable session states.
- Define resume time limits.
- Define how partially answered sessions are restored.

### Exam Simulation

TODO:

- Define exam simulation structure.
- Define timing rules.
- Define scoring and review behavior.

### Session Templates

TODO:

- Define template fields.
- Define who can create templates.
- Define how templates select questions.

---

## Related Documents

- `docs/01-product/adaptive-learning.md`
- `docs/01-product/mastery-system.md`
- `docs/01-product/question-selection-engine.md`
- `docs/01-product/progress-system.md`
- `docs/01-product/study-plans.md`
- `docs/02-content/question-format.md`

---

## TODO

- Define MVP session types.
- Define session status values.
- Define session completion criteria.
- Define session summary requirements.
- Define progress tracking integration.
- Define adaptive learning integration.
