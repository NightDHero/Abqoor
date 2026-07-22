# Progress System - Abqoor

## Purpose

Define how student learning progress is tracked, stored, and displayed in Abqoor.

The Progress System is responsible for tracking and presenting student learning improvement over time using session results and mastery data.

This document does not include implementation details or algorithms.

---

## Codex Instructions

- Do not implement logic from this document.
- Do not define calculations or formulas.
- Do not define database schema.
- Do not introduce API endpoints.
- Keep the document conceptual and aligned with MVP design.
- Leave unknown implementation details as TODOs.

---

## Scope

The Progress System is responsible for:

- Tracking student performance over time
- Aggregating session results
- Representing learning improvement
- Providing data for dashboards and summaries

The Progress System is not responsible for:

- Selecting questions for study sessions
- Defining mastery update rules
- Defining adaptive learning algorithms
- Managing question content

---

## Progress Data Sources

### Study Session Results

Placeholder for completed study session outcomes used by the Progress System.

Related document:

- `docs/01-product/study-session-engine.md`

TODO:

- Define which session result fields are available.
- Define whether cancelled or expired sessions are included.
- Define how session summaries relate to progress.

### Mastery System Updates

Placeholder for mastery data used to represent learning progress.

Related document:

- `docs/01-product/mastery-system.md`

TODO:

- Define which mastery fields are displayed in progress views.
- Define whether mastery updates are shown immediately.
- Define how mastery and progress differ conceptually.

### Question Response History

Placeholder for historical question response data.

TODO:

- Define what response history is retained.
- Define whether repeated questions are tracked separately.
- Define whether skipped or unanswered questions are included.

---

## Metrics (Conceptual Only)

The Progress System may present high-level metrics to help students and administrators understand learning improvement.

This section does not define formulas.

### Accuracy per Topic

Placeholder for representing accuracy grouped by topic.

TODO:

- Define topic grouping behavior.
- Define whether topic accuracy is shown to students.
- Define how insufficient data is displayed.

### Overall Accuracy

Placeholder for representing broad student accuracy across completed work.

TODO:

- Define what data contributes to overall accuracy.
- Define whether overall accuracy is session-based or lifetime-based.
- Define how overall accuracy appears in dashboards.

### Improvement Over Time

Placeholder for representing progress across historical periods.

TODO:

- Define comparison periods.
- Define how improvement is communicated.
- Define how incomplete data is handled.

### Weak vs Strong Areas

Placeholder for identifying areas where a student may need more practice or shows relative strength.

TODO:

- Define how weak and strong areas are represented.
- Define whether this view depends on mastery data.
- Define whether this view affects future study recommendations.

---

## Progress Views

Progress views describe how progress may be presented conceptually. This document does not define UI implementation.

### Student Dashboard Summary

Placeholder for a high-level student progress summary.

TODO:

- Define summary fields.
- Define whether dashboard data is real-time.
- Define empty-state behavior for new students.

### Topic-Level Progress

Placeholder for showing progress by topic.

TODO:

- Define topic hierarchy.
- Define whether subject-level grouping is included.
- Define how topics with little data are displayed.

### Session History View

Placeholder for showing prior study sessions.

TODO:

- Define visible session history fields.
- Define session history filtering.
- Define whether session details can be opened from this view.

---

## Data Aggregation

Progress is derived from:

- Completed study sessions
- Answer correctness
- Topic classification of questions

This document does not define calculations or formulas.

TODO:

- Define aggregation frequency.
- Define whether aggregation is stored or computed on demand.
- Define how corrected content affects historical progress.
- Define how deleted or archived questions affect historical progress.

---

## Future Features

### Progress Charts

TODO:

- Define chart types.
- Define chart time ranges.
- Define chart empty states.

### Trend Analysis

TODO:

- Define trend inputs.
- Define trend display requirements.
- Define whether trend analysis is student-facing.

### Predictive Improvement Modeling

TODO:

- Define prediction goals.
- Define required data.
- Define whether predictive modeling is in scope after MVP.

### Exportable Reports

TODO:

- Define report formats.
- Define report audience.
- Define privacy and access requirements.

---

## Related Documents

- `docs/01-product/study-session-engine.md`
- `docs/01-product/mastery-system.md`
- `docs/01-product/question-selection-engine.md`
- `docs/02-content/question-format.md`

---

## TODO

- Define MVP progress metrics.
- Define progress view requirements.
- Define progress data retention.
- Define relationship to mastery data.
- Define relationship to session summaries.
