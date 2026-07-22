# User Experience Design - Abqoor

## Purpose

Define the official user experience architecture for Abqoor before full UI implementation begins.

Abqoor is an Arabic-first Qudurat preparation platform. The product experience must help students understand where they are, what to practice next, and how their performance is improving over time.

This document is design-only. It does not define React components, backend endpoints, database schema, or implementation details.

---

## Codex Instructions

- Do not implement frontend code from this document unless explicitly instructed.
- Do not create React components from this document.
- Do not modify backend logic from this document.
- Do not modify database schema from this document.
- Treat this document as the UX architecture source of truth for future UI work.
- Keep all student-facing experience decisions Arabic-first.
- Leave unresolved implementation details as TODOs.

---

## Experience Principles

Abqoor should feel:

- Mobile-first.
- Desktop compatible.
- Immersive.
- Simple.
- Professional.
- Focused on improving student performance.
- Calm and motivating rather than playful or distracting.

The product should avoid:

- Childish gamification.
- Excessive animation.
- Clutter.
- XP systems.
- Coins.
- Leaderboards.

The product may use milestones as proof of improvement, but milestones should support learning progress rather than compete for attention.

---

## Core Product Structure

Abqoor has four main user-facing areas:

1. Career Dashboard
2. Practice Mode
3. Study Plan
4. Exam Mode

Abqoor also has one internal intelligence layer:

5. Mastery Engine

The Mastery Engine powers:

- Pillar percentages.
- Study recommendations.
- Review system.
- Progress tracking.
- Analytics.

The Mastery Engine should be visible to students only through clear progress indicators and recommendations. It should not appear as a technical system in the student interface.

---

## Arabic-First UX

The default student experience should be Arabic-first.

Rules:

- Arabic labels should be the primary interface language.
- RTL layout should be the default for student-facing screens.
- Question images must remain large, readable, and central to the learning flow.
- English may appear only where unavoidable in technical or admin-only contexts.

TODO:

- Define final Arabic tone of voice.
- Define whether English is ever shown to students in the MVP.
- Define final microcopy for empty states, warnings, and completion screens.

---

## Guest Experience

The guest experience is for users who are not signed in.

Primary goals:

- Immediately communicate Abqoor's identity.
- Encourage account creation.
- Visually represent both Qudurat divisions.
- Explain why mastery tracking improves preparation.

The landing page should not show real student data. Any progress, pillars, scores, or examples shown to guests are demonstrations only.

### Landing Hero

The hero section should use a diagonal split background with an approximately 60-degree slope.

One side represents mathematics.

Math visual direction:

- Mathematical concepts.
- Formulas.
- Numbers.
- Geometric elements.
- A feeling of problem solving and sharp thinking.

The other side represents Arabic.

Arabic visual direction:

- Qudurat verbal relationships.
- Word-pair examples.
- Vocabulary connections.
- Language patterns.

Example verbal relationship pairs:

- حشد : جماعة
- إثبات : سند
- يلبي : يجيب
- قديم : عتيق

The hero should include:

- Abqoor identity.
- A clear student-centered value statement.
- Primary account creation action.
- Secondary login action.

TODO:

- Approve final landing hero Arabic headline.
- Approve whether the diagonal split uses illustration, generated imagery, or abstract educational visuals.
- Define whether the hero includes sample question imagery.

### Landing Page Scroll

After the hero, the page should continue into concise sections:

- What Abqoor is.
- How mastery works.
- Example progress pillars.
- Practice experience.
- AI-guided study plan.
- Exam simulation.

Guest progress pillars are examples only. They should be visually clear but should not imply that a guest already has progress.

---

## New User First Experience

After registration, the user enters the Career Dashboard.

All mastery starts at:

```text
0%
```

Rules:

- No fake progress.
- No pre-filled mastery.
- No artificial streaks.
- No misleading achievements.

The new user sees:

- Math division.
- Arabic division.

Both divisions begin empty. The intended message is:

```text
This is your journey.
```

TODO:

- Approve final Arabic copy for the first-time dashboard state.
- Define whether onboarding appears before or inside the dashboard.
- Define whether the user chooses a target exam date during onboarding.

---

## Career Dashboard

The Career Dashboard is the primary home for signed-in users.

