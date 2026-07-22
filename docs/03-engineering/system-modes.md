# System Modes - Abqoor

## Purpose

Define the major learning modes in Abqoor and how they interact with sessions, navigation, and persistence.

This document is an engineering-oriented system design reference. It does not implement code, change database schema, or define new endpoints.

---

## Codex Instructions

- Do not implement from this document unless explicitly instructed.
- Do not modify importer behavior from this document.
- Do not introduce schema changes from this document alone.
- Keep all mode behavior aligned with the existing PDF, Excel, question, session, and validation systems.
- Mark future or partial behavior clearly.

---

## Current System Baseline

Implemented systems relevant to modes:

- Authentication system.
- Question System with image-based questions.
- PDF to question-image pipeline.
- Excel `.xlsx` metadata importer.
- Validation Dashboard.
- Persistent session system.
- Session answers with correctness.
- Adaptive 15-question session selection.

Current content source rule:

- PDF provides question images.
- Excel `.xlsx` provides metadata.
- No direct Google Sheets import exists in the MVP.

---

## Mode Summary

Abqoor uses three learning modes:

- Practice Mode: direct learning.
- Recommended Mode: adaptive selection.
- Exam Mode: structured timed evaluation.

Only the persistent session system and adaptive recommended selection are currently implemented as the backend learning foundation.

---

## Practice Mode

### Purpose

Practice Mode lets students directly choose what to study.

Expected flow:

```text
Pillar
  ->
Topic
  ->
Subtopic
  ->
Practice session
```

### Selection Behavior

Practice Mode should select questions based on explicit student choice:

- Pillar: Math or Arabic.
- Topic.
- Subtopic where available.

It should not override the student's selection with adaptive recommendations.

Current implementation status:

- Full Practice Mode filtering is not yet implemented.
- Existing question records contain fields that can support this mode, including subject, topic, difficulty, and optional subtopic.

### Navigation Rules

- Students enter Practice Mode from the Career Dashboard.
- Students choose pillar before topic.
- Students choose topic before subtopic.
- Students start a session after selecting the desired scope.
- Students may return to the dashboard before starting a session.

TODO:

- Define whether students can switch topics mid-session.
- Define whether incomplete practice sessions can be resumed.

### Session Lifecycle Rules

Practice Mode should follow the standard session lifecycle:

```text
created or started
  ->
active
  ->
completed
```

TODO:

- Define exact status transitions.
- Define whether Practice Mode supports cancellation.
- Define whether Practice Mode supports instant feedback.

### Database Writes

When implemented using the current session system, Practice Mode should write:

- A row in `sessions`.
- Selected question order in the session record.
- One row per submitted answer in `session_answers`.

It should read:

- `questions`
- question image URLs from the Question and Media systems

It should not write:

- question records
- import jobs
- media files
- validation records

Current implementation status:

- No dedicated Practice Mode persistence is implemented yet.

---

## Recommended Mode

### Purpose

Recommended Mode is the guided adaptive study path.

It chooses questions for the student before the session starts.

### Selection Behavior

Current MVP behavior:

- Uses the existing imported question dataset.
- Groups questions by `topic`.
- Prioritizes unanswered questions.
- Prioritizes previously incorrect questions.
- Deprioritizes previously correct questions.
- Falls back to random ordering if the student has no history.
- Selects 15 questions.
- Stores selected question order with the session.

The current MVP uses rule-based adaptive selection. Future AI-driven selection may replace or enhance this logic after explicit specification.

### Navigation Rules

- Students enter Recommended Mode from the dashboard or learning entry point.
- Starting a recommended session immediately creates a session.
- Students answer questions in the selected order.
- Results are shown after session completion or after submitted answers are evaluated.

TODO:

- Define whether students can pause and resume recommended sessions.
- Define whether students can skip questions.
- Define whether students can review answers during the session.

### Session Lifecycle Rules

Recommended Mode currently uses:

- Session creation at start.
- Active session while answering.
- Result computation from stored answers.

The selected order must remain stable for the life of the session.

Rules:

- Submitted answers must belong to the selected question order.
- Non-selected questions must not be accepted for the session.
- Results must be computed from persisted session answers.
- Session result totals must use selected session size, not the full question bank size.

### Database Writes

