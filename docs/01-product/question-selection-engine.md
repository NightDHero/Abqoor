# Question Selection Engine - Abqoor

## Purpose

Define how Abqoor chooses which questions to show in a study session.

The Question Selection Engine is responsible for selecting the most appropriate questions for each study session based on student mastery and session requirements.

This document does not describe adaptive algorithms in detail.

---

## Codex Instructions

- Do not implement logic from this document.
- Do not define formulas.
- Do not introduce database schema changes.
- Do not invent API endpoints.
- Keep selection behavior conceptual and aligned with MVP simplicity.
- Leave unknown implementation details as TODOs.

---

## Scope

The Question Selection Engine is responsible for:

- Selecting questions for a study session
- Ensuring balanced coverage of topics
- Adjusting difficulty distribution
- Using mastery system data as input

The Question Selection Engine is not responsible for:

- Updating mastery data
- Scoring completed sessions
- Managing question imports
- Managing content review workflows
- Defining student progress dashboards

---

## Inputs

### Mastery System Data

Placeholder for learning progress data used during question selection.

Related document:

- `docs/01-product/mastery-system.md`

TODO:

- Define which mastery fields are available to selection.
- Define whether selection uses overall, subject, topic, or subtopic mastery.
- Define how missing mastery data is handled.

### Question Database

Placeholder for available question content.

Related document:

- `docs/02-content/question-format.md`

TODO:

- Define which question metadata fields are required for selection.
- Define how unavailable or archived questions are excluded.
- Define how question readiness for students is determined.

### Session Configuration

Placeholder for session-level requirements used during selection.

Related document:

- `docs/01-product/study-session-engine.md`

TODO:

- Define supported session types.
- Define session size requirements.
- Define whether session configuration can restrict topic, difficulty, or subject.

### Student Performance History

Placeholder for historical performance data that may influence future question selection.

TODO:

- Define which historical signals are available.
- Define how recently answered questions are represented.
- Define whether cancelled sessions are included.

---

## Selection Principles

The following are high-level selection principles, not algorithms.

### Prioritize Weak Topics

The system should be able to favor topics where the student needs more practice.

TODO:

- Define what qualifies as a weak topic.
- Define how weak topics are surfaced from mastery data.

### Maintain Balanced Topic Coverage

The system should avoid over-focusing on a single topic unless session requirements explicitly call for it.

TODO:

- Define balance requirements.
- Define how balance differs by session type.

### Gradually Adjust Difficulty

The system should be able to adjust question difficulty over time in a controlled way.

TODO:

- Define difficulty distribution rules.
- Define how difficulty changes relate to mastery.

### Avoid Repetitive Question Selection

The system should reduce unnecessary repetition of recently seen questions.

TODO:

- Define what counts as recently seen.
- Define when repetition is allowed.
- Define how repeated questions are tracked.

---

## Question Filtering

### Topic Filtering

Placeholder for selecting or excluding questions by topic.

TODO:

- Define topic filter inputs.
- Define whether multiple topics can be selected.
- Define behavior when too few questions match.

### Difficulty Filtering

Placeholder for selecting or excluding questions by difficulty.

TODO:

- Define difficulty range behavior.
- Define whether difficulty filters are exact or ranged.
- Define fallback behavior when too few questions match.

### Exclusion of Recently Seen Questions

Placeholder for excluding questions the student has recently encountered.

TODO:

- Define recency window.
- Define whether exclusion is strict or preferred.
- Define how exclusions interact with limited question pools.

### Session Size Constraints

Placeholder for ensuring the selected set matches session size requirements.

TODO:

- Define default session size.
- Define minimum and maximum session size.
- Define behavior when the available question pool is smaller than requested size.

---

## Output

The Question Selection Engine outputs:

- A list of selected question IDs
- An ordered sequence for the session

TODO:

- Define whether order is fixed at session creation.
- Define whether order can change during a session.
- Define whether output includes selection metadata.

---

## Future Features

### Personalized Question Weighting

TODO:

- Define weighting inputs.
- Define how weighting differs from filtering.
- Define how weighting remains explainable.

### Spaced Repetition Integration

TODO:

- Define relationship to mastery data.
- Define relationship to study plans.
- Define when spaced repetition becomes part of selection.

### Predictive Difficulty Adjustment

TODO:

- Define prediction inputs.
- Define how prediction output is used.
- Define safeguards for MVP simplicity.

### AI-Based Optimization (Not in MVP)

TODO:

- Define whether AI optimization is appropriate for future versions.
- Define required controls and auditability.
- Define how AI-based optimization differs from rule-based selection.

---

## Related Documents

- `docs/01-product/study-session-engine.md`
- `docs/01-product/mastery-system.md`
- `docs/01-product/adaptive-learning.md`
- `docs/02-content/question-format.md`

---

## TODO

- Define MVP selection principles.
- Define required question metadata.
- Define required mastery inputs.
- Define session configuration inputs.
- Define recently seen question policy.
- Define output contract.