The dashboard contains two learning worlds:

1. Mathematics
2. Arabic

Users should be able to swipe horizontally between the two worlds on mobile. Desktop should support a compatible interaction pattern such as tabs, segmented controls, or side-by-side navigation.

The last selected division should be remembered.

Example:

If the user leaves the dashboard on Arabic, the next visit opens Arabic.

Dashboard goals:

- Show learning progress clearly.
- Provide direct entry into practice.
- Provide entry into AI-guided study.
- Provide entry into Exam Mode.
- Keep the student oriented without overwhelming them.

TODO:

- Define whether last selected division is stored locally or in the user profile.
- Define desktop navigation behavior.
- Define dashboard header information.

---

## Mathematics Career View

Mathematics uses vertical topic pillars.

Each pillar:

- Starts at 0%.
- Fills toward 100%.
- Represents mastery.
- Is clickable.

Mathematics topics:

- الحساب
- الجبر
- الهندسة
- الإحصاء والاحتمالات
- الأنماط الشكلية
- المقارنة الكمية
- المسائل اللفظية

Clicking a math pillar does not show a preview screen. The user intentionally selected this area, so Abqoor should enter that topic world directly.

### Math Topic World

Inside a math topic world, Abqoor shows horizontal smaller subtopic pillars.

Subtopic pillars:

- Are visually smaller than main topic pillars.
- Still use percentage-based mastery.
- Clearly appear as children of the selected main topic.
- Open Practice Mode when selected.

Example topic:

```text
الجبر
```

Example algebra subtopics:

- المعادلات والمتباينات
- الحدود الجبرية
- التحليل
- الأسس والجذور
- المتتابعات والأنماط العددية

TODO:

- Approve final math topic list.
- Approve full subtopic list for every math topic.
- Define pillar animation behavior.
- Define empty-state visuals for 0% pillars.

---

## Arabic Career View

Arabic does not have subtopics in the current UX architecture.

Arabic topics:

- التناظر اللفظي
- إكمال الجمل
- الخطأ السياقي
- المفردة الشاذة
- استيعاب المقروء

Clicking an Arabic topic opens Practice Mode directly.

TODO:

- Confirm Arabic topics have no subtopics for MVP.
- Approve final Arabic topic names.
- Define whether reading comprehension needs longer-session UI treatment.

---

## Review System

Each division has a Review pillar.

Review contains:

1. Automatically saved wrong answers.
2. User manually saved questions.

The Review pillar percentage represents review capacity, not mastery.

Maximum capacity:

```text
100 stored questions
```

Each stored question represents:

```text
1%
```

Capacity rules:

- Do not lose questions silently.
- At 50% capacity, warn the user.
- Near full capacity, show a stronger warning.
- At full capacity, prevent additional storage until questions are cleared.

TODO:

- Define exact "near full" threshold.
- Define clear action for managing saved review questions.
- Define whether wrong answers and manually saved questions share one capacity pool.
- Define whether capacity differs by division.

---

## Practice Mode

Purpose:

```text
I choose what I want to practice.
```

Practice Mode is user-controlled.

The user controls:

- Topic.
- Subtopic, when available.
- Questions.

The AI does not force selection in Practice Mode.

After answers are submitted, Abqoor collects learning data for mastery updates.

Practice Mode should feel direct, fast, and focused. The student should reach questions with minimal friction after selecting a topic or subtopic.

TODO:

- Define practice session length options.
- Define whether Practice Mode is timed.
- Define whether students see explanations immediately after each answer.
- Define whether students can exit practice mid-session.

---

## Study Plan

Study Plan is the AI-guided learning mode.

Purpose:

```text
I do not know what to study.
```

The AI-guided study experience chooses:

- Topics.
- Difficulty.
- Question count.
- Review timing.

Inputs may include:

- Mastery.
- Confidence.
- Recent performance.
- Difficulty.
- Question history.

Study Plan should feel like a personal tutor. It should guide the student without hiding why a recommendation exists.

TODO:

- Define exact recommendation explanation format.
- Define whether students can override a recommendation.
- Define Study Plan session length options.
- Define how confidence is collected.
- Define whether "AI" is named directly in the student interface.

---

