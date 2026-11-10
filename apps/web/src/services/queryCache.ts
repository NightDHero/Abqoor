import {
  deletePersistentAppCache,
  readPersistentAppCache,
  readPersistentAppCacheRecord,
  writePersistentAppCache,
  type PersistentAppCacheRecord
} from "./persistentAppCache";
import { recordPerformanceCache } from "./performanceTelemetry";

type QueryCacheEntry = {
  accessedAt: number;
  data: unknown;
  invalidated: boolean;
  updatedAt: number;
};

const entries = new Map<string, QueryCacheEntry>();
const requests = new Map<string, Promise<unknown>>();
const versions = new Map<string, number>();
const maximumCacheEntries = 180;
const maximumPersistentEntriesPerScope = 120;
let generation = 0;
let scope = "anonymous";
const persistentEntries = new Map<string, PersistentAppCacheRecord>();
let persistenceReady = false;
let persistencePromise: Promise<void> | null = null;

type PersistentPolicy = { ttlMs: number; version: number };

const getPersistentPolicy = (key: string): PersistentPolicy | null => {
  if (key.startsWith("questions:")) {
    return { ttlMs: 12 * 60 * 60_000, version: 2 };
  }
  if (key.startsWith("question-browser-state:")) {
    return { ttlMs: 7 * 24 * 60 * 60_000, version: 1 };
  }
  if (key === "profile:current") {
    return { ttlMs: 24 * 60 * 60_000, version: 1 };
  }
  if (key === "review:bank") {
    return { ttlMs: 24 * 60 * 60_000, version: 1 };
  }
  if (key === "banks:config" || key === "profile:tutorial") {
    return { ttlMs: 24 * 60 * 60_000, version: 1 };
  }
  if (key.startsWith("profile:schedule-preview:")) {
    return { ttlMs: 2 * 60 * 60_000, version: 1 };
  }
  if (key === "exams:structure" || key === "exams:history") {
    return { ttlMs: 60 * 60_000, version: 1 };
  }
  if (key.startsWith("admin:")) {
    return { ttlMs: 10 * 60_000, version: 1 };
  }
  if (key.startsWith("sessions:result:")) {
    return { ttlMs: 2 * 60 * 60_000, version: 1 };
  }
  return null;
};

const toScopedKey = (key: string) => `${scope}::${key}`;

const isUserScope = (value: string) => value.startsWith("user:");

const hydratePersistentScope = (targetScope: string) => {
  if (!persistenceReady || !isUserScope(targetScope)) return;

  const now = Date.now();
  for (const record of persistentEntries.values()) {
    if (record.scope !== targetScope || record.expiresAt <= now) continue;
    entries.set(record.id, {
      accessedAt: now,
      data: record.data,
      invalidated: record.invalidated,
      updatedAt: record.updatedAt
    });
  }
  while (entries.size > maximumCacheEntries) evictLeastRecentlyUsedEntry();
};

const evictPersistentEntries = (targetScope: string) => {
  const scopedRecords = [...persistentEntries.values()]
    .filter((record) => record.scope === targetScope)
    .sort((left, right) => left.accessedAt - right.accessedAt);

  while (scopedRecords.length > maximumPersistentEntriesPerScope) {
    const record = scopedRecords.shift();
    if (!record) break;
    persistentEntries.delete(record.id);
    deletePersistentAppCache("queries", record.id);
  }
};

const persistEntry = (key: string, entry: QueryCacheEntry) => {
  const policy = getPersistentPolicy(key);
  if (!policy || !isUserScope(scope)) return Promise.resolve(false);

  const id = toScopedKey(key);
  const record: PersistentAppCacheRecord = {
    accessedAt: entry.accessedAt,
    data: entry.data,
    expiresAt: entry.updatedAt + policy.ttlMs,
    id,
    invalidated: entry.invalidated,
    key,
    scope,
    updatedAt: entry.updatedAt,
    version: policy.version
  };
  persistentEntries.set(id, record);
  const persisted = writePersistentAppCache("queries", record);
  evictPersistentEntries(scope);
  return persisted;
};

export const prepareQueryCachePersistence = () => {
  if (persistencePromise) return persistencePromise;

  persistencePromise = readPersistentAppCache("queries").then((records) => {
    const now = Date.now();
    for (const record of records) {
      const policy = getPersistentPolicy(record.key);
      if (
        !policy ||
        !isUserScope(record.scope) ||
        record.version !== policy.version ||
        record.expiresAt <= now
      ) {
        deletePersistentAppCache("queries", record.id);
        continue;
      }
      persistentEntries.set(record.id, record);
    }
    persistenceReady = true;
    hydratePersistentScope(scope);
  });

  return persistencePromise;
};

