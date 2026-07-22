# Mastery System - Abqoor

## Purpose

Define what learning data is recorded for each student and how long-term learning progress is represented in Abqoor.

The Mastery System describes the conceptual record of student learning over time.

This document does not describe adaptive algorithms.

---

## Codex Instructions

- Do not invent adaptive rules.
- Do not invent mastery formulas.
- Do not invent database schema.
- Do not invent API endpoints.
- Leave unknown implementation details as TODOs.
- Keep this document focused on learning progress representation.

---

## Scope

The Mastery System is responsible for:

- Tracking student performance
- Storing learning progress
- Recording topic mastery
- Supporting future adaptive learning

The Mastery System is not responsible for:

- Selecting questions during a study session
- Defining adaptive learning algorithms
- Defining study session lifecycle behavior
- Defining content management workflows

---

## Mastery Model

The mastery model represents student learning progress at different levels of granularity.

### Overall Mastery

Placeholder for representing a student's broad progress across Abqoor.

TODO:

- Define what overall mastery means.
- Define whether overall mastery is displayed to students.
- Define whether overall mastery is used for future recommendations.

### Subject Mastery

Placeholder for representing mastery by subject area.

TODO:

- Define supported subject categories.
- Define how subject mastery relates to topic mastery.
- Define whether subject mastery is shown in dashboards.

### Topic Mastery

Placeholder for representing mastery by topic.

TODO:

- Define topic source of truth.
- Define how topic mastery is updated.
- Define whether topic mastery affects future study plans.

### Subtopic Mastery (Future)

Placeholder for representing mastery by subtopic or skill-level classification.

TODO:

- Define subtopic taxonomy.
- Define whether subtopic mastery is required for MVP.
- Define how subtopic mastery relates to skill tags.

---

## Performance Tracking

The Mastery System should support recording performance signals over time.

This document does not define calculations.

### Accuracy

Placeholder for tracking student accuracy.

TODO:

- Define accuracy representation.
- Define whether accuracy is stored overall, by subject, by topic, or by session.
- Define how unanswered questions affect accuracy.

### Questions Answered

Placeholder for tracking the number of questions a student has answered.

TODO:

- Define counting rules.
- Define whether repeated questions are counted separately.
- Define whether cancelled sessions count.

### Correct Answers

Placeholder for tracking correct responses.

TODO:

- Define when an answer is considered correct.
- Define whether corrected/revised answers are counted.
- Define whether correctness is tracked by topic.

### Incorrect Answers

Placeholder for tracking incorrect responses.

TODO:

- Define when an answer is considered incorrect.
- Define whether skipped questions are considered incorrect.
- Define whether incorrect answers are categorized by topic or subtopic.

### Historical Improvement

Placeholder for representing learning progress over time.

TODO:

- Define historical comparison periods.
- Define whether historical improvement is shown to students.
- Define whether historical records are aggregated or stored individually.

---

## Session Updates

Study sessions may update mastery information after completion.

Related document:

- `docs/01-product/study-session-engine.md`

This document does not define update logic.

### After Session Completion

Placeholder for updating mastery after a session is completed.

TODO:

- Define which completed session data is used.
- Define whether cancelled sessions affect mastery.
- Define whether updates happen immediately or asynchronously.

### Session Summary Relationship

Placeholder for connecting mastery updates to session summaries.

TODO:

- Define whether summaries show mastery changes.
- Define whether mastery changes are visible immediately.
- Define whether summary generation depends on mastery updates.

### Future Adaptive Learning Support

Placeholder for future use by the adaptive learning system.

Related document:

- `docs/01-product/adaptive-learning.md`

TODO:

- Define which mastery fields are available to adaptive learning.
- Define whether adaptive learning reads raw performance or aggregated mastery.

---

## Data Retention

The Mastery System should support long-term visibility into student learning progress.

### Long-Term Progress

Placeholder for storing long-term progress signals.

TODO:

- Define retention duration.
- Define whether long-term progress is aggregated.
- Define whether students can view all historical progress.

### Historical Records

Placeholder for storing historical learning records.

TODO:

- Define historical record types.
- Define whether records are immutable.
- Define whether historical records can be corrected.

### Future Analytics

Placeholder for supporting future analytics needs.

TODO:

- Define analytics consumers.
- Define anonymization requirements.
- Define reporting requirements.

---

## Future Features

### Confidence Tracking

TODO:

- Define confidence data.
- Define whether confidence is student-reported or inferred.
- Define how confidence appears in student experience.

### Learning Streaks

TODO:

- Define streak rules.
- Define whether streaks affect mastery.
- Define how streaks are displayed.

### Knowledge Decay

TODO:

- Define whether knowledge decay is part of Abqoor.
- Define decay inputs.
- Define how decay is represented.

### Spaced Repetition Support

TODO:

- Define spaced repetition requirements.
- Define relationship to topic mastery.
- Define relationship to future study plans.

### Predictive Performance

TODO:

- Define prediction goals.
- Define required data.
- Define how predictions are communicated.

---

## Related Documents

- `docs/01-product/study-session-engine.md`
- `docs/01-product/adaptive-learning.md`
- `docs/01-product/study-plans.md`
- `docs/02-content/question-format.md`

---

## TODO

- Define mastery levels.
- Define mastery display requirements.
- Define performance tracking rules.
- Define retention policy.
- Define relationship to progress tracking.
- Define relationship to adaptive learning.
