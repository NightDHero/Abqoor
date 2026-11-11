import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { initializeSqliteSchema } from "../src/database/sqlite-schema.js";

test("SQLite adds archive columns before creating their index on an existing database", () => {
  const directory = mkdtempSync(join(tmpdir(), "abqoor-sqlite-archive-migration-"));
  const database = new Database(join(directory, "legacy.sqlite"));
  try {
    database.exec(`
      CREATE TABLE questions (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        topic TEXT NOT NULL,
        subtopic TEXT,
        difficulty INTEGER NOT NULL
      );
    `);

    initializeSqliteSchema(database);
    initializeSqliteSchema(database);

    const columns = database.prepare("PRAGMA table_info(questions)").all() as Array<{
      name: string;
    }>;
    const indexes = database.prepare("PRAGMA index_list(questions)").all() as Array<{
      name: string;
    }>;
    assert.equal(columns.some((column) => column.name === "archived_at"), true);
    assert.equal(columns.some((column) => column.name === "archived_by"), true);
    assert.equal(
      indexes.some((index) => index.name === "idx_questions_archived_at"),
      true
    );
  } finally {
    database.close();
    rmSync(directory, { force: true, recursive: true });
  }
});
