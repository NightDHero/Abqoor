import type { StudyProgressResponse } from "../../types/session";
import {
  deletePersistentAppCache,
  readPersistentAppCache,
  readPersistentAppCacheRecord,
  writePersistentAppCache,
  type PersistentAppCacheRecord
} from "../../services/persistentAppCache";

export const studyProgressFreshnessMs = 60_000;

type CacheRecord = {
  accessedAt: number;
  data: StudyProgressResponse;
  invalidated: boolean;
  updatedAt: number;
};

type UserCache = {
  records: Map<string, CacheRecord>;
  requests: Map<string, Promise<StudyProgressResponse>>;
};

const cacheByUser = new Map<string, UserCache>();
const generationByUser = new Map<string, number>();
export const studyProgressMaximumEntriesPerUser = 8;
const studyProgressPersistentTtlMs = 24 * 60 * 60_000;
const studyProgressPersistentVersion = 1;
const persistentRecords = new Map<
  string,
  PersistentAppCacheRecord<StudyProgressResponse>
>();
let persistencePromise: Promise<void> | null = null;

const getGeneration = (userId: string) => generationByUser.get(userId) ?? 0;

const advanceGeneration = (userId: string) => {
  generationByUser.set(userId, getGeneration(userId) + 1);
};

const getUserCache = (userId: string) => {
  let cache = cacheByUser.get(userId);
  if (!cache) {
    cache = { records: new Map(), requests: new Map() };
    cacheByUser.set(userId, cache);
  }
  return cache;
};

const toPersistentScope = (userId: string) => `user:${userId}`;
const toPersistentId = (userId: string, cacheKey: string) =>
  `${toPersistentScope(userId)}::${cacheKey}`;

const enforcePersistentProgressBudget = (userId: string) => {
  const records = [...persistentRecords.values()]
    .filter((record) => record.scope === toPersistentScope(userId))
    .sort((left, right) => left.accessedAt - right.accessedAt);

  while (records.length > studyProgressMaximumEntriesPerUser) {
    const record = records.shift();
    if (!record) break;
    persistentRecords.delete(record.id);
    deletePersistentAppCache("progress", record.id);
  }
};

export const prepareStudyProgressPersistence = () => {
  if (persistencePromise) return persistencePromise;

  persistencePromise = readPersistentAppCache<StudyProgressResponse>("progress")
    .then((records) => {
      const now = Date.now();
      for (const record of records) {
        if (
          record.version !== studyProgressPersistentVersion ||
          record.expiresAt <= now ||
          !record.scope.startsWith("user:")
        ) {
          deletePersistentAppCache("progress", record.id);
          continue;
        }
        persistentRecords.set(record.id, record);
      }
      const userIds = new Set(
        [...persistentRecords.values()].map((record) => record.scope.slice("user:".length))
      );
      for (const userId of userIds) enforcePersistentProgressBudget(userId);
    });

  return persistencePromise;
};

export const activateStudyProgressCache = (userId: string | null) => {
  cacheByUser.clear();
  if (!userId) return;

  const cache = getUserCache(userId);
  const now = Date.now();
  const records = [...persistentRecords.values()]
    .filter((record) => record.scope === toPersistentScope(userId))
    .sort((left, right) => right.accessedAt - left.accessedAt)
    .slice(0, studyProgressMaximumEntriesPerUser);

  for (const record of records) {
    cache.records.set(record.key, {
      accessedAt: now,
      data: record.data,
      invalidated: record.invalidated,
      updatedAt: record.updatedAt
    });
  }
};

export const getStudyProgressCacheKey = (
  timeZone: string,
  month?: string
) => `${timeZone}::${month ?? "current"}`;

