import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  id,
  sql
} from "../src/database/postgres-migrations/013_question_image_storage_key.js";
import {
  id as repairId,
  sql as repairSql
} from "../src/database/postgres-migrations/015_admin_question_bank_schema_repair.js";

test("PostgreSQL migration repairs image_storage_key schema drift used by the admin question bank", () => {
  assert.equal(id, "013_question_image_storage_key");
  assert.match(
    sql,
    /ALTER TABLE questions\s+ADD COLUMN IF NOT EXISTS image_storage_key TEXT/i
  );
  assert.match(
    sql,
    /CREATE INDEX IF NOT EXISTS idx_questions_image_storage_key\s+ON questions\(image_storage_key\)/i
  );
});

test("PostgreSQL repair migration covers every column used by the admin question bank", () => {
  assert.equal(repairId, "015_admin_question_bank_schema_repair");
  for (const column of [
    "question_scope",
    "bank_id",
    "bank_question_number",
    "import_metadata_json",
    "image_storage_key"
  ]) {
    assert.match(repairSql, new RegExp(`ADD COLUMN IF NOT EXISTS ${column}`, "i"));
  }
  assert.match(repairSql, /ALTER TABLE import_job_items\s+ADD COLUMN IF NOT EXISTS question_id TEXT/i);
  assert.match(repairSql, /CREATE INDEX IF NOT EXISTS idx_import_job_items_question_id/i);
  assert.doesNotMatch(repairSql, /\b(?:DELETE|DROP|TRUNCATE|UPDATE)\b/i);
  for (const statement of repairSql.split(";").filter((value) => value.trim())) {
    assert.match(statement, /IF NOT EXISTS/i);
  }
});

test("PostgreSQL startup discovers migrations transactionally and records them after success", () => {
  const clientSource = readFileSync(
    resolve(import.meta.dirname, "../src/database/client.ts"),
    "utf8"
  );
  const appSource = readFileSync(
    resolve(import.meta.dirname, "../src/app.ts"),
    "utf8"
  );
  const importPosition = clientSource.indexOf("015_admin_question_bank_schema_repair.js");
  const migrationListPosition = clientSource.indexOf("adminQuestionBankSchemaRepair\n];");
  const beginPosition = clientSource.indexOf('client.query("BEGIN")');
  const lockPosition = clientSource.indexOf("LOCK TABLE database_migrations IN EXCLUSIVE MODE");
  const selectPosition = clientSource.indexOf("SELECT id FROM database_migrations");
  const migrationPosition = clientSource.indexOf("client.query(migration.sql)");
  const recordPosition = clientSource.indexOf("INSERT INTO database_migrations");
  const commitPosition = clientSource.indexOf('client.query("COMMIT")', migrationPosition);

  assert.ok(importPosition >= 0);
  assert.ok(migrationListPosition > importPosition);
  assert.ok(beginPosition >= 0 && beginPosition < lockPosition);
  assert.ok(lockPosition < selectPosition);
  assert.ok(selectPosition < migrationPosition);
  assert.ok(migrationPosition < recordPosition);
  assert.ok(recordPosition < commitPosition);
  assert.match(clientSource, /catch \(error\) \{\s*await client\.query\("ROLLBACK"\);\s*throw error;/s);
  assert.match(appSource, /await initializeDatabase\(\);\s*await recoverInterruptedImportJobs\(\);/s);
});
