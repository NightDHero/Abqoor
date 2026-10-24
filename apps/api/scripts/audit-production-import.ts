import "dotenv/config";
import pg from "pg";
import {
  parsePostgresSslMode,
  resolvePostgresConnectionConfig
} from "../src/database/postgres-tls.js";
import { runProductionImportAudit } from "../src/modules/admin/importer/production-import-audit.js";

const { Pool, types } = pg;

types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

const args = process.argv.slice(2);
if (!args.includes("--dry-run")) {
  throw new Error("This audit only runs with the explicit --dry-run flag.");
}

const jobIdArgument = args.find((argument) => argument.startsWith("--job-id="));
const jobId = jobIdArgument?.slice("--job-id=".length).trim() || undefined;
if (jobId && !/^[a-zA-Z0-9-]{1,128}$/.test(jobId)) {
  throw new Error("--job-id contains unsupported characters.");
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the read-only production import audit.");
}

const timeoutValue = Number(process.env.AUDIT_STATEMENT_TIMEOUT_MS ?? 15_000);
if (!Number.isSafeInteger(timeoutValue) || timeoutValue < 1_000 || timeoutValue > 60_000) {
  throw new Error("AUDIT_STATEMENT_TIMEOUT_MS must be an integer between 1000 and 60000.");
}

const legacySslDisabled = process.env.DATABASE_SSL?.trim().toLowerCase() === "false";
const connection = resolvePostgresConnectionConfig({
  caCertificate: process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n"),
  connectionString: databaseUrl,
  defaultMode: legacySslDisabled ? "disable" : "verify-full",
  enforceTls: process.env.NODE_ENV === "production",
  explicitMode: parsePostgresSslMode(process.env.DATABASE_SSL_MODE)
});

const pool = new Pool({
  application_name: "abqoor-read-only-import-audit",
  connectionTimeoutMillis: 10_000,
  connectionString: connection.connectionString,
  max: 1,
  ssl: connection.ssl
});

let client: pg.PoolClient | null = null;
let transactionStarted = false;

try {
  client = await pool.connect();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  transactionStarted = true;
  await client.query(`SET LOCAL statement_timeout = ${timeoutValue}`);
  await client.query("SET LOCAL lock_timeout = 3000");
  await client.query("SET LOCAL idle_in_transaction_session_timeout = 30000");

  const transactionState = await client.query<{ read_only: string }>(
    "SELECT current_setting('transaction_read_only') AS read_only"
  );
  if (transactionState.rows[0]?.read_only !== "on") {
    throw new Error("The database did not confirm a read-only transaction.");
  }

  const report = await runProductionImportAudit(client, { jobId });
  await client.query("ROLLBACK");
  transactionStarted = false;
  report.transaction.rolledBack = true;
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "audit_failed";
  console.error(JSON.stringify({
    error: "Production import audit failed without making changes.",
    code
  }));
  process.exitCode = 1;
} finally {
  if (client && transactionStarted) {
    await client.query("ROLLBACK").catch(() => undefined);
  }
  client?.release();
  await pool.end();
}

