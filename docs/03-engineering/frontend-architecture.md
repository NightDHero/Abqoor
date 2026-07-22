# Frontend Architecture - Abqoor

## Purpose

Define the production frontend architecture for Abqoor.

The frontend architecture must support:

- Scalable React architecture.
- Reusable components.
- Clean separation of concerns.
- Arabic-first experience.
- Mobile-first implementation.
- Desktop compatibility.
- Long-term maintainability.

This document references:

- `docs/01-product/user-experience-design.md`
- `docs/01-product/design-system.md`
- `docs/03-engineering/tech-stack.md`

This is a documentation-only file. It does not define implementation code, backend logic, database schema, or new product behavior.

---

## Codex Instructions

- Do not implement frontend code from this document unless explicitly instructed.
- Do not create React components from this document.
- Do not modify backend logic from this document.
- Do not modify database schema from this document.
- Do not introduce new frontend technologies without approval.
- Keep frontend structure aligned with the UX and design system documents.
- Leave unresolved technical decisions as TODOs.

---

## Frontend Technology

### Framework

Abqoor uses React.

Reason:

- Suitable for interactive learning flows.
- Mature ecosystem.
- Compatible with reusable component architecture.
- Already approved in `docs/03-engineering/tech-stack.md`.

### Language

Abqoor frontend code uses TypeScript.

Rules:

- Shared data contracts should be typed.
- API response shapes should be represented with explicit types.
- Avoid `any` unless temporarily required and documented.

### Build Tool

Abqoor uses Vite for client-side frontend development and builds.

Rules:

- Keep build configuration simple.
- Do not add SSR or meta-framework behavior unless approved later.

### Styling Approach

The approved MVP styling approach is simple CSS aligned with the Abqoor design system.

Rules:

- Follow `docs/01-product/design-system.md`.
- Use reusable class patterns or design tokens when they are approved.
- Avoid introducing a UI framework without approval.
- Avoid visual decisions that contradict the official design system.

TODO:

- Decide whether future styling uses CSS modules, vanilla CSS, utility classes, or another approved approach.
- Define final design tokens before large UI implementation.

### Routing Approach

The frontend should use a clear route-based application structure.

Rules:

- Routes should map to product areas.
- Page components should own page composition, not reusable business logic.
- Do not create multiple route systems.

Current MVP may use simple client-side routing until a formal router is approved.

TODO:

- Approve final routing library or keep a lightweight internal route layer.
- Define protected route behavior.

### State Management Approach

The approved MVP state management approach is local React state.

Rules:

- Prefer local state for local UI behavior.
- Avoid global state unless data truly crosses pages or product areas.
- Do not add a global state library without approval.

TODO:

- Reevaluate state management if authenticated user, preferences, active world, and server state become difficult to manage with local state.

### API Communication Approach

Frontend API communication should go through a service layer.

Rules:

- Components must not directly call backend APIs.
- Pages should not contain raw request details when a service or hook can own them.
- API services should centralize request paths, credentials behavior, and response parsing.
- Hooks should connect services to React state.

Expected direction:

```text
components
  ->
hooks
  ->
services
  ->
backend API
```

---

## Architecture Principles

Frontend architecture must follow these principles:

- Components should be reusable when reuse is real.
- Business logic should not live inside UI components.
- API communication should be separated from rendering.
- Server data and UI state should be separated.
- Page components should compose features, not own all logic.
- Hooks should connect UI to state and services.
- Services should own API details.
- Feature boundaries should remain clear.
- Avoid premature abstraction.

Rules:

- Do not create generic components before multiple features need them.
- Do not hide simple behavior behind complex layers.
- Do not duplicate API request logic inside pages or components.
- Do not calculate backend-owned learning state in the frontend.
- Keep Arabic-first and mobile-first requirements visible in component design.

---

## Frontend Structure

The frontend should use a simple modular structure.

Recommended structure:

```text
src/
  pages/
  components/
  features/
  services/
  hooks/
  state/
  types/
  utils/
```

Do not create unnecessary abstraction. Add folders when they clarify ownership.

### pages/

Owns top-level route pages.

Examples:

- `LandingPage`
- `LoginPage`
- `RegisterPage`
- `CareerPage`
- `StudyPage`
- `ExamPage`
- `ProfilePage`
- `PracticePage`
- `AdminValidationPage`

Rules:

- Pages compose features and layout.
- Pages should not contain raw API request logic.
- Pages should not contain reusable low-level UI primitives.

### components/

Owns reusable UI components that are not tied to one product feature.

Examples:

- `AppShell`
- `Header`
- `BottomNavigation`
- `Button`
- `Modal`
- `LoadingState`
- `EmptyState`

Rules:

- Components should be reusable.
- Components should not know backend endpoint paths.
- Components should receive data through props.

### features/

