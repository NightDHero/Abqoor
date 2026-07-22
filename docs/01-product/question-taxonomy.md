# Question Taxonomy - Abqoor

## Purpose

Define the official learning classification model for Abqoor questions.

This document describes how questions are organized so Practice Mode, Topic Worlds, future mastery, and future recommendations can operate on a shared learning-aware dataset.

This document does not implement database schema, API endpoints, adaptive algorithms, or frontend behavior.

---

## Codex Instructions

- Do not implement Practice Mode from this document.
- Do not implement mastery calculations from this document.
- Do not implement AI difficulty logic from this document.
- Keep taxonomy identifiers stable and separate from Arabic display labels.
- Use this document as the product source of truth for question classification.

---

## Core Model

Every question should support:

- Subject.
- Topic.
- Subtopic, when applicable.
- Difficulty score.

Conceptual structure:

```text
Subject
  ↓
Topic
  ↓
Subtopic
  ↓
Question
```

Arabic display names are for UI. Internal slugs are for storage, routing, filtering, imports, and future analytics.

---

## Subject Hierarchy

Abqoor supports two learning subjects:

| Subject | Internal Slug | Legacy System Mapping |
| --- | --- | --- |
| Math | `math` | `quantitative` |
| Arabic | `arabic` | `verbal` |

Rules:

- Student-facing UI should display Arabic labels.
- Backend and route identifiers should use stable internal slugs.
- Legacy fields may remain available for compatibility during MVP.

---

## Math Topics

Math topics:

| Display Name | Internal Slug |
| --- | --- |
| الحساب | `arithmetic` |
| الجبر | `algebra` |
| الهندسة | `geometry` |
| الإحصاء والاحتمالات | `statistics` |
| الأنماط الشكلية | `visual-patterns` |
| المقارنة الكمية | `quantitative-comparison` |
| المسائل اللفظية | `word-problems` |

### Arithmetic Subtopics

| Display Name | Internal Slug |
| --- | --- |
| العمليات الأساسية | `basic-operations` |
| الكسور والأعداد العشرية | `fractions-decimals` |
| النسب والتناسب | `ratios-proportions` |
| النسبة المئوية | `percentages` |
| القواسم والمضاعفات | `factors-multiples` |
| قابلية القسمة | `divisibility` |
| المتوسطات | `averages` |

### Algebra Subtopics

| Display Name | Internal Slug |
| --- | --- |
| المعادلات والمتباينات | `equations-inequalities` |
| الحدود الجبرية | `algebraic-terms` |
| التحليل | `factoring` |
| الأسس والجذور | `exponents-roots` |
| المتتابعات والأنماط العددية | `sequences-number-patterns` |

### Geometry Subtopics

| Display Name | Internal Slug |
| --- | --- |
| الزوايا | `angles` |
| المثلثات | `triangles` |
| المضلعات | `polygons` |
| المساحة والمحيط | `area-perimeter` |

### Statistics Subtopics

| Display Name | Internal Slug |
| --- | --- |
| المتوسط | `mean` |
| الوسيط والمنوال | `median-mode` |
| الاحتمالات | `probability` |
| قراءة البيانات | `data-interpretation` |

### Visual Patterns Subtopics

| Display Name | Internal Slug |
| --- | --- |
| الدوران | `rotation` |
| التتابع الشكلي | `visual-sequences` |
| العلاقات البصرية | `visual-relations` |

### Quantitative Comparison Subtopics

| Display Name | Internal Slug |
| --- | --- |
| مقارنة القيم | `value-comparison` |
| الاستنتاج العددي | `numerical-reasoning` |
| المقارنة المركبة | `compound-comparison` |

### Word Problems Subtopics

| Display Name | Internal Slug |
| --- | --- |
| السرعة والزمن | `speed-time` |
| العمل المشترك | `work-rate` |
| العمر | `age-problems` |
| التناسب | `proportional-reasoning` |

---

## Arabic Topics

Arabic topics:

| Display Name | Internal Slug |
| --- | --- |
| التناظر اللفظي | `verbal-analogy` |
| إكمال الجمل | `sentence-completion` |
| الخطأ السياقي | `contextual-error` |
| المفردة الشاذة | `odd-word` |
| استيعاب المقروء | `reading-comprehension` |

Arabic does not use subtopics in the current MVP concept.

TODO:

- Confirm whether Arabic remains topic-only in all phases.
- Define whether reading comprehension needs lower-level passage or skill tags later.

---

## Subtopic Rules

Subtopics are optional.

Rules:

- Math questions may have a subtopic.
- Arabic questions may leave subtopic empty for MVP.
- Subtopics must belong to a parent topic.
- Subtopic slugs must be stable, lowercase, ASCII, and hyphen-separated.
- Arabic display names must not be used as route or database identifiers.

Examples:

```text
math/algebra/equations-inequalities
math/arithmetic/basic-operations
arabic/verbal-analogy
```

---

## Difficulty Rules

Each question should have a difficulty score from `1` to `10`.

Difficulty scale:

| Score | Meaning |
| --- | --- |
| 1-2 | Easy |
| 3-4 | Basic |
| 5-6 | Medium |
| 7-8 | Hard |
| 9-10 | Very Hard |

Rules:

- Difficulty score is a classification field.
- Difficulty score is not an AI algorithm.
- Difficulty score does not automatically imply mastery.
- Future systems may use difficulty score for filtering and selection.

TODO:

- Define who assigns difficulty during content creation.
- Define whether importer metadata includes difficulty per row.
- Define whether difficulty can be revised after review.

---

## Import Compatibility

Future imports should be able to assign:

- `subject`
- `topic`
- `subtopic`
- `difficulty`

Rules:

- PDF remains the question image source.
- Excel remains the MVP metadata source.
- Existing imported questions must remain valid.
- Missing taxonomy fields should be visible through validation readiness checks.

---

## Session Compatibility

The session system should be able to later request filtered pools, such as:

```text
10 algebra questions
10 verbal analogy questions
10 equations and inequalities questions
```

This document does not define selection algorithms.

Rules:

- Adaptive selection behavior is not changed by this document.
- Topic and subtopic fields prepare the data model for future filtering.
- Mastery calculations are not defined here.

---

## Validation Readiness

The validation dashboard and backend validation data should be able to identify imported questions with missing learning classification fields.

Validation readiness checks should include:

- Missing subject.
- Missing topic.
- Missing subtopic, where a subtopic is expected.
- Missing or invalid difficulty score.

Rules:

- Arabic questions may have no subtopic in the MVP because Arabic is currently topic-level only.
- Math questions should be prepared for subtopic classification.
- Validation checks are diagnostic only and must not calculate mastery.
- Validation checks must not implement recommendation or AI logic.
- Existing imported questions remain valid while taxonomy enrichment is completed.

---

## Remaining Decisions

- Final Math subtopic taxonomy approval.
- Whether Arabic topics remain without subtopics permanently.
- Whether imports include difficulty per question or per batch.
- Whether topic metadata lives only in code or later receives admin management.
- How topic taxonomy changes are versioned over time.
