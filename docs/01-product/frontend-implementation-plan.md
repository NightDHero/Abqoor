# Frontend Implementation Plan - Abqoor

## Purpose

Define the official implementation roadmap for the Abqoor frontend.

The frontend must be built incrementally. Each phase must produce a stable working state before the next phase begins.

This is a documentation-only file. It does not implement frontend code, create React components, modify backend logic, or modify database schema.

Reference documents:

- `docs/01-product/user-experience-design.md`
- `docs/01-product/design-system.md`
- `docs/03-engineering/frontend-architecture.md`

---

## Codex Instructions

- Do not implement frontend code from this document unless explicitly instructed.
- Do not create React components from this document.
- Do not modify backend logic from this document.
- Do not modify database schema from this document.
- Follow phases in order during future frontend implementation.
- Do not skip phases.
- Do not implement excluded features early.
- Stop and report missing backend support when a phase depends on unavailable APIs.

---

## Implementation Rules

The frontend roadmap is sequential.

Rules:

- Phase 1 must establish the foundation.
- Phase 2 must build the main Abqoor identity screen.
- Phase 3 must create topic navigation before question solving.
- Phase 4 must connect the existing session system for practice.
- Phase 5 must introduce AI-guided learning after practice exists.
- Phase 6 must introduce Exam Mode after learning flows are stable.
- Phase 7 must add profile, achievements, and history after core learning and exam experiences exist.

Each phase must be stable before the next phase begins.

Stable means:

- It builds successfully.
- Its routes work.
- Its mobile layout is usable.
- It remains desktop compatible.
- It does not break completed phases.
- It does not add behavior outside the phase scope.

---

## Phase 1 - Frontend Foundation

### Objectives

Create the application foundation.

Includes:

- React application structure.
- RTL setup.
- Routing setup.
- `AppShell`.
- Navigation structure.
- Authentication handling structure.
- Global styling foundation.

Expected outcome:

Abqoor has a stable frontend shell that can support all future student and admin experiences.

### Dependencies

Depends on:

- Existing React + TypeScript + Vite project.
- `docs/03-engineering/frontend-architecture.md`.
- `docs/01-product/design-system.md`.
- Existing authentication backend.

### Required Backend Support

Required:

- Login endpoint.
- Register endpoint.
- Logout endpoint.
- Current user endpoint.

No new backend support should be added in this phase unless authentication is unavailable.

### Intentionally Excluded Features

Do not implement:

- Career Dashboard.
- Practice.
- Study Plan.
- Exam UI.
- Mastery calculations.
- Topic worlds.
- Profile achievements.
- New backend endpoints.

### Validation Checklist

- [ ] Application runs.
- [ ] Routes resolve correctly.
- [ ] RTL works.
- [ ] Responsive base layout works.
- [ ] Guest routes are accessible.
- [ ] Authenticated routes are protected.
- [ ] Navigation structure renders.
- [ ] App shell works on mobile and desktop.

---

## Phase 2 - Career Dashboard

### Objectives

Build the main Abqoor identity screen.

Includes:

- Math/Arabic world switcher.
- Swipe navigation.
- Remember last selected world.
- Mastery pillars.
- 0% empty state.
- Topic navigation.

Expected outcome:

Students see the two Abqoor learning worlds and understand that mastery begins at 0%.

### Dependencies

Depends on:

- Phase 1 Frontend Foundation.
- `docs/01-product/user-experience-design.md`.
- `docs/01-product/design-system.md`.
- Approved topic lists for Math and Arabic.

### Required Backend Support

Required:

- Authenticated user context.

Optional for this phase:

- Mastery data endpoint.

If mastery backend support is unavailable, use clearly marked placeholder data only for static 0% states. Do not invent real mastery calculations.

### Intentionally Excluded Features

Do not implement:

- Real mastery calculations.
- AI recommendations.
- Exam history.
- Practice question solving.
- Math subtopic practice flow.
- Exam UI.
- Achievements.

Use placeholder data only if required.

### Validation Checklist

