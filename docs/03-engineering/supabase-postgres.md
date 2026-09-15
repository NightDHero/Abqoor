# Supabase PostgreSQL Deployment

## Purpose

Abqoor production structured data runs on Supabase PostgreSQL so the Render API can stay on Free compute without a persistent disk. R2 remains the binary/object store for PDFs and question images.

## Connection String

Use Supabase Dashboard -> Connect and choose the connection string that works from hosted IPv4 environments. For the Render Node backend, prefer Supavisor session mode unless Supabase guidance for the selected project recommends otherwise.

Do not hardcode the host, project ref, username, or password in source code. Store the full connection string only in Render as `DATABASE_URL`.

## Render Variables

```text
NODE_ENV=production
DATABASE_DRIVER=postgres
DATABASE_URL=postgresql://...
DATABASE_POOL_MAX=3
DATABASE_SSL=true
FRONTEND_ORIGIN=https://abqoor-web.vercel.app
JWT_SECRET=<at least 32 chars>
SESSION_COOKIE_NAME=abqoor_session
SESSION_COOKIE_SAMESITE=none
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=...
R2_BUCKET=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
QUESTION_IMAGE_WEBP_QUALITY=88
```

`DATABASE_PATH` is not required in production.

## Vercel Variables

```text
VITE_API_URL=https://abqoor-1.onrender.com
```

Never add `DATABASE_URL`, R2 credentials, or `JWT_SECRET` to Vercel.

## Schema

The API applies PostgreSQL schema migrations at startup through the shared database client. Schema is idempotent and tracked in `database_migrations`.

## Migrating Existing SQLite Data

Run this intentionally from a trusted machine with access to the SQLite file:

```text
SQLITE_DATABASE_PATH=./data/abqoor.sqlite DATABASE_URL=postgresql://... npm run db:migrate-sqlite-to-postgres -w apps/api
```

The migration is safe to rerun. It preserves IDs and timestamps, upserts rows by primary/composite keys, and does not delete the SQLite file.

## Validation

After migration and deploy, verify:

- `/health`
- login and registration
- admin dashboard access
- question loading
- `/question-images/:questionId.webp`
- study session start/submit/result
- study progress calendar/streaks
- exam history and exam attempts
- admin import history/question bank
- source PDF protected download

Run `npm run storage:smoke-r2 -w apps/api` only when real R2 credentials are intentionally available.

## Security Notes

- Use parameterized SQL through `pg`.
- Keep `DATABASE_URL` backend-only.
- Keep Supabase Auth disabled/unrelated; Abqoor continues to use its existing bcrypt/JWT-cookie auth.
- Keep R2 private and API-served.
- Do not use wildcard CORS with credentials.