export const readStudyProgressCache = (
  userId: string,
  cacheKey: string,
  now = Date.now()
) => {
  const record = cacheByUser.get(userId)?.records.get(cacheKey);
  if (!record) return null;
  record.accessedAt = now;
  const persistentRecord = persistentRecords.get(toPersistentId(userId, cacheKey));
  if (persistentRecord) {
    persistentRecord.accessedAt = now;
    writePersistentAppCache("progress", persistentRecord);
  }

  return {
    data: record.data,
    isStale:
      record.invalidated || now - record.updatedAt >= studyProgressFreshnessMs
  };
};

export const writeStudyProgressCache = (
  userId: string,
  cacheKey: string,
  data: StudyProgressResponse,
  now = Date.now()
) => {
  const records = getUserCache(userId).records;
  records.set(cacheKey, {
    accessedAt: now,
    data,
    invalidated: false,
    updatedAt: now
  });

  while (records.size > studyProgressMaximumEntriesPerUser) {
    let oldestKey = "";
    let oldestAccess = Number.POSITIVE_INFINITY;
    for (const [key, record] of records) {
      if (record.accessedAt < oldestAccess) {
        oldestAccess = record.accessedAt;
        oldestKey = key;
      }
    }
    if (!oldestKey) break;
    records.delete(oldestKey);
  }

  const id = toPersistentId(userId, cacheKey);
  const record: PersistentAppCacheRecord<StudyProgressResponse> = {
    accessedAt: now,
    data,
    expiresAt: now + studyProgressPersistentTtlMs,
    id,
    invalidated: false,
    key: cacheKey,
    scope: toPersistentScope(userId),
    updatedAt: now,
    version: studyProgressPersistentVersion
  };
  persistentRecords.set(id, record);
  void writePersistentAppCache("progress", record);
  enforcePersistentProgressBudget(userId);
};

export const persistStudyProgressCacheEntry = async (
  userId: string,
  cacheKey: string
) => {
  const id = toPersistentId(userId, cacheKey);
  const record = persistentRecords.get(id);
  if (!record || !(await writePersistentAppCache("progress", record))) {
    return false;
  }
  const persisted = await readPersistentAppCacheRecord<StudyProgressResponse>(
    "progress",
    id
  );
  return Boolean(
    persisted &&
    persisted.scope === toPersistentScope(userId) &&
    persisted.key === cacheKey &&
    persisted.version === studyProgressPersistentVersion
  );
};

export const loadStudyProgressCache = (
  userId: string,
  cacheKey: string,
  loader: () => Promise<StudyProgressResponse>
) => {
  const userCache = getUserCache(userId);
  const pendingRequest = userCache.requests.get(cacheKey);
  if (pendingRequest) return pendingRequest;

  const requestGeneration = getGeneration(userId);
  const request = Promise.resolve()
    .then(loader)
    .then((data) => {
      if (getGeneration(userId) === requestGeneration) {
        writeStudyProgressCache(userId, cacheKey, data);
      }
      return data;
    })
    .finally(() => {
      if (userCache.requests.get(cacheKey) === request) {
        userCache.requests.delete(cacheKey);
      }
    });
  userCache.requests.set(cacheKey, request);
  return request;
};

export const invalidateStudyProgressCache = (userId?: string) => {
  const entries: Array<[string, UserCache]> = userId
    ? cacheByUser.has(userId)
      ? [[userId, cacheByUser.get(userId)!]]
      : []
    : [...cacheByUser.entries()];

  for (const [cachedUserId, cache] of entries) {
    advanceGeneration(cachedUserId);
    cache.requests.clear();
    for (const [cacheKey, record] of cache.records) {
      record.invalidated = true;
      const persistentRecord = persistentRecords.get(
        toPersistentId(cachedUserId, cacheKey)
      );
      if (persistentRecord) {
        persistentRecord.invalidated = true;
        writePersistentAppCache("progress", persistentRecord);
      }
    }
  }
};

export const clearStudyProgressCache = (userId?: string) => {
  if (userId) {
    advanceGeneration(userId);
    cacheByUser.delete(userId);
    return;
  }
  for (const cachedUserId of cacheByUser.keys()) advanceGeneration(cachedUserId);
  cacheByUser.clear();
};
