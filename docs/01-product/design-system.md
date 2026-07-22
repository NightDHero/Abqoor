# Design System - Abqoor

## Purpose

Define the official visual foundation for future Abqoor frontend implementation.

This document defines visual and interaction standards only. Product behavior is defined in `docs/01-product/user-experience-design.md` and related product specifications.

This is a documentation-only file. It does not define React components, backend endpoints, database schema, or implementation details.

---

## Codex Instructions

- Do not implement frontend code from this document unless explicitly instructed.
- Do not create React components from this document.
- Do not modify backend logic from this document.
- Do not modify database schema from this document.
- Do not redefine product behavior already defined in `docs/01-product/user-experience-design.md`.
- Use this document as the visual design source of truth for future UI implementation.
- Leave unresolved visual details as TODOs.

---

## Brand Identity

Abqoor should feel:

- Premium.
- Intelligent.
- Trustworthy.
- Modern.
- Calm.
- Motivating.

The design should communicate:

```text
The student is building mastery.
```

The visual system should support serious exam preparation without becoming cold or intimidating.

Avoid:

- Childish game design.
- Excessive gamification.
- Noisy interfaces.
- Unnecessary animations.
- Decorative clutter around question content.

The product may celebrate progress, but celebration should feel like personal academic achievement, not a game reward loop.

---

## Official Brand Colors

The official Abqoor color family is:

- Navy.
- Cyan.
- Turquoise.
- Orange.
- Golden yellow.
- Grey.
- White.

Do not introduce additional brand colors unless a future design decision approves them.

### Navy

Primary usage:

- Main brand background.
- Career Dashboard foundation.
- Exam Mode focus surfaces.
- Premium dark sections.
- Navigation backgrounds where strong contrast is needed.

Navy communicates trust, seriousness, and focus.

### Cyan

Primary usage:

- Secondary accents.
- Light information highlights.
- Supporting chart or progress detail.
- Subtle UI emphasis.

Cyan should support clarity without competing with Turquoise as the primary performance color.

### Turquoise

Primary usage:

- Performance lines.
- Active progress indicators.
- Primary mastery fill.
- Positive learning momentum.
- Selected navigation or active state accents.

Turquoise is the main "growth and mastery" color.

### Orange

Primary usage:

- Important calls to action where energy is needed.
- Practice entry points.
- Gentle emphasis.
- Human warmth within the system.

Orange should be used sparingly. It should not overpower learning content.

### Golden Yellow

Primary usage:

- Achievement states.
- Milestone highlights.
- Flagged exam questions.
- Review warnings before critical capacity.

Golden yellow represents importance and achievement, not coins or game currency.

### Grey

Primary usage:

- Secondary text.
- Dividers.
- Disabled states.
- Empty states.
- Background structure.

Grey should keep interfaces calm and scannable.

### White

Primary usage:

- Question surfaces.
- Reading areas.
- Cards on dark backgrounds.
- Form inputs.
- High-contrast content panels.

White should support readability and focus, especially for question images and answer choices.

### Color Usage Rules

Backgrounds:

- Use Navy for immersive dashboard and exam surfaces.
- Use White or very light Grey for reading-heavy and admin surfaces.
- Use Grey to separate structure without adding visual noise.

Actions:

- Use Turquoise or Orange for primary actions depending on context.
- Use Grey or outlined treatments for secondary actions.
- Avoid using Golden Yellow for primary actions unless the action is achievement-related.

Warnings:

- Use Golden Yellow for medium warnings.
- Use Orange for stronger warnings or action-required states.

Success states:

- Use Turquoise for learning progress and successful completion.
- Use restrained success feedback rather than large celebratory effects.

Achievement states:

- Use Golden Yellow as the achievement accent.
- Do not make achievements look like coins, badges in a game economy, or leaderboard rewards.

TODO:

- Define exact color tokens and hex values.
- Define dark-mode and light-mode token mappings.
- Define contrast-approved foreground/background pairs.

---

## Arabic-First Typography

Typography must prioritize Arabic readability.

### Arabic Headings

Rules:

- Use clear, confident Arabic headings.
- Keep heading hierarchy obvious.
- Avoid overly decorative Arabic typefaces.
- Use comfortable line height for multi-line headings.