- [ ] Career Dashboard route is protected.
- [ ] Math world renders.
- [ ] Arabic world renders.
- [ ] Swipe navigation works on mobile.
- [ ] Desktop equivalent world switching works.
- [ ] Last selected world is remembered.
- [ ] Pillars render 0% empty states.
- [ ] Topic navigation actions are wired to the next intended route or approved placeholder.
- [ ] No fake progress is shown.

---

## Phase 3 - Topic Worlds

### Objectives

Create topic navigation experiences.

Math includes:

- Topic pillars.
- Subtopic horizontal pillars.
- Subtopic entry.

Arabic includes:

- Topic pillars.
- Direct practice entry.

Expected outcome:

Students can move from the Career Dashboard into topic-specific navigation and prepare to enter practice.

### Dependencies

Depends on:

- Phase 2 Career Dashboard.
- Approved Math subtopic taxonomy.
- Approved Arabic topic behavior.
- Routing for topic and subtopic paths.

### Required Backend Support

Required:

- None if topic and subtopic taxonomy is static and approved in documentation.

Optional:

- Topic metadata endpoint.
- Mastery by topic or subtopic endpoint.

If backend mastery support is unavailable, topic and subtopic pillars must remain visually honest and use 0% or approved placeholder states.

### Intentionally Excluded Features

Do not implement:

- Question solving yet.
- Answer submission.
- AI recommendations.
- Exam Mode.
- Achievements.
- New mastery logic.

### Validation Checklist

- [ ] Math topic world opens from a Math topic pillar.
- [ ] Math subtopic horizontal pillars render.
- [ ] Subtopic entry action routes correctly.
- [ ] Arabic topics route directly toward practice entry.
- [ ] Topic hierarchy is visually clear.
- [ ] Mobile horizontal scrolling does not clip content.
- [ ] Back navigation returns to the expected Career Dashboard context.

---

## Phase 4 - Practice Mode

### Objectives

Connect the existing session system.

Includes:

- Question display.
- Answer selection.
- Submission.
- Progress.
- Question saving.
- Review interaction.

Expected outcome:

Students can complete a practice flow using the existing backend session and question systems.

### Dependencies

Depends on:

- Phase 3 Topic Worlds.
- Existing question APIs.
- Existing session APIs.
- Existing question image serving.
- Practice Mode UX rules.
- Question Card design standards.

### Required Backend Support

Required:

- Question retrieval.
- Session start.
- Answer submission.
- Session result retrieval.
- Question image serving.

Optional or future:

- Save question endpoint.
- Review list endpoint.
- Topic-filtered practice endpoint.
- Mastery update endpoint.

If saving questions or review interaction is not supported by backend APIs, the UI must show an approved unavailable state rather than silently pretending to save.

### Intentionally Excluded Features

Do not implement:

- Study Plan recommendations.
- Exam sections or timer.
- Full Profile achievements.
- New adaptive learning logic.
- Backend scoring changes.
- Importer changes.

### Validation Checklist

- [ ] Practice starts from an approved topic or subtopic entry.
- [ ] Question image displays correctly.
- [ ] Answer choices are selectable.
- [ ] Answer submission works.
- [ ] Progress updates correctly.
- [ ] Results display after completion.
- [ ] Completed sessions remain immutable.
- [ ] Save/review behavior matches actual backend support.
- [ ] Loading, empty, and error states are explicit.

---

## Phase 5 - Study Plan

### Objectives

Create the AI-guided learning experience.

Includes:

- Recommended sessions.
- Suggested topics.
- Guided practice flow.

Expected outcome:

Students who do not know what to study can follow a guided learning path.

### Dependencies

Depends on:

- Phase 4 Practice Mode.
- Mastery or progress data.
- Study Plan product rules.
- Recommendation UI standards.

### Required Backend Support

Required:

- Recommendation source or approved temporary placeholder response.
- Guided session start behavior.
- Session result support.

Optional or future:

- Confidence tracking.
- Advanced recommendation explanations.
- Spaced review scheduling.

If recommendation backend support is unavailable, this phase must stop or use explicitly approved placeholder recommendations. The frontend must not invent AI logic.

### Intentionally Excluded Features

Do not implement:

- Exam Mode.
- Profile achievements.
- AI algorithms in frontend.
- Backend recommendation logic.
- Advanced analytics dashboards.
- New mastery formulas.

