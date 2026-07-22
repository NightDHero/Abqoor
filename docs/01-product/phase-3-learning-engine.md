# Phase 3 Learning Engine - Abqoor

## Purpose

Define the MVP learning system that allows students to learn from the validated Abqoor question dataset.

Phase 3 introduces the concept of a Learning Session: a structured attempt where a student receives questions, submits answers, receives correctness evaluation, and completes the session with a simple score summary.

This document is design-only. It does not define database schema, API endpoints, frontend screens, or implementation details.

---

## Codex Instructions

- Do not implement logic from this document until Phase 3 implementation is explicitly requested.
- Do not change database schema from this document alone.
- Do not define API endpoints from this document alone.
- Do not build frontend UI from this document alone.
- Do not introduce adaptive behavior beyond the MVP Learning Intelligence Layer defined here.
- Treat this document as the Phase 3 MVP learning design contract.
- Leave future behavior as TODO placeholders unless explicitly specified.

---

## Scope

This document governs the Phase 3 MVP design for:

- Learning Session concept
- Session structure
- MVP question selection behavior
- MVP Learning Intelligence Layer
- Answer evaluation
- Per-session progress tracking
- Session result generation

This document does not govern:

- Question importing
- Content management
- Admin validation dashboards
- Adaptive learning algorithms
- Global analytics
- Mastery formulas
- Frontend implementation
- Database schema
- API contracts

---

## Current Dataset Assumption

Phase 3 MVP operates only on the existing validated bootstrap dataset:

- 49 imported image-based questions
- Question IDs: `Q-001` through `Q-049`
- Each question has a valid image URL
- Each question has a valid correct answer

TODO:

- Define how future imported question batches become eligible for Learning Sessions.
- Define whether archived or invalid questions are excluded from sessions.
- Define how content readiness is represented after the MVP.

---

## Core Concept: Learning Session

A Learning Session represents one structured learning attempt by a student.

The session is responsible for grouping selected questions, collecting student answers, evaluating correctness, and producing a final result.

A Learning Session is the Phase 3 MVP operational form of the broader Study Session Engine.

Related document:

- `docs/01-product/study-session-engine.md`

---

## Session Structure

A Learning Session conceptually includes:

- `sessionId`
- Student identity
- List of `questionIds`
- Ordered question sequence
- Answers submitted by the student
- Correctness tracking per answer
- Session timestamps
- Final score summary

This structure is conceptual only.

TODO:

- Define exact persistence model during implementation.
- Define whether session data is stored per answer or as a session payload.
- Define session status values during implementation.
- Define whether unanswered questions are stored.

---

## Session Flow

The MVP Learning Session follows this flow:

```text
Start
  ->
Fetch questions
  ->
Answer sequentially
  ->
Submit
  ->
Results
```

### Start

The student begins a new Learning Session.

TODO:

- Define what user action starts the session.
- Define whether an existing incomplete session blocks a new session.

### Fetch Questions

The system selects questions from the existing 49-question dataset.

TODO:

- Define default session size.
- Define whether Phase 3 uses all 49 questions or a smaller subset.

### Answer Sequentially

The student answers questions in the selected order.

TODO:

- Define whether students can skip questions.
- Define whether answers can be changed before final submission.
- Define whether feedback is shown immediately or only after submission.

### Submit

The student submits the session for evaluation.

TODO:

- Define whether all questions must be answered before submission.
- Define confirmation behavior before final submission.

### Results

The system returns a simple session result.

TODO:

- Define whether results are immediately visible.
- Define whether question-by-question review is included in MVP.

---

## Question Selection Engine (MVP)

For the Phase 3 MVP, question selection uses a basic Learning Intelligence Layer before each session starts.

Rules:

- Use only the existing 49 validated questions.
- Group available questions by `topic`.
- Prefer questions based on the student's prior answer history.
- Store the selected question order with the session.
- Do not use mastery formulas or advanced adaptive algorithms.

### Learning Intelligence Layer

The MVP intelligence layer applies simple priority rules:

- Unanswered questions receive higher priority.
- Previously incorrect questions receive higher priority.
- Previously correct questions receive lower priority.

If no answer history exists, the selector falls back to random order.

### Session Question Count

Each session returns a weighted subset of the available questions.

MVP default:

- 15 selected questions per session
- No duplicate question IDs
- Distribution across available topics where multiple topics exist

### Persisted Selection Order

The selected question order is stored with the session so the session remains reproducible after server restart.

