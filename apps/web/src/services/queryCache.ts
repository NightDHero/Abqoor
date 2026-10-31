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
let generation = 0;
let scope = "anonymous";

const toScopedKey = (key: string) => `${scope}::${key}`;

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
  if (!entry) return null;

  entry.accessedAt = now;

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
  evictLeastRecentlyUsedEntry();
  return data;
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
};

export const clearQueryCache = () => {
  generation += 1;
  entries.clear();
  requests.clear();
  versions.clear();
};
