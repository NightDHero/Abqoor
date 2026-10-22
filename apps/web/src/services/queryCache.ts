type QueryCacheEntry = {
  data: unknown;
  invalidated: boolean;
  updatedAt: number;
};

const entries = new Map<string, QueryCacheEntry>();
const requests = new Map<string, Promise<unknown>>();
let generation = 0;

export const readQueryCache = <T>(
  key: string,
  maxAgeMs: number,
  now = Date.now()
) => {
  const entry = entries.get(key);
  if (!entry) return null;

  return {
    data: entry.data as T,
    isStale: entry.invalidated || now - entry.updatedAt >= maxAgeMs
  };
};

export const writeQueryCache = <T>(key: string, data: T, now = Date.now()) => {
  entries.set(key, { data, invalidated: false, updatedAt: now });
  return data;
};

export const updateQueryCache = <T>(
  key: string,
  update: (current: T | null) => T | null
) => {
  const next = update((entries.get(key)?.data as T | undefined) ?? null);
  if (next === null) {
    entries.delete(key);
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

  const pending = requests.get(input.key) as Promise<T> | undefined;
  if (pending) return pending;

  const requestGeneration = generation;
  const request = input.loader()
    .then((data) => {
      if (generation === requestGeneration) writeQueryCache(input.key, data);
      return data;
    })
    .finally(() => {
      if (requests.get(input.key) === request) requests.delete(input.key);
    });

  requests.set(input.key, request);
  return request;
};

export const invalidateQueries = (prefix: string) => {
  for (const [key, entry] of entries) {
    if (key.startsWith(prefix)) entry.invalidated = true;
  }
};

export const clearQueryCache = () => {
  generation += 1;
  entries.clear();
  requests.clear();
};
