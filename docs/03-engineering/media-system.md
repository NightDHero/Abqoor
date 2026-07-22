# Media System Specification

## Purpose

Define how Abqoor handles all media assets, including:

- question images from PDF pages
- admin-uploaded content
- future media extensions such as videos and diagrams

This system is required to support the Question Importer.

## Codex Instructions

- Treat this document as the source of truth for media handling.
- Do not store media binaries in the database.
- Do not implement AI image processing, text extraction, or image editing.
- Do not add video handling during the MVP.
- Do not create or modify media APIs unless explicitly instructed.
- Keep media behavior aligned with `docs/03-engineering/question-importer.md`.

## Core Principles

- All question content is image-based only.
- No text extraction from images.
- Media is stored as static files, not inside the database.
- The database only stores references, such as URLs or paths.
- The system must support large-scale storage of 10,000 or more questions.

## Storage Structure

All question images must be stored in:

```text
/media/questions/
```

File naming convention:

```text
Q-{questionId}.png
```

Examples:

```text
Q-065.png
Q-066.png
```

## Public Access Path

All question images must be accessible via:

```text
/question-images/Q-065.png
```

In production, question images must be accessible via:

```text
https://{domain}/question-images/Q-065.png
```

## Upload Flow

### 1. Admin Uploads PDF

- Each page equals one question image.

### 2. System Processes PDF

- Convert pages into PNG images.
- Assign deterministic question IDs.

### 3. System Stores Images

- Save files in `/media/questions/`.
- Ensure each filename matches its question ID.

### 4. System Links Database

- Store the image URL in the question record.

## Database Rule

Only store media references in the database:

```ts
Question {
  questionId: string;
  questionImageUrl: string;
}
```

No binary storage is allowed in the database.

## API Requirements

Future admin endpoints must support:

- `POST /admin/import/pdf`
- `POST /admin/import/preview`
- `POST /admin/import/commit`

These endpoints will use:

- importer system
- media system

## Access Control

- Admins can upload media.
- Students can only view images.
- Students have no direct write access.

## Validation Rules

- All filenames must match `questionId` exactly.
- Only PNG format is allowed for question images during the MVP.
- Missing images must fail import.
- Duplicate filenames are not allowed.

## Non-Goals

- No AI image processing.
- No text extraction.
- No image editing.
- No video handling during the MVP.

## System Role

This system only handles:

```text
PDF -> Image -> Storage -> URL mapping
```

It does not:

- interpret questions
- modify content
- handle adaptive logic

## TODO

- Define production domain configuration.
- Define backup and retention policy for media files.
- Define CDN or static-hosting strategy if needed.
- Define admin authorization implementation details.
- Define whether generated media manifests are persisted.
