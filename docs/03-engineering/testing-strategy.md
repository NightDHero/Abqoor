# Testing Strategy - Abqoor

## Purpose

Define how Abqoor features are considered complete, correct, and safe before moving between phases of development.

This document is part of the MVP engineering foundation.

## Codex Instructions

- Do not add new systems from this document.
- Do not modify architecture from this document.
- Do not implement tests unless explicitly instructed.
- Do not change database schema from this document.
- Do not change API behavior from this document.
- Use this document to validate whether implementation work is complete.

## Core Principle

A feature is not considered complete unless it passes:

- Functional correctness
- Data integrity validation
- Import consistency, if applicable
- API correctness
- Regression safety

## Feature Completion Rule

A feature is only considered complete when:

1. It behaves exactly as defined in `/docs`.
2. It does not produce invalid or partial data.
3. It does not break existing functionality.
4. It passes the manual verification steps defined below.

## Import System Testing

Import-related features require extra validation because they create question records and media files.

Required checks:

- PDF pages correctly generate question images.
- Excel data maps correctly to:
  - `correctAnswer`
  - `topic`
  - `subject`
- All required fields exist:
  - `questionImageUrl`
  - `correctAnswer`
  - `subject`
  - `topic`
  - `difficulty`
- No null values exist in required fields.
- Import preview matches commit output exactly.

## API Testing

For backend endpoints:

- All endpoints must return the expected data shape.
- No unexpected null or undefined fields should be returned.
- Error responses must be explicit and descriptive.
- Silent failures are not allowed.

## Data Integrity Rule

The database must always maintain:

- Image-based questions only.
- Valid `correctAnswer` values:
  - `A`
  - `B`
  - `C`
  - `D`
- Consistent subject and topic mapping.
- No orphan or partial records.

## Regression Rule

Before completing any new feature:

- Ensure `GET /questions` still works.
- Ensure the importer still works.
- Ensure image serving through `/question-images/` is functional.

## Manual Verification Checklist

For every major feature:

- [ ] Does it match the docs?
- [ ] Does data remain valid after execution?
- [ ] Does it affect existing features?
- [ ] Does it introduce schema inconsistency?
- [ ] Does it require a rollback if failed?

## Phase Completion Rule

A phase, such as Phase 1, Phase 2, or Phase 3, is only complete if:

- All features in the phase pass testing strategy rules.
- No data corruption is introduced.
- No undocumented behavior exists.
- Importer, API, and database remain consistent.

## TODO

- Define automated test coverage expectations.
- Define CI requirements.
- Define test data retention rules.
- Define release verification ownership.
