import type { StudyProgressResponse } from "../../types/session";

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
  const request = loader()
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
    for (const record of cache.records.values()) record.invalidated = true;
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