Related document:

- `docs/01-product/question-selection-engine.md`

TODO:

- Define whether the session size should remain 15 or become configurable.
- Define how topic distribution should behave when topic pools are uneven.
- Define when advanced mastery-based selection replaces the MVP priority rules.

---

## Answer Evaluation

For each answered question, the system compares:

```text
userAnswer == correctAnswer
```

The system returns:

- Correct or incorrect result
- Stored response record
- Associated `questionId`
- Submitted `userAnswer`
- Expected `correctAnswer`

The MVP answer options are:

- `A`
- `B`
- `C`
- `D`

TODO:

- Define whether unanswered questions count as incorrect.
- Define whether answer evaluation happens immediately or at final submission.
- Define whether students can see the correct answer during the session.

---

## Response Records

A response record represents a student's answer to one question within a Learning Session.

Conceptual fields:

- `sessionId`
- `questionId`
- `userAnswer`
- `correctAnswer`
- `isCorrect`
- `answeredAt`

This section does not define database schema.

TODO:

- Define exact storage model.
- Define whether duplicate answers for the same question are allowed.
- Define whether answer changes create history or overwrite the current response.

---

## Session Completion

At completion, the system produces a simple result summary.

The result summary includes:

- Total questions answered
- Number correct
- Number incorrect
- Accuracy percentage
- Final score

No mastery updates are required for the MVP Learning Session.

TODO:

- Define score display format.
- Define whether skipped questions are included in total questions.
- Define whether final score is equivalent to accuracy percentage.

---

## Progress Tracking (MVP)

MVP progress tracking is per-session only.

Track:

- Total questions answered
- Number correct
- Accuracy percentage

The MVP does not include global learning analytics.

The MVP does not include long-term mastery calculations.

Related document:

- `docs/01-product/progress-system.md`

TODO:

- Define whether session summaries are saved for history.
- Define whether students can view prior session summaries.
- Define when global progress tracking begins after MVP.

---

## System Boundaries

### Learning Session

Owns session lifecycle, answer collection, answer evaluation, and final session result generation.

### Question Selection Engine

Provides the selected and ordered list of question IDs for the session.

In MVP, this is simple sequential or random selection over the 49 validated questions.

### Question System

Provides question records, images, and correct answers.

The Learning Session reads question data but does not modify question content.

### Progress System

Receives or reads completed session summaries.

In MVP, progress is limited to per-session metrics only.

### Mastery System

Not active in the MVP Learning Session.

Mastery remains a future integration point.

---

## Consistency Rules

- A Learning Session must only evaluate against stored `correctAnswer` values from the Question System.
- A Learning Session must not modify question records.
- Session results must be generated from submitted answer records.
- Per-session progress must match the completed session result.
- Adaptive learning systems must not update during the MVP Learning Session.

TODO:

- Define validation rules for incomplete sessions.
- Define recovery behavior if a session cannot be completed.
- Define how deleted or unavailable questions affect in-progress sessions.

---

## Non-Goals

The Phase 3 MVP Learning Engine does not include:

- Adaptive difficulty selection beyond the MVP priority rules
- Topic mastery calculations
- Spaced repetition
- Skill-based progression
- Personalized question weighting
- Predictive scoring
- Global analytics dashboards
- Exam simulation
- Timed sessions

---

## Future Placeholders

### Adaptive Difficulty Selection

TODO:

- Define when difficulty should affect question selection.
- Define required mastery inputs.
- Define safeguards for MVP simplicity.

### Topic Mastery System

TODO:

- Define topic-level mastery representation.
- Define how completed sessions update mastery.
- Define how mastery affects future question selection.

### Spaced Repetition

TODO:

- Define review scheduling rules.
- Define relationship between spaced repetition and weak topics.
- Define repeated-question behavior.

### Skill-Based Progression

TODO:

- Define skill taxonomy.
- Define how questions map to skills.
- Define progression criteria.

---

## Related Documents

- `docs/01-product/study-session-engine.md`
- `docs/01-product/question-selection-engine.md`
- `docs/01-product/progress-system.md`
- `docs/01-product/mastery-system.md`
- `docs/02-content/question-format.md`
- `docs/03-engineering/system-integration.md`

---

## TODO

- Confirm sequential vs random MVP question order.
- Define default session length.
- Define session status values.
- Define answer submission behavior.
- Define result summary format.
- Define Phase 3 implementation acceptance criteria.
