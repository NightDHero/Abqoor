import {
  deletePersistentAppCache,
  readPersistentAppCacheScope,
  writePersistentAppCache,
  type PersistentAppCacheRecord
} from "./persistentAppCache";

type QuestionAssetData = { blob: Blob; size: number };
type ActiveAsset = QuestionAssetData & { objectUrl: string };

const assetCacheVersion = 1;
const assetCacheTtlMs = 24 * 60 * 60_000;
const maximumAssetCountPerScope = 1_000;
const persistentAssets = new Map<
  string,
  PersistentAppCacheRecord<QuestionAssetData>
>();
const activeAssets = new Map<string, ActiveAsset>();
const pendingAssets = new Map<string, Promise<string | null>>();
let activeScope = "anonymous";
let persistencePromise: Promise<void> | null = null;
let activationPromise: Promise<void> = Promise.resolve();

const normalizeAssetKey = (source: string) => {
  try {
    const url = new URL(source, typeof location === "undefined" ? undefined : location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return source.split("?", 1)[0];
  }
};

const isQuestionImageSource = (source: string) => {
  try {
    return new URL(
      source,
      typeof location === "undefined" ? undefined : location.origin
    ).pathname.startsWith("/question-images/");
  } catch {
    return false;
  }
};

const toAssetId = (scope: string, key: string) => `${scope}::${key}`;

const revokeActiveAssets = () => {
  if (typeof URL !== "undefined" && "revokeObjectURL" in URL) {
    for (const asset of activeAssets.values()) URL.revokeObjectURL(asset.objectUrl);
  }
  activeAssets.clear();
};

const enforceAssetBudget = (scope: string) => {
  const records = [...persistentAssets.values()]
    .filter((record) => record.scope === scope)
    .sort((left, right) => left.accessedAt - right.accessedAt);
  while (records.length > maximumAssetCountPerScope) {
    const record = records.shift();
    if (!record) break;
    persistentAssets.delete(record.id);
    deletePersistentAppCache("assets", record.id);
    const active = activeAssets.get(record.key);
    if (active) {
      URL.revokeObjectURL(active.objectUrl);
      activeAssets.delete(record.key);
    }
  }
};

export const prepareQuestionAssetCache = () => {
  if (persistencePromise) return persistencePromise;

  persistencePromise = Promise.resolve();

  return persistencePromise;
};

export const activateQuestionAssetCache = (scope: string) => {
  activeScope = scope;
  revokeActiveAssets();
  persistentAssets.clear();
  if (
    !scope.startsWith("user:") ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    activationPromise = Promise.resolve();
    return activationPromise;
  }

  activationPromise = readPersistentAppCacheScope<QuestionAssetData>("assets", scope).then(
    (records) => {
      if (activeScope !== scope) return;
      const now = Date.now();
      for (const record of records) {
        if (
          record.version !== assetCacheVersion ||
          record.expiresAt <= now ||
          typeof Blob === "undefined" ||
          !(record.data?.blob instanceof Blob) ||
          !Number.isFinite(record.data.size)
        ) {
          deletePersistentAppCache("assets", record.id);
          continue;
        }
        persistentAssets.set(record.id, record);
        activeAssets.set(record.key, {
          ...record.data,
          objectUrl: URL.createObjectURL(record.data.blob)
        });
      }
      enforceAssetBudget(scope);
    }
  );
  return activationPromise;
};

export const waitForQuestionAssetCacheActivation = () => activationPromise;

export const getQuestionAssetCacheScope = () => activeScope;

export const getCachedQuestionAssetSource = (source: string) =>
  activeAssets.get(normalizeAssetKey(source))?.objectUrl ?? null;

export const isQuestionAssetPersisted = (source: string) =>
  persistentAssets.has(toAssetId(activeScope, normalizeAssetKey(source)));

export const cacheQuestionAsset = (source: string) => {
  if (!activeScope.startsWith("user:") || !isQuestionImageSource(source)) {
    return Promise.resolve(null);
  }

  const requestedScope = activeScope;
  const key = normalizeAssetKey(source);
  const pendingKey = toAssetId(requestedScope, key);
  const cached = activeAssets.get(key);
  if (cached) return Promise.resolve(cached.objectUrl);
  const pending = pendingAssets.get(pendingKey);
  if (pending) return pending;

  const request = fetch(source, { credentials: "include" })
    .then(async (response) => {
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
        return null;
      }
      const blob = await response.blob();
      if (blob.size <= 0 || blob.size > 8 * 1024 * 1024) return null;

      const now = Date.now();
      const record: PersistentAppCacheRecord<QuestionAssetData> = {
        accessedAt: now,
        data: { blob, size: blob.size },
        expiresAt: now + assetCacheTtlMs,
        id: toAssetId(requestedScope, key),
        invalidated: false,
        key,
        scope: requestedScope,
        updatedAt: now,
        version: assetCacheVersion
      };
      const wasPersisted = await writePersistentAppCache("assets", record);
      if (wasPersisted) persistentAssets.set(record.id, record);

      if (activeScope !== requestedScope) {
        enforceAssetBudget(requestedScope);
        return null;
      }
      const objectUrl = URL.createObjectURL(blob);
      activeAssets.set(key, { blob, objectUrl, size: blob.size });
      enforceAssetBudget(requestedScope);
      return activeAssets.get(key)?.objectUrl ?? null;
    })
    .catch(() => null)
    .finally(() => pendingAssets.delete(pendingKey));

  pendingAssets.set(pendingKey, request);
  return request;
};

