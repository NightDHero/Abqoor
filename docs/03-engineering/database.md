# Database

## Purpose

Document database schema, migration approach, and data ownership.

## Codex Instructions

- Do not invent tables or relationships.
- Reflect only implemented schema or approved future schema.
- Keep schema notes aligned with code.

## TODO

- Keep implemented table documentation current.
- Define migration strategy.
- Define seed-data strategy.

## Implemented Tables

### users

Stores registered user accounts.

Implemented fields:

- `id`
- `email`
- `password_hash`
- `created_at`
- `updated_at`

### questions

Stores image-first question records.

Implemented fields:

- `id`
- `question_image_url`
- `correct_answer`
- `subject`
- `topic`
- `subtopic`
- `difficulty`
- `estimated_time_seconds`
- `skill_tags`
- `importance_weight`
- `source`
- `version`
- `explanation_video_url`
- `created_at`
- `updated_at`

### import_jobs

Tracks MVP import operations conceptually defined in `docs/02-content/import-jobs.md`.

Implemented fields:

- `id`
- `source_type`
- `status`
- `start_question_number`
- `created_at`
- `created_by`
- `total_pages`
- `success_count`
- `failure_count`
