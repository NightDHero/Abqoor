import "dotenv/config";
import Database from "better-sqlite3";
import pg from "pg";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import * as initialPostgresSchema from "../src/database/postgres-migrations/001_initial_schema.js";

const { Pool, types } = pg;

types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

type TableMigration = {
  name: string;
  conflictColumns: string[];
};

const sqlitePath = resolve(
  process.cwd(),
  process.env.SQLITE_DATABASE_PATH ?? process.env.DATABASE_PATH ?? "./data/abqoor.sqlite"
);
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!existsSync(sqlitePath)) {
  console.error(`SQLite database does not exist: ${sqlitePath}`);
  process.exit(1);
}

if (!databaseUrl) {
  console.error("DATABASE_URL is required to migrate data to PostgreSQL.");
  process.exit(1);
}

const tables: TableMigration[] = [
  { name: "users", conflictColumns: ["id"] },
  { name: "student_profiles", conflictColumns: ["user_id"] },
  { name: "admin_accounts", conflictColumns: ["user_id"] },
  { name: "source_pdfs", conflictColumns: ["id"] },
  { name: "questions", conflictColumns: ["id"] },
  { name: "import_jobs", conflictColumns: ["id"] },
  { name: "import_job_items", conflictColumns: ["import_job_id", "question_number"] },
  { name: "sessions", conflictColumns: ["session_id"] },
  { name: "session_answers", conflictColumns: ["session_id", "question_id"] },
  { name: "exam_results", conflictColumns: ["id"] },
  { name: "official_exams", conflictColumns: ["id"] },
  { name: "official_exam_sections", conflictColumns: ["exam_id", "section_number"] },
  {
    name: "official_exam_questions",
    conflictColumns: ["exam_id", "section_number", "position_in_section"]
  },
  { name: "official_exam_results", conflictColumns: ["id"] },
  { name: "review_items", conflictColumns: ["id"] }
];

const quoteIdentifier = (identifier: string) => {
  return `"${identifier.replaceAll('"', '""')}"`;
};

const source = new Database(sqlitePath, { readonly: true, fileMustExist: true });
source.pragma("foreign_keys = ON");

const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  ssl:
    process.env.DATABASE_SSL?.toLowerCase() === "false"
      ? undefined
      : { rejectUnauthorized: false }
});

const tableExists = (tableName: string) => {
  const row = source
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
    )
    .get(tableName) as { name: string } | undefined;

  return Boolean(row);
};

const readRows = (tableName: string) => {
  return source
    .prepare(`SELECT * FROM ${quoteIdentifier(tableName)}`)
    .all() as Array<Record<string, unknown>>;
};

const applyPostgresSchema = async (client: pg.PoolClient) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS database_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
  await client.query(initialPostgresSchema.sql);
  await client.query(
    `
      INSERT INTO database_migrations (id, applied_at)
      VALUES ($1, $2)
      ON CONFLICT(id) DO NOTHING
    `,
    [initialPostgresSchema.id, new Date().toISOString()]
  );
};

const upsertRows = async (
  client: pg.PoolClient,
  table: TableMigration,
  rows: Array<Record<string, unknown>>
) => {
  if (rows.length === 0) {
    return 0;
  }

  const columns = Object.keys(rows[0] ?? {});
  const updateColumns = columns.filter(
    (column) => !table.conflictColumns.includes(column)
  );
  const assignments =
    updateColumns.length > 0
      ? `DO UPDATE SET ${updateColumns
          .map(
            (column) =>
              `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`
          )
          .join(", ")}`
      : "DO NOTHING";
  const sql = `
    INSERT INTO ${quoteIdentifier(table.name)}
      (${columns.map(quoteIdentifier).join(", ")})
    VALUES
      (${columns.map((_column, index) => `$${index + 1}`).join(", ")})
    ON CONFLICT (${table.conflictColumns.map(quoteIdentifier).join(", ")})
    ${assignments}
  `;

  for (const row of rows) {
    await client.query(
      sql,
      columns.map((column) => row[column] ?? null)
    );
  }

  return rows.length;
};

const countPostgresRows = async (client: pg.PoolClient, tableName: string) => {
  const result = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(tableName)}`
  );
  return result.rows[0]?.count ?? 0;
};

const migrate = async () => {
  const client = await pool.connect();

  try {
    await applyPostgresSchema(client);
    await client.query("BEGIN");

    const summary: Array<{
      sourceRows: number;
      table: string;
      targetRows: number;
    }> = [];

    for (const table of tables) {
      if (!tableExists(table.name)) {
        console.warn(`Skipping missing SQLite table: ${table.name}`);
        continue;
      }

      const rows = readRows(table.name);
      await upsertRows(client, table, rows);
      summary.push({
        sourceRows: rows.length,
        table: table.name,
        targetRows: await countPostgresRows(client, table.name)
      });
    }

    await client.query("COMMIT");

    console.table(summary);
    console.log(
      "SQLite to PostgreSQL migration finished. The source SQLite file was not modified or deleted."
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};

try {
  await migrate();
} finally {
  source.close();
  await pool.end();
}
