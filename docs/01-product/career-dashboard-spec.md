# Career Dashboard Specification - Abqoor

## Purpose

Define the official product specification for the Abqoor Career Dashboard.

The Career Dashboard is the user's main progression identity screen. It represents:

```text
the student's journey toward mastery
```

It must not feel like a simple list of quizzes or a generic progress dashboard.

This document is product documentation only. It does not define React components, backend endpoints, database schema, or implementation details.

References:

- `docs/01-product/user-experience-design.md`
- `docs/01-product/design-system.md`
- `docs/03-engineering/frontend-architecture.md`

---

## Codex Instructions

- Do not implement frontend code from this document unless explicitly instructed.
- Do not modify backend logic from this document.
- Do not modify database schema from this document.
- Keep Arabic display labels separate from internal route identifiers.
- Treat this document as the product source of truth for Career Dashboard behavior.
- Leave unresolved implementation details as TODOs.

---

## Career Dashboard Structure

### Purpose

The Career Dashboard gives the student a clear, motivating view of their learning journey across the two Qudurat divisions:

- Math
- Arabic

It should communicate that mastery is built over time through focused practice, review, and future guided recommendations.

### User Goal

The student should be able to:

- Understand the main learning areas.
- See that each area starts honestly at `0%`.
- Choose a subject world.
- Enter a topic path without confusion.
- Feel that progress is personal, structured, and achievable.

### Screen Hierarchy

The Career Dashboard should prioritize:

1. Current world selection.
2. Mastery journey message.
3. Topic mastery pillars.
4. Review pillar concept.
5. Navigation into the next learning action.

The screen should not prioritize:

- Quiz lists.
- Question counts as the main identity.
- Exam analytics.
- Achievements.
- AI recommendations.

### Navigation Behavior

The Career Dashboard is the main signed-in destination after registration or login.

Navigation from the dashboard should be intentional:

- Math topic pillars lead toward a Math topic world.
- Arabic topic pillars lead directly toward Practice Mode.
- Review pillars lead toward a future review experience.

No Practice Mode behavior is defined in this document.

---

## World System

The Career Dashboard contains two worlds:

1. Math World
2. Arabic World

### Math World

The Math World contains the following main topic pillars:

| Display Name | Internal Slug |
| --- | --- |
| الحساب | `math/arithmetic` |
| الجبر | `math/algebra` |
| الهندسة | `math/geometry` |
| الإحصاء والاحتمالات | `math/statistics` |
| الأنماط الشكلية | `math/visual-patterns` |
| المقارنة الكمية | `math/quantitative-comparison` |
| المسائل اللفظية | `math/word-problems` |

Math topics may contain subtopics in the future topic-world screen.

### Arabic World

The Arabic World contains the following topic pillars:

| Display Name | Internal Slug |
| --- | --- |
| التناظر اللفظي | `arabic/verbal-analogy` |
| إكمال الجمل | `arabic/sentence-completion` |
| الخطأ السياقي | `arabic/contextual-error` |
| المفردة الشاذة | `arabic/odd-word` |
| استيعاب المقروء | `arabic/reading-comprehension` |

Arabic topics do not have subtopics in the current MVP concept.

### Swipe Behavior

Mobile users should be able to swipe horizontally between Math and Arabic.

Rules:

- Swiping left or right changes the active world.
- Vertical page scrolling must remain comfortable.
- Swipe behavior must not interfere with tapping pillars.
- The active world must be visually clear.

### Saved World Preference

The last selected world should be remembered.

Example:

If the student leaves the Career Dashboard on Arabic, the next visit should open Arabic.

TODO:

- Decide whether this preference remains local-only or later syncs to the user profile.

### Transition Behavior

Transitions between worlds should be:

- Smooth.
- Fast.
- Subtle.
- Non-game-like.

The transition should support orientation, not decoration.

---

## Pillar System

Each pillar represents mastery.

Pillars are used because they visually communicate growth upward over time. A pillar feels like a learning structure being built, while a normal progress bar can feel like a task checklist or download meter.

### Mastery States

Pillars support the following conceptual states:

| State | Meaning |
| --- | --- |
| `0%` | No recorded mastery yet. |
| Beginner | Early progress has started. |
| Developing | The student is building consistency. |
| Advanced | The student shows strong performance. |
| Mastered | The student has reached the approved mastery threshold. |

TODO:

- Define exact percentage thresholds for Beginner, Developing, Advanced, and Mastered.
- Define whether thresholds differ by topic, subject, or exam section.

### Pillar Requirements

Each mastery pillar must:

- Use a vertical design.
- Be mobile-first.
- Remain desktop compatible.
- Be reusable across Math and Arabic topics.
- Display a percentage.
- Support future mastery data.
- Support different approved Abqoor colors.
- Use Arabic display labels.
- Keep internal IDs separate from display labels.

