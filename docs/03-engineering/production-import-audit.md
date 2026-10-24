# Production import audit

`apps/api/scripts/audit-production-import.ts` performs a strictly read-only
reconciliation of the reported completed question import.

## Safety guarantees

- Uses `DATABASE_URL` without logging it.
- Does not import the application database client, so it cannot run migrations.
- Opens `REPEATABLE READ READ ONLY` and verifies `transaction_read_only=on`.
- Applies transaction-local statement, lock, and idle timeouts.
- Executes only `SELECT`, transaction setup, and `ROLLBACK` statements.
- Rolls back after a successful audit and also attempts rollback after failures.
- Does not include users, students, credentials, or session data in its report.
- Has no write mode. The required `--dry-run` flag cannot be replaced with an
  apply or repair flag.

## Render Shell

Run from the repository root inside the Render API service:

```bash
npm run audit:production-import -w apps/api
```

The command discovers completed jobs matching 31 created, 2 replaced, 0
skipped, and 0 failed. It audits the job only when that match is unique.

If multiple jobs match, review the redacted candidate list and rerun with the
selected identifier:

```bash
npm run audit:production-import -w apps/api -- --job-id=<reviewed-job-id>
```

`AUDIT_STATEMENT_TIMEOUT_MS` is optional and defaults to 15000. Accepted values
are 1000 through 60000 milliseconds.

## Authorized environment without Render Shell

Use a PostgreSQL account granted read access only to `import_jobs`,
`import_job_items`, `questions`, and `question_banks`. Set the following values
in that environment, not in source control or chat:

- `DATABASE_URL`
- `DATABASE_SSL_MODE`
- `DATABASE_CA_CERT`, only when the configured TLS mode requires it
- `NODE_ENV=production`

Then run the same npm command. The script never prints the URL, credentials, or
certificate. A database-level read-only account is recommended as an additional
control beyond the read-only transaction.

The output is evidence only. It does not repair or re-import any question.

