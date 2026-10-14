import assert from "node:assert/strict";
import test from "node:test";
import {
  id,
  sql
} from "../src/database/postgres-migrations/013_question_image_storage_key.js";

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
