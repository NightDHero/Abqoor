# Persistent Storage Architecture

## Overview

Abqoor production uses two persistent stores:

- Supabase PostgreSQL for structured application data.
- Private Cloudflare R2 for PDF and question-image binaries.

Render Free does not provide persistent disks, so production must not rely on SQLite files for durable structured data. The local filesystem is only for local development, tests, upload scratch files, PDF rendering scratch files, and pre-backfill legacy image input.

## Production Configuration

Render backend:

```text
NODE_ENV=production
DATABASE_DRIVER=postgres
DATABASE_URL=postgresql://...
DATABASE_POOL_MAX=3
DATABASE_SSL=true
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=...
R2_BUCKET=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
QUESTION_IMAGE_WEBP_QUALITY=88
JWT_SECRET=<at least 32 characters>
SESSION_COOKIE_NAME=abqoor_session
SESSION_COOKIE_SAMESITE=none
FRONTEND_ORIGIN=https://abqoor-web.vercel.app
```

Use the Supabase dashboard connection string that is compatible with Render's network environment. Supavisor session mode is the recommended starting point for a persistent Node backend. Do not expose `DATABASE_URL` to the frontend.

Vercel frontend:

```text
VITE_API_URL=https://<render-api-host>
```

`R2_PUBLIC_BASE_URL` may be present but is intentionally unused while the bucket remains private and images are served through the API.

## Local Development

Local development defaults to SQLite unless `DATABASE_DRIVER=postgres` is set:

```text
DATABASE_DRIVER=sqlite
DATABASE_PATH=./data/abqoor.sqlite
```

SQLite remains only for local development, tests, and intentional migration tooling. Production fails fast unless `DATABASE_DRIVER=postgres` and `DATABASE_URL` are configured.

## PostgreSQL

The backend owns PostgreSQL schema initialization. Startup applies the schema migrations through one shared `pg` connection pool. Pool size is intentionally small for Render Free.

Structured data includes users, profiles, admin accounts, questions, source PDF metadata, import jobs, sessions, answers, exam attempts/results, and review-bank items. Timestamps are stored as ISO text strings to preserve the existing application-level date and timezone behavior.

## SQLite To PostgreSQL Migration

Run the migration intentionally after configuring a safe target `DATABASE_URL`:

```text
SQLITE_DATABASE_PATH=./data/abqoor.sqlite DATABASE_URL=postgresql://... npm run db:migrate-sqlite-to-postgres -w apps/api
```

The command:

- applies the PostgreSQL schema,
- copies rows in dependency order,
- preserves existing IDs and timestamps,
- upserts rows so it is safe to rerun,
- reports source and target row counts,
- never deletes or modifies the SQLite source file.

Do not run the migration against a disposable or production database by accident. Keep a SQLite backup until production has been verified.

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

Clients use `/question-images/:fileName`. The backend resolves the canonical question from PostgreSQL, reads `image_storage_key`, and streams the object with the correct content type.

Production does not serve arbitrary local fallback files for missing question records or missing stored objects. Development can still use legacy local images for compatibility.

## Backfill

Run only after R2 configuration is validated:

```text
npm run storage:backfill-images -w apps/api
```

The script uploads local legacy images to object storage, verifies each write, and updates database metadata only after successful storage. It is resumable and does not delete local images.

## R2 Smoke Test

Run before importing or backfilling production media:

```text
npm run storage:smoke-r2 -w apps/api
```

The smoke test writes, reads, copies, deletes, and verifies one generated temporary object. It must not be run without intended R2 credentials.

## Cutover And Rollback

Recommended cutover:

1. Create the Supabase project.
2. Copy the Supavisor/session-mode `DATABASE_URL`.
3. Run the SQLite-to-PostgreSQL migration against the target database.
4. Set Render `DATABASE_DRIVER=postgres` and `DATABASE_URL`.
5. Deploy the backend.
6. Verify health, login, admin, question loading, study sessions, progress, importer, and R2 image serving.
7. Keep the old SQLite file as a backup.

If the PostgreSQL deployment fails before accepting new writes, revert Render env/code to the previous known-good deployment and keep SQLite untouched. If PostgreSQL has accepted new production writes, rollback requires a deliberate data reconciliation plan; SQLite is no longer an automatic rollback source.