### Empty State

At `0%`, a pillar should feel like a beginning, not a failure.

Rules:

- Do not show fake progress.
- Do not imply poor performance before the student has practiced.
- Keep the visual calm, premium, and motivating.

---

## Review Pillar

Each subject has a review pillar:

- Math review pillar
- Arabic review pillar

### Purpose

The Review Pillar represents stored review work, not topic mastery.

It stores:

- User-saved questions.
- Automatically collected wrong questions.

### Capacity Concept

The Review Pillar has a future capacity concept.

It may represent how full the student's review queue is, rather than how mastered the student is.

Rules:

- Review capacity must not be confused with mastery.
- Review status should help the student know when to revisit saved or missed questions.
- Review should connect to Practice Mode in the future.

TODO:

- Define final review capacity.
- Define how wrong questions are collected.
- Define how manually saved questions are stored.
- Define whether Math and Arabic review queues are separate or share a global review limit.
- Define how Review Pillar percentages are calculated.

---

## Topic Navigation

### Math Navigation

Math navigation follows this structure:

```text
Topic pillar
  ↓
Topic World
  ↓
Subtopic pillars
  ↓
Practice
```

Rules:

- Clicking a Math topic pillar enters that topic world.
- The topic world shows subtopic pillars in a future phase.
- Subtopic pillars open Practice Mode in a future phase.
- This document does not define Practice Mode implementation.

### Arabic Navigation

Arabic navigation follows this structure:

```text
Topic pillar
  ↓
Practice
```

Rules:

- Clicking an Arabic topic pillar leads directly toward Practice Mode.
- Arabic does not use subtopic pillars in the current MVP concept.
- This document does not define Practice Mode implementation.

---

## Routing Rules

URLs must use stable internal slugs.

Arabic text must never be used as a route identifier.

### Core Rule

Display labels and route IDs are separate:

| Display | Internal Identifier |
| --- | --- |
| الجبر | `math/algebra` |
| التناظر اللفظي | `arabic/verbal-analogy` |

### Practice Route Pattern

Practice route placeholders should use:

```text
/practice/{subjectSlug}/{topicSlug}
```

Examples:

```text
/practice/math/arithmetic
/practice/math/algebra
/practice/math/geometry
/practice/math/statistics
/practice/arabic/verbal-analogy
/practice/arabic/sentence-completion
```

### Slug Rules

Slugs must be:

- Stable.
- Lowercase.
- ASCII.
- Hyphen-separated when needed.
- Independent from Arabic display copy.

Rules:

- Changing an Arabic topic label must not break the URL.
- Internal slugs should be treated as product identifiers.
- Route helpers should use internal IDs, not display names.

TODO:

- Confirm final route pattern for Math topic worlds before Phase 3.
- Confirm whether subtopic routes are nested under topic slugs.
- Approve final slugs for all Math subtopics.

---

## Responsive Behavior

### Mobile

Mobile is the primary experience.

Mobile behavior:

- Vertical scrolling.
- Horizontal world swipe.
- Touch-friendly pillars.
- Comfortable spacing between pillars.
- Clear active world state.

### Desktop

Desktop expands the same system.

Desktop behavior:

- Expanded layout.
- Same Math/Arabic world model.
- Same topic navigation model.
- More visible pillars where space allows.
- Hover states may clarify clickability, but must not be required.

Desktop must not introduce a different product structure.

---

## Future Integration

The Career Dashboard must remain compatible with future systems.

### AI Study Plan

Future AI Study Plan recommendations may use Career Dashboard mastery data as input.

Rules:

- The dashboard displays mastery.
- The recommendation system decides what to suggest.
- The dashboard must not implement AI recommendation logic.

### Mastery Engine

The Mastery Engine will provide future pillar percentages and states.

Rules:

- Pillars should be ready to consume mastery percentages.
- Frontend should not invent official mastery calculations.
- Topic and subject identifiers must align with stable slugs.

### Exam Analytics

Exam analytics may influence future mastery or progress summaries.

Rules:

- Exam analytics should not replace topic mastery.
- Career Dashboard should not become an exam history page.

### Achievements

Achievements may appear in future profile or milestone surfaces.

Rules:

- Achievements must not make the Career Dashboard feel game-like.
- No XP, coins, leaderboards, or public ranking should be introduced.

---

## TODO

- Finalize Math topic-world route pattern.
- Finalize full Math subtopic taxonomy.
- Finalize review queue capacity.
- Define mastery state thresholds.
- Define exact pillar dimensions and fill behavior.
- Define whether saved world preference syncs to backend later.
- Define how Career Dashboard consumes future mastery APIs.
