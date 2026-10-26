import assert from "node:assert/strict";
import { test } from "node:test";
import {
  readPersistentReference,
  writePersistentReference
} from "../src/services/persistentReferenceCache.js";

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => { values.delete(key); },
    setItem: (key: string, value: string) => { values.set(key, value); },
    values
  };
};

const isConfig = (value: unknown): value is { count: number } =>
  Boolean(value && typeof value === "object" && typeof (value as { count?: unknown }).count === "number");

test("persists only versioned, unexpired reference data", () => {
  const storage = createStorage();
  writePersistentReference({
    data: { count: 48 },
    key: "banks",
    now: 1_000,
    storage,
    ttlMs: 500,
    version: 2
  });

  assert.deepEqual(readPersistentReference({
    key: "banks",
    now: 1_250,
    storage,
    validate: isConfig,
    version: 2
  }), {
    data: { count: 48 },
    storedAt: 1_000
  });
});

test("removes expired, incompatible, and malformed persistent entries", () => {
  const storage = createStorage();
  writePersistentReference({
    data: { count: 48 },
    key: "expired",
    now: 1_000,
    storage,
    ttlMs: 50,
    version: 1
  });
  assert.equal(readPersistentReference({
    key: "expired",
    now: 1_051,
    storage,
    validate: isConfig,
    version: 1
  }), null);
  assert.equal(storage.getItem("expired"), null);

  storage.setItem("wrong-version", JSON.stringify({
    expiresAt: 2_000,
    storedAt: 1_000,
    value: { count: 48 },
    version: 1
  }));
  assert.equal(readPersistentReference({
    key: "wrong-version",
    now: 1_100,
    storage,
    validate: isConfig,
    version: 2
  }), null);

  storage.setItem("malformed", "not-json");
  assert.equal(readPersistentReference({
    key: "malformed",
    now: 1_100,
    storage,
    validate: isConfig,
    version: 1
  }), null);
});
