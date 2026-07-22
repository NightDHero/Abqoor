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

- `POST /admin/import/pdf`

The admin PDF import endpoint supports:

- PDF upload
- Excel metadata enrichment
- page range selection
- `startQuestionNumber`
- `preview` mode
- `commit` mode
- `overwriteExisting`
- per-page import manifest results
