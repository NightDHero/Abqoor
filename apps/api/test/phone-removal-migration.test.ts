import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { initializeSqliteSchema } from "../src/database/sqlite-schema.js";

test("phone identity removal preserves existing users and unrelated account data", () => {
  const directory = mkdtempSync(join(tmpdir(), "abqoor-phone-removal-test-"));
  const database = new Database(join(directory, "legacy.sqlite"));

  try {
    database.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        email_verified_at TEXT,
        password_hash TEXT NOT NULL,
        phone_number TEXT,
        phone_verified_at TEXT,
        must_change_password INTEGER NOT NULL DEFAULT 0,
        session_version INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX idx_users_phone_number
        ON users(phone_number)
        WHERE phone_number IS NOT NULL;
      CREATE TABLE phone_verification_requests (
        id TEXT PRIMARY KEY,
        phone_number TEXT NOT NULL,
        purpose TEXT NOT NULL,
        user_id TEXT,
        created_at TEXT NOT NULL
      );
    `);
    database.prepare(`
      INSERT INTO users (
        id, email, email_verified_at, password_hash, phone_number,
        phone_verified_at, must_change_password, session_version,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "existing-user",
      "existing@example.com",
      "2026-01-01T00:00:00.000Z",
      "preserved-password-hash",
      "+966500000001",
      "2026-01-01T00:00:00.000Z",
      1,
      7,
      "2026-01-01T00:00:00.000Z",
      "2026-01-02T00:00:00.000Z"
    );

    initializeSqliteSchema(database);

    const columns = database.prepare("PRAGMA table_info(users)").all() as Array<{
      name: string;
    }>;
    assert.equal(columns.some(({ name }) => name === "phone_number"), false);
    assert.equal(columns.some(({ name }) => name === "phone_verified_at"), false);

    const obsoleteObjects = database.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE name IN ('phone_verification_requests', 'idx_users_phone_number')
    `).all();
    assert.deepEqual(obsoleteObjects, []);

    const user = database.prepare(`
      SELECT id, email, password_hash, must_change_password, session_version
      FROM users
      WHERE id = ?
    `).get("existing-user") as {
      email: string;
      id: string;
      must_change_password: number;
      password_hash: string;
      session_version: number;
    };
    assert.deepEqual(user, {
      email: "existing@example.com",
      id: "existing-user",
      must_change_password: 1,
      password_hash: "preserved-password-hash",
      session_version: 7
    });
  } finally {
    database.close();
    rmSync(directory, { force: true, recursive: true });
  }
});