Heading style should feel premium and educational, not playful.

### Arabic Body Text

Rules:

- Use highly readable Arabic body text.
- Maintain comfortable spacing between lines.
- Avoid dense paragraphs in student-facing screens.
- Prefer short instructional copy.

Body text should support fast comprehension on mobile.

### Numbers

Numbers appear frequently in:

- Percentages.
- Scores.
- Timers.
- Question counts.
- Exam sections.

Rules:

- Numbers must be large enough to scan quickly.
- Percentages should align cleanly within pillars and progress components.
- Timer numbers must be highly legible under pressure.
- Number styling should be consistent across Math, Arabic, Study Plan, and Exam Mode.

TODO:

- Decide whether to use Arabic-Indic numerals or Western numerals in the student UI.
- Define numeral formatting for percentages and timers.

### Percentages

Percentages represent mastery or performance.

Rules:

- Use strong visual hierarchy for key percentages.
- Do not overuse percentages in a way that makes the dashboard feel like a spreadsheet.
- Pair important percentages with visual progress when possible.

### Mathematical Notation

Mathematical notation must remain clean and readable.

Rules:

- Preserve formula clarity.
- Avoid decorative typography around equations.
- Ensure symbols, numbers, and Arabic text coexist comfortably.

TODO:

- Define math rendering approach for future text-based math, if introduced.
- Confirm whether MVP remains image-only for question content.

### English Technical Content

English may appear in internal or admin-only contexts when required.

Rules:

- Student-facing product UI should remain Arabic-first.
- English technical labels should be visually secondary.
- Mixed Arabic-English layout must preserve RTL readability.

TODO:

- Define approved fonts for Arabic and Latin text.
- Define type scale.
- Define font weights.

---

## Layout System

Abqoor is mobile-first.

Mobile is the primary design target. Desktop expands the same system rather than becoming a separate product.

### Spacing Scale

Spacing should be consistent and calm.

Recommended scale categories:

- Extra small: tight spacing inside compact controls.
- Small: related text and icon spacing.
- Medium: field, answer choice, and card spacing.
- Large: section spacing.
- Extra large: page-level separation.

TODO:

- Define exact spacing token values.

### Page Margins

Mobile:

- Use comfortable side margins.
- Avoid edge-to-edge text except for intentional immersive surfaces.
- Question images may use wider space when readability requires it.

Tablet:

- Increase margins gradually.
- Keep primary actions reachable.

Desktop:

- Use constrained content widths.
- Avoid stretching reading content across the full viewport.
- Use extra width for dashboards, charts, and multi-panel review layouts.

### Content Width

Rules:

- Reading and form content should be constrained.
- Dashboards may use wider layouts.
- Question content should prioritize image readability.
- Exam screens should keep navigation and question focus stable.

### Card Spacing

Cards should be used for:

- Question containers.
- Milestone summaries.
- Progress summaries.
- Focused dashboard modules.

Rules:

- Avoid nested cards.
- Avoid over-framing every section.
- Maintain clear spacing between cards.

### Touch Target Sizes

Rules:

- Primary touch targets must be large enough for mobile use.
- Answer choices must be easy to tap.
- Bottom navigation items must be thumb-friendly.
- Exam controls must remain reliable under time pressure.

TODO:

- Define exact minimum touch target size.
- Define safe-area behavior for mobile devices.

---

## Navigation System

Navigation must preserve the same information architecture across devices.

### Mobile Navigation

Mobile uses bottom navigation.

Bottom navigation items:

- Career
- Study
- Exam
- Profile

Rules:

- Bottom navigation should remain simple.
- Active state should be clear.
- Labels should be Arabic in production UI.
- Navigation should not compete with question content during focused sessions.

TODO:

- Approve final Arabic labels for bottom navigation.
- Define whether bottom navigation hides during active exams or sessions.

### Desktop Navigation

Desktop should use an equivalent navigation pattern without changing information architecture.

Acceptable desktop patterns:

- Side navigation.
- Top navigation.
- Wider dashboard navigation.

Rules:

- Preserve the same destinations as mobile.
- Do not introduce desktop-only core destinations.
- Keep Career, Study, Exam, and Profile conceptually consistent.

