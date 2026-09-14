# Persistent Storage Architecture

## Overview

Abqoor production uses two persistent stores:

- SQLite on a Render persistent disk for structured application data.
- Private Cloudflare R2 for PDF and question-image binaries.

The local filesystem is not permanent production storage. It is used for local development, tests, upload scratch files, PDF rendering scratch files, and pre-backfill legacy image input.

## Production Configuration

Render backend:

```text
NODE_ENV=production
DATABASE_PATH=/var/data/abqoor.sqlite
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=...
R2_BUCKET=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
QUESTION_IMAGE_WEBP_QUALITY=88
JWT_SECRET=<at least 32 characters>
SESSION_COOKIE_NAME=abqoor_session
SESSION_COOKIE_SAMESITE=none
```

`R2_PUBLIC_BASE_URL` may be present but is intentionally unused while the bucket remains private and images are served through the API.

Vercel frontend:

```text
VITE_API_URL=https://<render-api-host>
```

## SQLite

The backend owns database initialization and migrations. Production must use the persistent disk path:

```text
/var/data/abqoor.sqlite
```

Relative production database paths are rejected at startup to avoid accidentally creating a fresh database inside Render's ephemeral working directory.

SQLite runs with WAL, foreign keys, a short busy timeout, and WAL-friendly synchronous settings. This supports Abqoor's current single Render API process while letting concurrent requests wait briefly on write locks.

## R2

R2 is accessed with the AWS S3-compatible API:

```text
endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
region: auto
```

Use Object Read & Write credentials scoped to the Abqoor bucket. Credentials are server-only and must not be exposed to the frontend.

## Object Keys

Question images:

```text
questions/{questionId}/question.webp
```

Original source PDFs:

```text
pdfs/originals/{sourcePdfId}/original.pdf
```

Import staging and rollback support:

```text
imports/{importJobId}/...
```

## PDF Import Flow

```text
admin upload
-> temporary multipart file
-> original PDF object upload
-> source_pdfs row
-> temporary PNG rendering
-> WebP optimization
-> staged object upload
-> validation preview
-> confirmation
-> object promotion
-> question/import database transaction
```

Critical object writes and promotions are verified. The importer should fail visibly instead of claiming success when storage or database work fails.

## Question Image Serving

Clients use `/question-images/:fileName`. The backend resolves the canonical question, reads `image_storage_key`, and streams the object with the correct content type.

Production does not serve arbitrary local fallback files for missing question records or missing stored objects. Development can still use legacy local images for compatibility.

## Backfill

Run only after R2 configuration is validated:

```text
npm run storage:backfill-images -w apps/api
```

The script uploads local legacy images to object storage, verifies each write, and updates SQLite only after successful storage. It is resumable and does not delete local images.

## R2 Smoke Test

Run before importing or backfilling production media:

```text
npm run storage:smoke-r2 -w apps/api
```

The smoke test writes, reads, copies, deletes, and verifies one generated temporary object. It must not be run without intended R2 credentials.

## Recovery Limits

SQLite data is recoverable only if the Render persistent disk is intact or separately backed up. R2 stores PDFs and question images, but R2 does not back up SQLite. A complete recovery plan needs both the SQLite file and the R2 bucket contents.