Owns feature-specific UI and logic composition.

Suggested feature folders:

```text
features/
  auth/
  career/
  practice/
  study/
  exam/
  profile/
  mastery/
  progress/
  admin/
```

Rules:

- Feature folders may contain feature-specific components, hooks, and types.
- Feature code should not leak into unrelated features.
- Shared behavior should move to `components/`, `hooks/`, `services/`, or `utils/` only when reuse is real.

### services/

Owns API communication and external service wrappers.

Examples:

- `authService`
- `questionService`
- `sessionService`
- `examService`
- `validationService`

Rules:

- Services perform network requests.
- Services normalize API errors.
- Services return typed data to hooks.
- Services should not own React state.

### hooks/

Owns reusable React hooks.

Examples:

- `useCurrentUser`
- `useExamHistory`
- `useLearningSession`
- `useCareerMastery`

Rules:

- Hooks connect React state to services.
- Hooks may own loading, error, and retry state.
- Hooks should not render UI.

### state/

Owns global or cross-page state only when needed.

Examples:

- Authenticated user.
- Active Career Dashboard world.
- User preferences.

Rules:

- Avoid unnecessary global state.
- Keep server state out of global state unless there is a clear reason.

### types/

Owns shared TypeScript types.

Examples:

- `User`
- `Question`
- `Session`
- `ExamResult`
- `MasterySummary`

Rules:

- Types should reflect backend API contracts.
- Avoid duplicating incompatible types across features.

### utils/

Owns pure helpers.

Examples:

- Date formatting.
- Percentage formatting.
- RTL-safe number formatting.
- Route helpers.

Rules:

- Utilities should be framework-light where possible.
- Utilities should not perform network requests.

---

## Routing Architecture

### Guest

```text
/
```

Purpose:

- Landing page for signed-out users.
- Communicates Abqoor identity.
- Routes users to login or registration.

### Authentication

```text
/login
/register
```

Purpose:

- User login.
- User registration.

### Main Application

```text
/career
/study
/exam
/profile
```

Purpose:

- Primary signed-in student areas.
- Match mobile bottom navigation destinations.

### Practice

```text
/practice/:subjectSlug/:topicSlug
/practice/:subjectSlug/:topicSlug/:subtopicSlug
```

Purpose:

- Topic or subtopic practice entry.
- Should map to the Practice Mode described in product docs.
- Uses stable internal slugs instead of Arabic display strings.

Examples:

```text
/practice/math/arithmetic
/practice/math/algebra
/practice/math/geometry
/practice/math/statistics
/practice/arabic/verbal-analogy
/practice/arabic/sentence-completion
```

Rules:

- `subjectSlug` must be `math` or `arabic`.
- `topicSlug` must be a stable ASCII identifier.
- Arabic labels remain display-only content.
- Changing an Arabic display name must not change the route.
- Frontend route helpers must use internal IDs, not display labels.

TODO:

- Confirm whether future `:subtopicSlug` routes are nested under `:topicSlug`.
- Approve final stable slugs for Math subtopics.

### Admin

```text
/admin/*
/admin/validation
```

Purpose:

- Internal admin tools.
- Validation dashboard.
- Future content management tools.

Rules:

- Admin routes must be protected.
- Admin routes should not appear in student navigation.

---

## Main Page Responsibilities

### Landing

Responsible for:

- Guest introduction.
- Brand identity.
- Account creation and login entry.
- High-level explanation of Abqoor.

Should not own:

- Authenticated dashboard behavior.
- Real user progress.
- Admin tools.

### Login

Responsible for:

- Login form.
- Login error states.
- Routing after successful login.

Should not own:

- User profile rendering.
- Dashboard state.

### Register

Responsible for:

- Registration form.
- Registration error states.
- New user routing into Career Dashboard.

Should not own:

- Onboarding decisions unless approved.
- Fake progress.

### Career

Responsible for:

- Math/Arabic world switching.
- Mastery visualization.
- Topic navigation.
- Remembering or applying active world preference when supported.

Should not own:

- Question solving logic.
- AI recommendation logic.
- Exam flow logic.
- Raw API request code.

### Study

Responsible for:

- Displaying recommended learning plan.
- Starting AI-guided sessions.
- Showing why a recommendation exists when supported.

Should not own:

- Adaptive algorithm logic.
- Backend recommendation calculation.
- Exam simulation logic.

### Practice

Responsible for:

- User-selected practice flow.
- Answering questions.
- Saving questions.
- Collecting learning data.
- Displaying selected topic or subtopic context.

Should not own:

- Career Dashboard world switching.
- Exam timer logic.
- Backend mastery calculation.
- AI recommendation logic.

### Exam

Responsible for:

- Timed exam experience.
- Sections.
- Review navigation.
- Results.

Should not own:

- Practice Mode behavior.
- Career Dashboard state.
- Importer or validation logic.