TODO:

- Select final desktop navigation pattern.

---

## Core Components

This section defines visual component standards only. It does not define implementation components.

### Mastery Pillar

Used throughout the Career Dashboard.

Purpose:

- Represent mastery progress.
- Communicate that the student is building upward toward competence.

Shape:

- Vertical, pillar-like form for top-level topics.
- Rounded enough to feel modern, but not playful.
- Strong base and clear fill area.

Size behavior:

- Mobile pillars must be tappable and readable.
- Desktop pillars may be taller and more spacious.
- Pillars should scale without distorting percentage readability.

Percentage placement:

- Percentage should be visible inside or near the pillar.
- At 0%, the percentage must still be clear.
- At high percentages, the fill must not obscure text.

Animation style:

- Fill animation may be used after meaningful progress updates.
- Animation should be fast, subtle, and purposeful.
- Avoid bouncing, confetti, or game-like motion.

Empty state:

- 0% pillars should feel like a beginning, not failure.
- Empty pillars should be calm and inviting.
- Use Grey structure with subtle Navy or Turquoise accents.

TODO:

- Define exact pillar dimensions.
- Define whether percentage text sits inside or above the pillar.
- Define fill direction and easing.

### Topic Pillar

Large vertical pillar used for:

- Math topics.
- Arabic topics.

Rules:

- Topic pillars are primary dashboard interaction objects.
- Each topic pillar should show mastery percentage.
- Topic labels must be readable in Arabic.
- The active or selected pillar should use a clear accent state.

Visual hierarchy:

- Topic pillars are larger than subtopic pillars.
- Topic pillars should feel like major learning areas.

### Subtopic Pillar

Smaller horizontal pillar used only for Math subtopics.

Purpose:

- Communicate hierarchy beneath a selected Math topic.
- Show more focused progress.
- Open Practice Mode when selected.

Rules:

- Must be visually smaller than topic pillars.
- Must clearly feel like a child element.
- Should use horizontal orientation to distinguish it from top-level vertical pillars.
- Should still show percentage-based mastery.

TODO:

- Define subtopic pillar spacing inside topic world.
- Define how many subtopic pillars are visible before scrolling.

### Question Card

Question Card defines the focused question-solving surface.

Question container:

- Should be clean and quiet.
- Should not compete with the image.
- Should support image-based question content.

Image placement:

- Question image is the primary content.
- Image should be large, readable, and centered.
- Image should not be cropped unless explicitly required by future content rules.

Answer choices:

- Choices A, B, C, D should be clearly separated.
- Each answer row should have a large tap target.
- Selected state should be obvious.
- Disabled and submitted states should be visually clear.

Spacing:

- Keep enough breathing room around the image.
- Keep answer choices close enough to scan together.
- Avoid dense layouts on mobile.

Interaction states:

- Default.
- Hover, where pointer input exists.
- Pressed.
- Selected.
- Submitted.
- Correct, if shown.
- Incorrect, if shown.
- Disabled.
- Loading.

TODO:

- Define whether answer feedback appears immediately in Practice Mode.
- Define correct and incorrect answer colors.
- Define explanation area design.

### Progress Components

Progress components include:

- Percentages.
- Progress bars.
- Mastery fills.
- Charts.
- Session progress indicators.

Rules:

- Use Turquoise for primary performance progress.
- Keep progress readable without requiring exact interpretation of tiny differences.
- Avoid showing too many progress indicators at once.
- Use percentages when they help the student act.

Mastery visualization:

- Should feel like growth over time.
- Should avoid fake precision if mastery formulas are not finalized.

TODO:

- Define chart styling.
- Define progress bar dimensions.
- Define when percentages should be rounded.

### Achievement Components

Achievement components include:

- Milestone cards.
- Personal records.
- Celebration states.

Rules:

- Use Golden Yellow sparingly.
- Keep milestones academic and personal.
- Avoid game-like badges, coins, XP, or leaderboards.
- Celebration states should be modest and respectful.

Milestone cards:

- Should show the achievement clearly.
- Should explain why it matters.
- Should not dominate the dashboard.

Personal records:

- Should emphasize improvement.
- Should avoid public comparison.