const getVersion = (key: string) => versions.get(key) ?? 0;

const advanceVersion = (key: string) => {
  versions.set(key, getVersion(key) + 1);
};

const evictLeastRecentlyUsedEntry = () => {
  if (entries.size <= maximumCacheEntries) return;

  let oldestKey = "";
  let oldestAccess = Number.POSITIVE_INFINITY;

  for (const [key, entry] of entries) {
    if (entry.accessedAt < oldestAccess) {
      oldestAccess = entry.accessedAt;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    entries.delete(oldestKey);
    versions.delete(oldestKey);
  }
};

export const readQueryCache = <T>(
  key: string,
  maxAgeMs: number,
  now = Date.now()
) => {
  const scopedKey = toScopedKey(key);
  const entry = entries.get(scopedKey);
  if (!entry) {
    recordPerformanceCache(false);
    return null;
  }

  entry.accessedAt = now;
  const persistentEntry = persistentEntries.get(scopedKey);
  if (persistentEntry) {
    persistentEntry.accessedAt = now;
    writePersistentAppCache("queries", persistentEntry);
  }
  recordPerformanceCache(true);

  return {
    data: entry.data as T,
    isStale: entry.invalidated || now - entry.updatedAt >= maxAgeMs
  };
};

export const writeQueryCache = <T>(key: string, data: T, now = Date.now()) => {
  const scopedKey = toScopedKey(key);
  advanceVersion(scopedKey);
  entries.set(scopedKey, {
    accessedAt: now,
    data,
    invalidated: false,
    updatedAt: now
  });
  void persistEntry(key, entries.get(scopedKey)!);
  evictLeastRecentlyUsedEntry();
  return data;
};

export const persistQueryCacheEntry = async (key: string) => {
  const scopedKey = toScopedKey(key);
  const entry = entries.get(scopedKey);
  if (!entry) return false;
  if (!(await persistEntry(key, entry))) return false;

  const persisted = await readPersistentAppCacheRecord("queries", scopedKey);
  return Boolean(
    persisted &&
    persisted.scope === scope &&
    persisted.key === key &&
    persisted.version === getPersistentPolicy(key)?.version
  );
};

export const readPersistedQueryCacheData = async <T>(key: string) => {
  const record = await readPersistentAppCacheRecord<T>(
    "queries",
    toScopedKey(key)
  );
  return record?.scope === scope && record.key === key ? record.data : null;
};

export const updateQueryCache = <T>(
  key: string,
  update: (current: T | null) => T | null
) => {
  const scopedKey = toScopedKey(key);
  const next = update((entries.get(scopedKey)?.data as T | undefined) ?? null);
  if (next === null) {
    entries.delete(scopedKey);
    advanceVersion(scopedKey);
    return null;
  }
  return writeQueryCache(key, next);
};

export const loadQuery = <T>(input: {
  key: string;
  loader: () => Promise<T>;
  maxAgeMs: number;
  force?: boolean;
}) => {
  const cached = readQueryCache<T>(input.key, input.maxAgeMs);
  if (!input.force && cached && !cached.isStale) {
    return Promise.resolve(cached.data);
  }

  const scopedKey = toScopedKey(input.key);
  const pending = requests.get(scopedKey) as Promise<T> | undefined;
  if (pending) return pending;

  const requestGeneration = generation;
  const requestVersion = getVersion(scopedKey);
  const request = Promise.resolve()
    .then(input.loader)
    .then((data) => {
      if (
        generation === requestGeneration &&
        getVersion(scopedKey) === requestVersion
      ) {
        writeQueryCache(input.key, data);
      }
      return data;
    })
    .finally(() => {
      if (requests.get(scopedKey) === request) requests.delete(scopedKey);
    });

  requests.set(scopedKey, request);
  return request;
};

export const invalidateQueries = (prefix: string) => {
  const scopedPrefix = toScopedKey(prefix);
  for (const [key, entry] of entries) {
    if (key.startsWith(scopedPrefix)) {
      entry.invalidated = true;
      advanceVersion(key);
      const unscopedKey = key.slice(`${scope}::`.length);
      persistEntry(unscopedKey, entry);
    }
  }
  for (const key of requests.keys()) {
    if (key.startsWith(scopedPrefix) && !entries.has(key)) {
      advanceVersion(key);
    }
  }
};

export const setQueryCacheScope = (nextScope: string) => {
  const normalizedScope = nextScope.trim() || "anonymous";
  if (normalizedScope === scope) return;

  scope = normalizedScope;
  clearQueryCache();
  hydratePersistentScope(scope);
};

export const getQueryCacheScope = () => scope;

export const clearQueryCache = () => {
  generation += 1;
  entries.clear();
  requests.clear();
  versions.clear();
};
