# Abqoor Homepage Design Specification

## Status

This document is the implementation reference for the public Abqoor homepage and
the related presentation fixes completed during the homepage design pass.

It governs visual and interaction decisions only. Product behavior remains
defined by the existing product and engineering specifications.

## Brand Personality

Abqoor is an Arabic-first Saudi Qudurat product for students who want to begin
quickly, understand their current level, and study with direction.

The experience should feel:

- confident without sounding corporate
- intelligent without sounding technical
- local and conversational without forced slang
- energetic without looking like a game
- premium without relying on decorative excess

The public voice uses clear Saudi Arabic with a light Eastern Province flavor.
Short questions and direct invitations are preferred over formal feature
descriptions.

## Visual Philosophy

The homepage is a product story, not a feature directory.

Its visual hierarchy communicates:

1. The student can begin now.
2. Abqoor understands how the student needs to study.
3. The product provides a credible path from questions to focused improvement.

Product visuals carry the explanation. Long marketing paragraphs, stock photos,
fake testimonials, fabricated metrics, and generic card grids are prohibited.

## Color System

### Foundations

- Deep navy is the primary canvas.
- White is the primary reading color.
- Muted blue-grey supports secondary text.
- Cyan and turquoise identify guided learning, verbal content, and progress.
- Golden yellow identifies quantitative content, focus, and achievement.
- Orange is restricted to mistakes, urgency, or a small warm accent.

### Hierarchy

Only one accent family should dominate a composition at a time. Cyan and gold
may meet when the design is explicitly connecting verbal and quantitative
learning.

### Gradients

Gradients are acceptable for:

- large atmospheric backgrounds
- soft subject lighting
- restrained CTA depth
- transitions between quantitative and verbal concepts

Gradients are prohibited as arbitrary decoration on every card or control.

## Typography

The existing Arabic font system remains authoritative:

- `Noto Kufi Arabic` for display headings
- `Noto Sans Arabic` for body text and controls

Display headings use dense line-height and high weight. Body text uses generous
line-height and a readable measure. Responsive type uses `clamp()` with explicit
small-screen limits. Arabic headings must wrap naturally without negative
tracking or viewport-width-only sizing.

## Spacing

The homepage uses a four-pixel base rhythm with these practical groups:

- compact: 8-16px
- component: 20-32px
- composition: 40-72px
- section: 86-190px

Page gutters are fluid and never smaller than 15px. Wide product visuals may use
the full content width. Text remains constrained to a readable measure.

Large screens should gain breathing room and wider product demonstrations, not
simply larger text.

## Shape And Elevation

- Controls use 10-14px radii.
- Product frames use 18-24px radii.
- Large atmospheric compositions may use up to 28px.
- Shadows are reserved for visual hierarchy and should not surround every item.
- Borders use low-opacity white on dark surfaces.

## Motion

Motion must communicate depth, progression, or state.

- fast interaction feedback: 140-180ms
- component transitions: 220-320ms
- ambient movement: 6-12s

Ambient movement is limited to the hero visual and large backgrounds. The page
must remain understandable when all motion is disabled.

Under `prefers-reduced-motion`, ambient loops and nonessential transforms are
removed.

## Responsive Strategy

### Small Phone: 320-374px

- single-column story
- one obvious CTA
- full-width question visuals
- horizontally scrollable micro-prompts
- reduced decorative overlays
- no horizontal page overflow

### Large Phone: 375-479px

- single-column story with slightly larger visual frames
- controls remain at least 44px high
- product visuals preserve readable question imagery

### Tablet: 480-1023px

- single-column hero with expanded product preview
- selected two-column internal product layouts where content remains readable
- paired proof sections stack when their balance is compromised

### Laptop: 1024-1439px

- hero uses balanced copy and product visual columns
- sections alternate between constrained copy and wide product demonstrations

### Desktop: 1440px And Above

- content width is capped to protect composition
- product visuals expand inside the cap
- text remains at a readable measure
- outer space becomes atmosphere, not empty boxed margins

## Homepage Structure

### 1. Hero