### Profile

Responsible for:

- Achievements.
- Exam history.
- Account settings.
- User information when needed.
- Personal progress summaries when approved.

Should not own:

- Question solving logic.
- Admin validation logic.

### Admin Validation

Responsible for:

- Read-only content validation.
- Imported question inspection.
- Image and metadata verification.

Should not own:

- Student learning state.
- Import processing logic.
- Session or exam analytics logic.

---

## Component System

### Application Components

Expected components:

- `AppShell`
- `Navigation`
- `PageContainer`

Responsibilities:

- Global layout.
- Navigation placement.
- Page framing.
- Responsive shell behavior.

Rules:

- Layout components should not know feature-specific business rules.
- Layout components should support Arabic-first RTL layouts.

### Layout Components

Additional layout components may include:

- `Header`
- `BottomNavigation`
- `SidebarNavigation`
- `ContentRegion`

Rules:

- Mobile and desktop navigation should preserve the same information architecture.
- Layout components should not directly fetch feature data.

### Career Components

Expected components:

- `WorldSwitcher`
- `MasteryPillar`
- `TopicPillar`
- `SubtopicPillar`

Responsibilities:

- Render Math and Arabic worlds.
- Render mastery visuals.
- Route users into topic or subtopic flows.

Rules:

- Components receive mastery data through props.
- Components should not fetch mastery directly.
- Components should follow pillar rules from the design system.

### Practice Components

Expected components:

- `QuestionCard`
- `AnswerOption`
- `QuestionProgress`

Responsibilities:

- Render question image.
- Render answer choices.
- Render current practice progress.

Rules:

- Question components should support image-based questions.
- Answer state should be clear and accessible.
- Components should not know backend endpoint paths.

### Study Components

Expected components:

- `StudyPlanCard`
- `RecommendationCard`

Responsibilities:

- Render recommended learning plans.
- Explain recommended next actions when supported.
- Start guided learning flows through hook-provided actions.

Rules:

- Study components should not implement recommendation algorithms.
- Study components should not calculate mastery.
- Recommendation data should come from server-backed services when available.

### Exam Components

Expected components:

- `ExamTimer`
- `SectionHeader`
- `ReviewGrid`
- `QuestionNavigator`

Responsibilities:

- Render exam timing.
- Render section context.
- Render current question position.
- Render review state colors.

Rules:

- Exam components should remain stable under time pressure.
- Timer display should be readable on mobile.
- Review colors must follow the design-system accessibility rules.

### Analytics Components

Expected components:

- `ScoreChart`
- `MasteryChart`

Responsibilities:

- Render score trends.
- Render mastery trends.
- Present analytics without recalculating official backend results.

Rules:

- Charts should use approved brand colors.
- Charts should remain readable on mobile.
- Analytics components should not mutate data.

### Progress Components

Expected components:

- `AchievementCard`
- `ProgressSummary`
- `MilestoneCard`

Responsibilities:

- Render progress summaries.
- Render milestones.
- Render personal achievement states.

Rules:

- Achievement components must not look like XP, coins, or leaderboards.
- Progress charts should use approved brand colors.

---

## State Architecture

### Local Component State

Local UI state includes:

- Selected answer.
- Open or closed panels.
- Animations.
- Current tab inside a local page area.
- Form input values.
- Temporary UI state.

Rules:

- Keep local state close to where it is used.
- Do not promote state globally before it is needed elsewhere.

### Global Client State

Global client state includes:

Examples:

- Authenticated user.
- User preferences.
- Selected world.
- Active Career Dashboard world when needed across pages.

Rules:

- Avoid storing server data globally unless it is required across many pages.
- Keep global state minimal.
- Do not use global state as a cache without a clear strategy.

### Server State

Server state includes:

- Questions.
- Sessions.
- Mastery data.
- Exam history.
- Exam results.
- Results.
- Validation data.

Rules:

- Server state should be loaded through hooks and services.
- Server state should handle loading, error, and empty states explicitly.
- Avoid duplicating stale server state in multiple places.

---

## API Architecture

Components must not directly call APIs.

Required direction:

```text
Component
  ->
Hook
  ->
Service
  ->
API
```

### Services

Services own:

- Endpoint paths.
- HTTP methods.
- Credentials behavior.
- Request payload shape.
- Response parsing.
- Error normalization.

### Hooks

Hooks own:

- Loading state.
- Error state.
- Calling services.
- Mapping service data into UI-ready state.

### Components

Components own:

- Rendering.
- User interaction events.
- Calling hook-provided actions.

Rules:

- Components should not build raw URLs.
- Components should not parse raw API responses.
- Components should not duplicate service logic.

---

## Data Flow

### Career

Expected flow:

```text
Backend mastery data
  ->
Career service
  ->
Career hooks
  ->
Pillars
```

