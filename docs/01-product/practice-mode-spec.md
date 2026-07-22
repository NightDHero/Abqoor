# Practice Mode Specification - Abqoor

## Purpose

Define the official Abqoor Practice Mode experience.

Practice Mode is the learning environment where users deliberately choose a topic or subtopic and improve their skills through focused question solving.

Practice Mode is different from:

- AI Study Plan.
- Exam Mode.

This document is product documentation only. It does not define React components, backend endpoints, database schema, or implementation details.

References:

- `docs/01-product/user-experience-design.md`
- `docs/01-product/design-system.md`
- `docs/03-engineering/frontend-architecture.md`
- `docs/01-product/frontend-implementation-plan.md`
- `docs/01-product/career-dashboard-spec.md`

---

## Codex Instructions

- Do not implement frontend code from this document unless explicitly instructed.
- Do not modify backend logic from this document.
- Do not modify database schema from this document.
- Do not define adaptive algorithms in this document.
- Keep Practice Mode separate from AI Study Plan and Exam Mode.
- Leave unresolved product details as TODOs.

---

## Practice Mode Philosophy

Practice is for learning.

The user intentionally chooses:

- Subject.
- Topic.
- Subtopic, when available.

Practice Mode should feel:

- Focused.
- Educational.
- Direct.
- Calm.
- Skill-building.

It should not feel like:

- A random quiz generator.
- An exam simulation.
- A generic question list.
- A hidden AI recommendation flow.

The student should understand:

```text
I chose this skill because I want to improve it.
```

---

## Entry Flow

Practice Mode begins from the Career Dashboard and Topic Worlds.

### Math Entry Flow

Math uses topic worlds and subtopics.

```text
Career
  ↓
Subject world
  ↓
Topic world
  ↓
Subtopic
  ↓
Practice
```

Example:

```text
الجبر
  ↓
المعادلات والمتباينات
  ↓
Practice
```

### Arabic Entry Flow

Arabic does not have a subtopic layer in the current MVP concept.

```text
Career
  ↓
Subject world
  ↓
Topic
  ↓
Practice
```

Example:

```text
التناظر اللفظي
  ↓
Practice
```

### Route Principle

Practice routes must use stable internal slugs, not Arabic display text.

Examples:

```text
/practice/math/algebra/equations-inequalities
/practice/arabic/verbal-analogy
```

---

## Practice Types

Abqoor has three learning contexts that must remain conceptually separate.

### Topic Practice

Topic Practice is user-selected.

Characteristics:

- The user chooses what to practice.
- The experience is focused on a topic or subtopic.
- Feedback may be shown during learning.
- The session is learning-oriented.
- The goal is skill improvement, not exam simulation.

### AI Study Session

AI Study Session is system-selected.

Characteristics:

- The system chooses questions.
- Selection may target weak areas.
- The experience is guided.
- The goal is adaptive learning support.

Rules:

- AI Study Session must not replace user-selected Practice Mode.
- Practice Mode must not implement AI recommendation logic.

### Exam Mode

Exam Mode is a separate evaluation system.

Characteristics:

- No feedback during solving.
- Realistic exam simulation.
- Structured sections.
- Timer and review behavior may exist.

Rules:

- Practice Mode must not use Exam Mode feedback rules.
- Exam Mode must not be treated as Practice Mode with a timer.

---

## Question Experience

The Practice question screen must include:

- Progress indicator.
- Question number.
- Question text, if available.
- Question image, if available.
- Answer choices.
- Submit or select behavior.

Question content remains image-first for the current Abqoor content pipeline.

Rules:

- The question area should be quiet and focused.
- Question images must be large enough to read.
- Answer choices must be easy to tap on mobile.
- The UI should make it clear whether an answer has been selected.
- Loading, empty, and error states must be explicit.

TODO:

- Define whether text-based question content appears alongside images in future content versions.
- Define final layout for mixed Arabic and mathematical notation.

---

## Answer Flow

The basic answer flow is:

```text
User selects answer
  ↓
User submits or confirms
  ↓
System evaluates answer
  ↓
Feedback appears
  ↓
User continues
```

After answer selection, Practice Mode should show:

- Correct or wrong state.
- Explanation area, when supported.
- Continue button.

Do not define the final explanation algorithm yet.

TODO:

- Decide whether answer feedback appears immediately on selection or after a submit button.
- Decide whether users can change an answer before submitting.
- Define explanation source and availability.

---

## Answer Feedback

Practice feedback is part of learning.

It must not be identical to Exam Mode.

### Correct Answer Feedback

Correct feedback should:

- Reinforce learning.
- Confirm the selected answer.
- Keep the student moving.
- Avoid excessive celebration.

### Incorrect Answer Feedback

Incorrect feedback should:

- Show that the answer was wrong.
- Show the correct answer.
- Allow the question to be reviewed later.
- Record the mistake for future systems where supported.

Rules:

- Feedback should be clear but not discouraging.
- Feedback should help the student understand the next step.
- Incorrect answers should not be hidden until the end, unless a future Practice variant explicitly requires it.

TODO:

- Define exact correct and incorrect visual states.
- Define whether explanation appears automatically or expands on demand.

---

## Question Saving System

Users can manually save questions.

Saved questions enter the Review system.

Manual saving is separate from automatically collected wrong questions.

Rules:

- Save behavior must be clear.
- Saving should not interrupt solving.
- If backend support is unavailable, the UI must show an honest unavailable state rather than pretending to save.

TODO:

- Define saved-question backend contract.
- Define saved-question UI state.
- Define whether users can unsave a question from Practice Mode.

---

## Review System Relationship

Review contains:

1. User saved questions.
2. System collected mistakes.

Practice Mode contributes to Review by:

- Allowing manual question saving.
- Sending incorrect answers to future mistake tracking where supported.

Rules:

- Review is related to Practice Mode but is not implemented inside Practice Mode.
- Review capacity rules are not finalized in this document.
- Review must remain separate from official mastery calculations until defined.

TODO:

- Define review capacity rules.
- Define how saved and wrong questions are deduplicated.
- Define whether review items expire or remain until cleared.

---

## Progress

Practice Mode should show progress during and after the session.

### During Practice

Show:

- Current question.
- Completed questions.
- Session progress.

The progress indicator should help orientation, not create exam pressure.

### After Practice

Show:

- Accuracy.
- Questions solved.
- Topic progress update, when future mastery support exists.

Rules:

- Do not show fake mastery progress.
- Do not calculate official mastery in the frontend.
- If mastery updates are unavailable, show an honest session summary only.

TODO:

- Define practice session length options.
- Define whether Practice Mode can be exited and resumed.
- Define final post-practice summary layout.

---

## Mobile Design

Mobile is the primary Practice Mode experience.

Requirements:

- One question per screen.
- Large answer buttons.
- Thumb-friendly actions.
- No unnecessary scrolling.
- Clear question image area.
- Clear feedback and continue action.

Rules:

- The bottom navigation may need to be hidden or minimized during focused solving.
- Answer choices should remain easy to reach.
- Feedback should not push the student into confusing scroll positions.

TODO:

- Decide whether global navigation is hidden during active Practice.
- Define mobile image sizing behavior.

---

## Desktop Design

Desktop expands the same flow.

Possible desktop layout:

- Centered question card.
- Additional information space.
- Wider image area.
- Feedback panel beside or below the question.

Rules:

- Desktop must not become a different product.
- The solving flow should remain the same as mobile.
- Hover states may clarify interaction but must not be required.

TODO:

- Define final desktop question layout.
- Define maximum content width for question solving.

---

## Components Required

Future Practice Mode implementation should define reusable components:

- `QuestionCard`
- `AnswerOption`
- `QuestionProgress`
- `FeedbackPanel`
- `SaveQuestionButton`
- `ContinueButton`

Rules:

- Components must follow the frontend architecture direction:

```text
Component
  ↓
Hook
  ↓
Service
  ↓
API
```

- Components must not directly call backend APIs.
- Components must remain image-question compatible.

---

## Backend Integration

Practice Mode should integrate with existing and future backend APIs.

Current available session APIs:

- `POST /sessions/start`
- `POST /sessions/submit`
- `GET /sessions/:id/result`

Current available content support:

- Question image serving.
- Question retrieval.

Future requirements:

- Topic filtering.
- Subtopic filtering.
- Saved questions.
- Explanations.
- Mastery updates.
- Review item tracking.

Rules:

- If topic filtering is unavailable, implementation must stop or show an approved unavailable state.
- Frontend must not fake topic-filtered question selection.
- Frontend must not calculate official mastery updates.

---

## Data Flow

Practice Mode data flow:

```text
Topic selection
  ↓
Start practice session
  ↓
Fetch questions
  ↓
Answer
  ↓
Submit
  ↓
Feedback
  ↓
Results
```

Rules:

- Topic selection comes from stable route slugs.
- The backend owns answer evaluation.
- The frontend presents feedback returned or derived from supported backend data.
- Results must reflect submitted answers.

---

## Rules

Practice Mode must not:

- Use an exam timer.
- Hide feedback like Exam Mode.
- Simulate exam sections.
- Replace AI Study Plan.
- Implement AI recommendations.
- Calculate official mastery in the frontend.
- Pretend to save questions without backend support.

Practice Mode must:

- Keep the student oriented.
- Use Arabic-first UI.
- Preserve image-question readability.
- Support stable internal slugs.
- Keep learning feedback distinct from exam scoring.

---

## TODO

- Define practice session length options.
- Define whether Practice Mode is timed or untimed for MVP.
- Decide immediate feedback vs submit-confirm feedback.
- Define explanation source and UI behavior.
- Define save-question backend contract.
- Define topic and subtopic filtering backend contract.
- Define Practice completion summary.
- Define whether active Practice hides global navigation.
- Define exact mobile and desktop question layouts.
