# API

## Purpose

Document backend API conventions and endpoints.

## Codex Instructions

- Do not invent endpoints.
- Keep endpoint documentation aligned with implemented routes.
- Mark planned endpoints as TODO until built or approved.

## TODO

- Document implemented auth endpoints in full detail.
- Define API error format conventions.

## Implemented Endpoints

The API sends credential-aware CORS responses only for configured frontend origins, sets baseline security headers, and applies modest in-process throttling to sensitive authentication and admin-import mutation endpoints. The throttling is useful abuse friction for the current Render service, but it is not a distributed global rate limit.

### Core

- `GET /health`

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Questions

- `GET /questions`
- `GET /questions/:id`

Supported `GET /questions` filters:

- `subject`
- `topic`
- `difficulty`

### Admin Importer

All admin import routes require authenticated administrator access.

- `POST /admin/import/analyze`
- `GET /admin/import/jobs`
- `GET /admin/import/jobs/:id`
- `POST /admin/import/jobs/:id/confirm`
- `POST /admin/import/jobs/:id/cancel`
- `POST /admin/import/jobs/:id/rollback`
- `GET /admin/import/questions`
- `GET /admin/import/source-pdfs/:id/file`

The retired `POST /admin/import/pdf` endpoint is kept only as an explicit legacy response and is not the active importer.