Recommended Mode currently writes:

- `sessions.session_id`
- `sessions.user_id`
- `sessions.question_order`
- `sessions.created_at`
- `sessions.updated_at`
- `sessions.status`
- `session_answers.session_id`
- `session_answers.question_id`
- `session_answers.user_answer`
- `session_answers.is_correct`
- `session_answers.created_at`

Recommended Mode reads:

- `questions`
- historical `session_answers`
- prior `sessions`

Recommended Mode does not write:

- imported question records
- question images
- import jobs
- admin validation data

---

## Exam Mode

### Purpose

Exam Mode is the structured timed evaluation path.

It is intended to simulate an exam-like experience rather than open practice or adaptive recommendation.

### Expected Structure

Conceptual structure:

- Five exam sections.
- Fixed or controlled question sequence.
- Timed section or timed exam rules.
- Final exam score.
- Post-exam review.

Current implementation status:

- Exam Mode is a future or partial concept.
- It is not fully implemented as a production backend flow.

### Selection Behavior

Exam Mode should select questions according to exam structure, not student weakness.

Expected future rules:

- Use section requirements.
- Preserve section order.
- Avoid adaptive substitution during an active exam.
- Store enough information to reproduce the exam after completion.

TODO:

- Define section names.
- Define question count per section.
- Define whether questions are randomized within sections.

### Navigation Rules

Expected future navigation:

- Student starts Exam Mode.
- Student progresses through five sections.
- Section navigation may be restricted.
- Student submits the exam.
- Student views score and review.

TODO:

- Define whether students can go backward within a section.
- Define whether students can go backward across sections.
- Define timeout behavior.

### Session Lifecycle Rules

Exam Mode should have a stricter lifecycle than practice:

```text
created
  ->
active
  ->
completed
```

Future statuses may include:

- cancelled
- expired

TODO:

- Define whether Exam Mode reuses `sessions.status`.
- Define whether Exam Mode requires separate exam-specific status fields.
- Define how expired exams are scored.

### Database Writes

Current status:

- Exam Mode does not currently write production exam data.

Expected future writes:

- Session or exam record.
- Selected question order grouped by section.
- Submitted answers.
- Score summary.
- Timing information.

Potential reuse:

- `sessions`
- `session_answers`

Potential future additions:

- exam section metadata
- timing data
- exam-specific result summary

TODO:

- Decide whether Exam Mode extends the current session model or uses dedicated exam tables.
- Define timing persistence.
- Define exam review persistence.

---

## Cross-Mode Navigation Rules

### Landing to Authenticated Experience

- Signed-out users start on the landing page.
- Signed-out users may log in or register.
- Authenticated students enter the dashboard or learning entry point.

### Dashboard to Learning Modes

The dashboard routes students to:

- Practice Mode
- Recommended Mode
- Exam Mode
- Review

### Learning Mode Boundaries

Rules:

- Practice Mode should respect explicit student topic/subtopic choices.
- Recommended Mode should use adaptive selection.
- Exam Mode should use fixed exam structure.
- Admin validation and import tools must remain outside student learning modes.

### Returning from a Mode

TODO:

- Define whether leaving an active session cancels, pauses, or preserves it.
- Define whether users can start multiple active sessions.
- Define dashboard state after incomplete sessions.

---

## Shared Session Rules

All learning modes that use the session system should follow these rules:

- Sessions belong to authenticated users.
- Selected question order must be reproducible.
- Answers must be stored with correctness.
- Result calculations must use persisted answers.
- Question content must be read from the Question System.
- Question images must be served by the Media System.

Rules for all modes:

- Do not mutate imported question content.
- Do not write import jobs.
- Do not write media files.
- Do not bypass authentication.

---

## Data Ownership

- Question content belongs to the Question System.
- Question images belong to the Media System.
- Import state belongs to the Import System.
- Learning sessions belong to the Study Session Engine.
- Recommendation behavior belongs to the Question Selection or Learning Intelligence layer.
- Future progress and mastery summaries belong to the Progress and Mastery systems.

---

## TODO

- Define exact Practice Mode implementation contract.
- Define exact Exam Mode implementation contract.
- Define whether all modes share the same session tables.
- Define session cancellation and resume behavior.
- Define mode-specific analytics requirements.