Celebration states:

- Should be short.
- Should be meaningful.
- Should not interrupt exam or practice flow unnecessarily.

TODO:

- Define milestone card structure.
- Define celebration animation limits.
- Define personal record visual treatment.

---

## Interaction Rules

### Swipe Behavior

Swipe should be used for:

- Moving between Math and Arabic worlds on mobile.
- Navigating dashboard-level worlds where appropriate.

Rules:

- Swipe should feel predictable.
- Swipe should not conflict with vertical scrolling.
- The current world should be visibly indicated.

TODO:

- Define swipe threshold and transition duration.

### Transitions

Transitions should be:

- Fast.
- Subtle.
- Meaningful.

Use transitions for:

- Moving between dashboard worlds.
- Pillar fill updates.
- Opening topic worlds.
- Showing result summaries.

Avoid transitions that:

- Delay answering questions.
- Distract during exams.
- Make the product feel game-like.

### Hover States

Hover states apply only where pointer input exists.

Rules:

- Hover should clarify clickability.
- Hover should not be required to understand the UI.
- Mobile behavior must not depend on hover.

### Pressed States

Pressed states should provide immediate feedback.

Rules:

- Buttons and answer choices should visibly respond when pressed.
- Pressed feedback should be quick and restrained.

### Loading States

Loading states should be calm and explicit.

Rules:

- Show what is loading.
- Avoid vague spinners when the action is important.
- Do not block reading content unnecessarily.

### Empty States

Empty states should be encouraging and honest.

Examples:

- New user mastery at 0%.
- No exam history yet.
- No saved review questions yet.

Rules:

- Do not fake progress.
- Show the next useful action.
- Keep copy short and supportive.

---

## Responsive Behavior

Abqoor uses one scalable system across:

- Mobile.
- Tablet.
- Desktop.

Do not create separate product experiences for each device.

### Mobile

Rules:

- Primary target.
- Bottom navigation.
- Swipe between Career Dashboard worlds.
- Large touch targets.
- Question images prioritized.
- Minimal side-by-side layouts.

### Tablet

Rules:

- Preserve mobile information architecture.
- Use additional width for comfortable spacing.
- Avoid creating desktop-only patterns too early.

### Desktop

Rules:

- Expand the same system.
- Use wider dashboard layouts.
- Use constrained reading widths.
- Use hover states only as enhancements.
- Preserve the same navigation destinations.

TODO:

- Define exact responsive breakpoints.
- Define dashboard layout at each breakpoint.
- Define exam layout across devices.

---

## Accessibility

Accessibility is part of the design system, not a later enhancement.

### Contrast

Rules:

- Text must remain readable on Navy backgrounds.
- Turquoise, Cyan, Orange, and Golden Yellow must be tested against their intended backgrounds.
- Disabled states must remain understandable.

TODO:

- Validate final color tokens against contrast standards.

### Touch Targets

Rules:

- Buttons, answer choices, bottom navigation, and exam controls must be large enough for reliable mobile use.
- Touch targets must have enough spacing to avoid accidental taps.

### Arabic Readability

Rules:

- Arabic text must have comfortable line height.
- Arabic labels must not be squeezed into narrow controls.
- Long Arabic topic names must wrap cleanly.

### Keyboard Support

Where applicable:

- Users should be able to navigate forms by keyboard.
- Answer choices should be keyboard-selectable.
- Focus states should be visible.
- Desktop navigation should support keyboard access.

TODO:

- Define focus ring style.
- Define keyboard behavior for question answering.
- Define reduced-motion behavior.

---

## Remaining Visual Decisions

The following visual decisions still require approval:

- Exact brand color hex values.
- Final Arabic and Latin fonts.
- Type scale and font weights.
- Arabic numeral format.
- Exact spacing scale.
- Minimum touch target size.
- Bottom navigation Arabic labels.
- Desktop navigation pattern.
- Mastery pillar dimensions and fill behavior.
- Topic and subtopic pillar layout details.
- Correct and incorrect answer colors.
- Explanation area design.
- Progress chart styling.
- Milestone card structure.
- Celebration animation limits.
- Responsive breakpoints.
- Focus state styling.
- Reduced-motion rules.