### Validation Checklist

- [ ] Study route is protected.
- [ ] Recommended sessions render from service-provided data.
- [ ] Suggested topics are displayed clearly.
- [ ] Guided practice flow can be started.
- [ ] Loading and unavailable states are clear.
- [ ] Frontend does not calculate official recommendations locally.

---

## Phase 6 - Exam Mode

### Objectives

Create realistic Qudurat simulation.

Includes:

- Exam sections.
- Timer.
- Question navigation.
- Flagging.
- Review screen.
- Results display.
- History visualization.

Expected outcome:

Students can experience a structured exam simulation and review their exam performance.

### Dependencies

Depends on:

- Phase 5 Study Plan.
- Approved Exam Mode UX rules.
- Exam result and history APIs.
- Design system exam rules.

### Required Backend Support

Required:

- Exam start or session start contract for Exam Mode.
- Answer storage.
- Completion behavior.
- Result retrieval.
- Exam history retrieval.

Optional or future:

- Dedicated exam sections model.
- Timer persistence.
- Flagging persistence.
- Resume behavior.

If backend Exam Mode support is incomplete, implement only the parts supported by existing APIs and clearly mark unsupported behavior as unavailable. Do not fake official exam results.

### Intentionally Excluded Features

Do not implement:

- New exam types.
- Backend scoring changes.
- Importer changes.
- Study Plan algorithm changes.
- Social comparison.
- Leaderboards.

### Validation Checklist

- [ ] Exam route is protected.
- [ ] Exam sections render according to approved structure.
- [ ] Timer is readable and stable.
- [ ] Question navigation works.
- [ ] Flagging behavior matches backend support.
- [ ] Review screen uses approved color states.
- [ ] Results match backend-provided data.
- [ ] History visualization uses stored exam history.
- [ ] Mobile and desktop layouts remain consistent.

---

## Phase 7 - Profile and Achievements

### Objectives

Create user identity and progress history.

Includes:

- Achievements.
- Personal records.
- Exam history.
- Account settings.

Expected outcome:

Students can see their identity, progress history, and meaningful milestones without game-like mechanics.

### Dependencies

Depends on:

- Phase 6 Exam Mode.
- Achievement philosophy from UX documentation.
- Exam history APIs.
- Profile/account APIs.
- Progress or mastery data where available.

### Required Backend Support

Required:

- Current user endpoint.
- Exam history endpoint.

Optional or future:

- Achievements endpoint.
- Personal records endpoint.
- Account settings update endpoints.
- Progress summary endpoint.

If achievement backend support is unavailable, use honest empty states or approved static milestone placeholders. Do not invent stored achievements.

### Intentionally Excluded Features

Do not implement:

- XP.
- Coins.
- Leaderboards.
- Public ranking.
- Social comparison.
- Unsupported account settings.
- New backend achievement rules.

### Validation Checklist

- [ ] Profile route is protected.
- [ ] User identity displays correctly.
- [ ] Exam history displays from backend data.
- [ ] Achievements follow the non-game-like design philosophy.
- [ ] Empty states are honest.
- [ ] Account settings only show supported actions.
- [ ] Mobile and desktop layouts remain usable.

---

## Phase Completion Rule

A frontend phase is complete only when:

- All validation checklist items are satisfied or explicitly marked blocked.
- Required backend support exists or the phase reports the missing dependency.
- It builds successfully.
- It works on mobile.
- It remains desktop compatible.
- It follows Arabic-first and RTL rules.
- It does not introduce unrelated behavior.
- It does not break earlier phases.
- It follows the frontend architecture: Component -> Hook -> Service -> API.

---

## Unresolved Decisions

The following decisions still require approval:

- Final routing implementation.
- Protected route behavior.
- Final design tokens.
- Mastery API contract.
- Final Math subtopic route nesting and stable subtopic slugs.
- Practice topic filtering support.
- Saved question API contract.
- Review interaction backend contract.
- Study Plan recommendation API contract.
- Exam Mode backend contract.
- Timer persistence behavior.
- Flagging persistence behavior.
- Achievement rules and API contract.
- Personal records data model.
- Account settings scope.
- Profile progress summary contract.