## Exam Mode

Purpose:

```text
Real Qudurat simulation.
```

Exam Mode simulates the structure and pressure of the real exam.

### Exam Structure

Exam Mode uses 5 repeated segments.

Each segment contains:

- 12 math questions.
- 13 Arabic questions.

Total:

- 60 math questions.
- 65 Arabic questions.

### Exam Rules

Rules:

- 30 minute timer per section.
- Questions must be completed before moving forward.
- User can skip questions inside the current section.
- User cannot return after confirming the next section.

### Exam Review Colors

Review colors:

- White: answered.
- Yellow: flagged.
- Red: unanswered.

### Exam Completion

After completion, show:

- Math percentage.
- Arabic percentage.
- Overall average.

Overall average:

```text
(math + arabic) / 2
```

Store:

- Score.
- Date.
- History graph.

TODO:

- Define whether Exam Mode reuses Learning Sessions or uses a dedicated exam model.
- Define whether the 30 minute timer applies per segment or per section grouping.
- Define whether skipped questions must be answered before section confirmation.
- Define exam pause, disconnect, and resume behavior.
- Define exact result screen layout.

---

## Mastery Engine

The Mastery Engine is an internal system that powers visible learning state.

It supports:

- Pillar percentages.
- Recommendations.
- Review system.
- Progress tracking.
- Analytics.

The Mastery Engine should not be presented as a separate destination unless a future product decision approves it. Students should experience it through clear outputs such as progress, suggestions, and review prompts.

TODO:

- Define mastery calculation rules.
- Define how mastery differs from review capacity.
- Define how exam performance affects mastery.
- Define how Practice Mode and Study Plan update mastery differently, if applicable.

---

## Achievement Philosophy

Abqoor is not a game.

Do not use:

- XP.
- Coins.
- Leaderboards.

Use milestones.

Milestone categories:

- Learning milestones.
- Mastery milestones.
- Exam milestones.
- Consistency milestones.

Milestones should be shown as proof of improvement. They should help students feel progress without turning preparation into a game economy.

TODO:

- Define milestone categories in detail.
- Define whether milestones appear in the dashboard, results screens, or profile.
- Define whether milestones trigger notifications.

---

## Visual Design Direction

Use Abqoor colors:

- Navy.
- Cyan.
- Turquoise.
- Orange.
- Golden yellow.
- Grey.
- White.

The visual identity should feel:

- Premium.
- Educational.
- Calm.
- Motivating.
- Serious enough for exam preparation.

Animation should be purposeful and restrained.

Recommended animation uses:

- Pillar fill changes.
- Subtle transitions between Math and Arabic worlds.
- Progress updates after meaningful actions.

Avoid:

- Excessive motion.
- Decorative clutter.
- Confetti-like reward loops.
- Visual noise around question content.

TODO:

- Define exact color tokens.
- Define typography.
- Define iconography.
- Define illustration or imagery style.
- Define motion guidelines.

---

## Mobile-First Behavior

Mobile is the primary design target.

Mobile rules:

- Dashboard worlds should support horizontal swiping.
- Pillars must remain readable and tappable.
- Question images must fit the viewport without clipping.
- Exam navigation must be clear under time pressure.
- Review warnings must be visible without blocking learning unless action is required.

Desktop should remain fully compatible and may use wider layouts where useful.

TODO:

- Define dashboard breakpoints.
- Define minimum tap target sizes.
- Define exam layout for small screens.
- Define whether landscape mode is supported for question solving.

---

## Missing Product Decisions

The following decisions still require approval:

- Final Arabic landing page copy.
- Final onboarding flow.
- Whether last selected division is stored locally or server-side.
- Full math subtopic taxonomy.
- Whether Arabic topics truly have no subtopics in all phases.
- Review capacity thresholds beyond 50%.
- Whether wrong answers and saved questions share one review capacity pool.
- Practice Mode session length and timing rules.
- Study Plan recommendation explanation format.
- Whether the UI says "AI" directly or uses a softer Arabic phrase.
- Exam Mode persistence model.
- Exact exam timer behavior.
- Exam pause, disconnect, and resume behavior.
- Mastery calculation rules.
- Milestone definitions.
- Final design tokens, typography, and motion rules.