Message: `تبغى تختبر روحك؟`

The hero presents one primary CTA and a question-first product composition using
a real question image, answer options, topic context, review context, and session
progress.

### 2. Student Needs

Short prompts show that Abqoor understands common student intentions:

- discovering weak areas
- browsing organized questions
- preparing quickly for a near exam

Prompts form a visual rhythm rather than a feature-card row.

### 3. Timing Context

The page connects students with plenty of time and students whose exam is close.
It presents one continuous preparation timeline instead of two unrelated cards.

### 4. Question Encyclopedia

A product-native hierarchy demonstrates:

- quantitative and verbal paths
- topics and subtopics
- direct movement from taxonomy to a real question

Only supported taxonomy labels are shown.

### 5. Smart Program

A fifteen-question sequence shows that a study session is intentionally selected
from previous mistakes, weak areas, and reinforcement needs. The presentation
must not imply unsupported machine-learning behavior.

### 6. Mock Exam

A compact, realistic exam preview shows section context, timer, question image,
answers, and quantitative/verbal balance. It is an illustration only and must not
alter Exam Mode.

### 7. Weakness Discovery

The visual identifies where the next session should focus without presenting
fabricated performance percentages.

### 8. Short Explanations

A question image is paired with a concise explanation note. The copy must not
promise that every question has an explanation.

### 9. Final CTA

The final section removes visual complexity and ends with a direct invitation to
begin.

## Image Rules

- Real question images are preferred over stock imagery.
- Question images preserve their intrinsic aspect ratio.
- `object-fit: contain` is required when the containing geometry differs.
- Images must not be cropped if cropping removes question content.
- Decorative wrappers must not make questions difficult to read.
- Static media URLs use the centralized backend environment configuration.

## Question Viewer Rules

The question is the dominant object.

- `immersive-question-slide` uses the practical viewport width.
- The image may use all available width and height while preserving its ratio.
- Shell gutters and action controls must not reserve large empty side areas.
- Save and share remain available but visually secondary.
- Answer controls remain reachable and distinct.
- Vertical scroll snapping remains unchanged.
- Mobile layouts use safe-area insets and avoid horizontal overflow.

## Exam Entry Rules

Exam Entry is centered relative to the viewport, not an offset shell container.
The navigation remains available before the exam starts.

The page communicates:

- previous attempts
- official instructions
- one obvious start action

Starting the exam, timer behavior, scoring, persistence, analytics, and Exam Mode
are not part of this visual specification and must remain unchanged.

## Existing Protected Areas

### Career

Career is approved and must not be redesigned by homepage work.

### Hub

The existing world atmosphere and interaction model remain protected. Only
separately approved responsive fixes may change it.

### Actual Exam Mode

The exam-solving interface and all behavior remain protected.

## Component Rules

- Reuse the existing routing and authentication flows.
- Keep homepage visual primitives under the home feature boundary.
- Keep homepage selectors scoped under `.public-home`.
- Do not create parallel global button, card, or typography systems.
- Prefer a product demonstration over descriptive copy.
- Avoid nested cards and repeated floating panels.

## Prohibited Patterns

- generic SaaS feature grids as the main story
- fake statistics, testimonials, or student identities
- stock photos
- oversized decorative blobs
- excessive glassmorphism
- gradients on every component
- tiny question images inside large empty containers
- competing primary CTAs
- hardcoded API hosts

## Accessibility

- Text and controls must maintain readable contrast.
- Interactive targets are at least 44px high.
- Focus states remain visible.
- Arabic direction is RTL; numbers and timers may use LTR where required.
- Meaning is not communicated by color alone.
- Reduced-motion preferences are respected.
- Page content remains usable at 200% zoom and at a 320px viewport.

## Validation

Visual QA must cover:

- 320, 375, 390, 430, 768, 1024, 1280, 1440, and 1920px widths
- mobile portrait and mobile landscape
- page overflow and text wrapping
- real question image readability
- CTA hierarchy
- question viewer controls and viewport use
- Exam Entry centering and responsive stacking
- Career regression safety