Rules:

- Pillars render data.
- Pillars do not calculate mastery.
- Career page coordinates layout and navigation.

### Practice

Expected flow:

```text
Question retrieval
  ->
Question display
  ->
Answer submission
  ->
Mastery update
```

Rules:

- Practice UI submits answers through services.
- Mastery update behavior belongs to backend systems.
- Frontend reflects returned state rather than inventing learning state.

### Study

Expected flow:

```text
AI recommendation
  ->
Learning session
  ->
Results
```

Rules:

- Study UI displays recommendations.
- Backend systems own recommendation generation.
- Results should come from session or learning APIs.

### Exam

Expected flow:

```text
Start exam
  ->
Answer questions
  ->
Complete section
  ->
Generate results
```

Rules:

- Exam UI should respect backend completion state.
- Exam results should use stored result data.
- Frontend should not calculate official exam history independently.

---

## Arabic-First Requirements

### RTL Support

Rules:

- Student-facing pages should default to RTL.
- Layout should not break when Arabic labels wrap.
- Icon direction should be reviewed for RTL meaning.

### Arabic Text Direction

Rules:

- Arabic content should use RTL text direction.
- Mixed content should be tested carefully.
- Admin-only technical content may use mixed direction where needed.

### Number Handling

Rules:

- Percentages, timers, and scores must be readable.
- Number formatting should be consistent across the app.
- Do not mix number styles without an approved rule.

TODO:

- Approve Arabic-Indic vs Western numeral usage.

### Mixed Arabic and Math Content

Rules:

- Mathematical notation must stay legible inside RTL layouts.
- Question images remain the source of truth for image-based question content.
- UI labels around math content should not crowd formulas or images.

### Accessibility

Rules:

- Arabic text must remain readable at mobile sizes.
- Keyboard focus states must be visible where keyboard navigation applies.
- Touch targets must follow the design-system accessibility rules.
- Mixed Arabic/math content should be tested for reading order and alignment.

---

## Responsive Architecture

Abqoor uses one system that scales.

### Mobile

Mobile is the primary experience.

Rules:

- Bottom navigation.
- Large touch targets.
- Swipe between Career Dashboard worlds.
- Single-column question flow.
- Question images prioritized.

### Tablet

Rules:

- Preserve mobile information architecture.
- Use extra width for spacing and secondary panels.
- Avoid creating tablet-only workflows.

### Desktop

Desktop is an expanded experience.

Rules:

- Same routes and information architecture.
- Wider dashboards.
- Constrained reading areas.
- Pointer hover states as enhancements only.
- No desktop-only core product behavior.

---

## Performance Considerations

### Lazy Loading

Rules:

- Heavy pages should be lazy-loaded when routing is formalized.
- Admin tools should not load for normal student flows unless needed.
- Exam and Practice should prioritize fast interaction after entry.

TODO:

- Define route-level lazy loading strategy after final routing approach is approved.

### Image Handling

Rules:

- Optimize image loading for question-heavy flows.
- Question images should load reliably.
- Question images should not be unnecessarily re-requested.
- UI should handle missing or broken images explicitly.
- Large images should preserve readability over decorative cropping.

TODO:

- Define image preloading rules for Practice and Exam.
- Define placeholder behavior for image loading.

### Avoiding Unnecessary Renders

Rules:

- Keep state local where possible.
- Avoid passing large changing objects through broad component trees.
- Memoize only when there is a demonstrated performance need.

### Large Question Bank Considerations

Rules:

- Question bank scalability must be considered in page data loading.
- Do not load unnecessary large question datasets into UI state.
- Use paginated, filtered, or session-scoped loading when supported by backend APIs.
- Keep image-heavy pages mindful of memory and bandwidth.

---

## Future Compatibility

The frontend architecture should allow future expansion without rewriting the application.

Future needs may include:

- More question categories.
- Larger question banks.
- Advanced AI recommendations.
- Additional analytics.
- New exam types.
- More admin content tools.

Rules:

- Keep feature boundaries clear.
- Keep services separated by backend domain.
- Keep reusable components generic only when reuse is real.
- Avoid hardcoding product assumptions that are expected to expand.

TODO:

- Define feature flag approach if needed.
- Define analytics event architecture when approved.
- Define strategy for future frontend testing.

---

## Unresolved Frontend Decisions

The following frontend decisions still require approval:

- Final routing library or lightweight routing approach.
- Protected route implementation.
- Styling approach beyond current simple CSS.
- Final design token implementation.
- Global state mechanism if local state becomes insufficient.
- Server state caching strategy.
- Route-level lazy loading strategy.
- Image preloading strategy for Practice and Exam.
- Arabic-Indic vs Western numeral usage.
- Desktop navigation pattern.
- Frontend test strategy.
- Analytics event architecture.
- Feature flag approach.
