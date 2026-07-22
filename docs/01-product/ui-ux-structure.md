# UI/UX Structure - Abqoor

## Purpose

Define the intended user interface structure for Abqoor across landing, dashboard, practice, exam, review, and admin validation experiences.

This document is design-only. It does not define React components, routes, database schema, or backend endpoints.

---

## Codex Instructions

- Do not implement UI from this document unless explicitly instructed.
- Do not invent business logic beyond the product structure described here.
- Keep the experience Arabic-first.
- Clearly distinguish implemented MVP behavior from future concepts.
- Leave unknown decisions as TODOs.

---

## UI Principles

Abqoor should feel direct, focused, and study-first.

Principles:

- Arabic-first layout and language.
- Fast access to learning actions.
- Clear separation between practice, recommendation, exam, review, and admin tools.
- Minimal distraction during question answering.
- Question images must remain large and readable.

Related documents:

- `docs/04-design/rtl-guidelines.md`
- `docs/04-design/ui-principles.md`
- `docs/04-design/ux-principles.md`

---

## Landing Page

The landing page is for unregistered or signed-out users.

Primary goals:

- Explain what Abqoor is.
- Provide clear registration and login actions.
- Communicate the core learning promise.

Expected sections:

- Abqoor name and short value statement.
- Login action.
- Register action.
- Brief explanation of practice, recommended study, and exam preparation.

Rules:

- Do not expose student dashboard data to signed-out users.
- Do not expose admin tools to signed-out users.

TODO:

- Define final landing page Arabic copy.
- Define whether landing page includes sample question imagery.

---

## Career Dashboard

The Career Dashboard is the main authenticated student dashboard.

The dashboard is organized around learning pillars:

- Math
- Arabic

Purpose:

- Give the student a clear starting point.
- Show the two major Qudurat learning areas.
- Route students into Practice Mode, Recommended Study Mode, Exam Mode, or Review.

Expected dashboard actions:

- Continue recommended study.
- Choose Math practice.
- Choose Arabic practice.
- Start exam mode.
- Review flagged or wrong questions.

Current implementation status:

- A full Career Dashboard is not yet implemented.
- Current frontend includes a minimal home screen and learning session entry point.

TODO:

- Confirm whether the name "Career Dashboard" is final product terminology.
- Define dashboard metrics shown for each pillar.
- Define empty states for new students.

---

## Practice Flow

Practice Mode supports direct student choice.

Flow:

```text
Pillar
  ->
Topic
  ->
Subtopic
  ->
Session
```

### Pillar Selection

The student chooses:

- Math
- Arabic

TODO:

- Define final Arabic labels for the two pillars.
- Define whether each pillar shows progress, weak areas, or question counts.

### Topic Selection

After choosing a pillar, the student chooses a topic.

Examples:

- Math topic placeholder: TODO
- Arabic topic placeholder: TODO

TODO:

- Define official topic taxonomy.
- Define topic ordering.
- Define whether unavailable topics are hidden or disabled.

### Subtopic Selection

After choosing a topic, the student chooses a subtopic.

TODO:

- Define official subtopic taxonomy.
- Define whether subtopic selection is required or optional.
- Define behavior when a topic has no subtopics.

### Practice Session

The session presents questions related to the selected pillar, topic, and subtopic.

Expected elements:

- Question image.
- Answer choices A, B, C, D.
- Current question progress.
- Submit answer action.
- Optional immediate feedback.

Current implementation status:

- The current Learning Session UI can start and complete adaptive sessions.
- Topic/subtopic filtering is not yet implemented in the UI.

TODO:

- Define whether Practice Mode reuses the current session engine.
- Define whether Practice Mode uses fixed or configurable session length.
- Define whether Practice Mode stores answers in the same session tables.

---

## Recommended Study Mode

Recommended Study Mode is the guided learning path.

Current MVP behavior:

- Student starts a session.
- Backend selects 15 adaptive questions.
- Selection prioritizes unanswered and previously incorrect questions.
- Correctly answered questions receive lower priority.
- Selected order is persisted with the session.

Expected UI:

- Start Session button.
- Question image.
- A/B/C/D answer choices.
- Current question count.
- Basic progress indicator.
- Results screen after completion.

TODO:

- Define whether students can choose session size.
- Define how the UI explains why questions were recommended.
- Define whether recommendations are grouped by Math/Arabic pillar.

---

## Exam Mode Structure

Exam Mode is a future or partial system concept.

Purpose:

- Provide structured exam-like evaluation.
- Separate exam experience from practice and recommendation.
- Produce score and review output after completion.

Expected structure:

- Five exam sections.
- Section-by-section progression.
- Timed or controlled environment.
- Final results screen.
- Review after completion.

Conceptual flow:

```text
Start Exam
  ->
Section 1
  ->
Section 2
  ->
Section 3
  ->
Section 4
  ->
Section 5
  ->
Exam Results
  ->
Review
```

Current implementation status:

- Exam Mode is not fully implemented.

TODO:

- Define the five official section names.
- Define timing rules.
- Define whether navigation between sections is locked.
- Define scoring rules.
- Define exam result display.

---

## Review System Concept

The Review System helps students revisit important questions after sessions.

Review sources:

- Flagged questions.
- Wrong questions.

### Flagged Questions

Students may mark questions for later review.

Current implementation status:

- Flagging is not implemented.

TODO:

- Define flagging UI.
- Define whether flags are per student.
- Define whether flagged questions expire or remain until removed.

### Wrong Questions

The system may collect incorrectly answered questions for review.

Current implementation status:

- Session answers store correctness.
- A dedicated wrong-question review UI is not yet implemented.

TODO:

- Define wrong-question review flow.
- Define whether repeated wrong answers increase review priority.
- Define how reviewed questions leave the review queue.

---

## Admin Validation UI

The Validation Dashboard is an admin-only inspection tool.

Purpose:

- Verify import correctness.
- Preview question images.
- Inspect correct answer mapping.
- Confirm missing answer and missing image counts.

This UI is not part of the student learning experience.

Current implementation status:

- Implemented as a minimal read-only admin dashboard.

TODO:

- Define whether validation should support filtering by import job.
- Define whether validation should show import history links.

---

## Navigation Structure

Top-level conceptual navigation:

- Landing page
- Login
- Register
- Career Dashboard
- Practice
- Recommended Study
- Exam Mode
- Review
- Admin Validation
- Admin Import

Rules:

- Signed-out users can access landing, login, and register.
- Signed-in students can access dashboard, practice, recommended study, exam, and review.
- Admin tools are restricted to administrators.
- Learning modes should remain separate from admin content tools.

TODO:

- Define final route names.
- Define mobile navigation behavior.
- Define RTL navigation layout.

---

## TODO

- Confirm final Arabic labels for all modes.
- Define exact dashboard hierarchy.
- Define topic/subtopic taxonomy.
- Define Exam Mode details.
- Define Review System requirements.
