export type PersistentStoreName =
  | "assets"
  | "preparation"
  | "progress"
  | "queries";

export type PersistentAppCacheRecord<T = unknown> = {
  accessedAt: number;
  data: T;
  expiresAt: number;
  id: string;
  invalidated: boolean;
  key: string;
  scope: string;
  updatedAt: number;
  version: number;
};

const databaseName = "abqoor-runtime-cache";
const databaseVersion = 2;
const storeNames: PersistentStoreName[] = [
  "assets",
  "preparation",
  "progress",
  "queries"
];
let databasePromise: Promise<IDBDatabase | null> | null = null;

const openDatabase = () => {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(databaseName, databaseVersion);
    } catch {
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const database = request.result;
      for (const storeName of storeNames) {
        if (database.objectStoreNames.contains(storeName)) continue;
        const store = database.createObjectStore(storeName, { keyPath: "id" });
        store.createIndex("scope", "scope", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  return databasePromise;
};

const runRequest = async <T>(
  storeName: PersistentStoreName,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>
) => {
  const database = await openDatabase();
  if (!database) return null;

  return new Promise<T | null>((resolve) => {
    try {
      const transaction = database.transaction(storeName, mode);
      const request = createRequest(transaction.objectStore(storeName));
      let result: T | null = null;
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => resolve(null);
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => resolve(null);
      transaction.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

export const readPersistentAppCache = async <T>(
  storeName: PersistentStoreName
) => {
  const records = await runRequest(
    storeName,
    "readonly",
    (store) => store.getAll()
  );
  return (records ?? []) as PersistentAppCacheRecord<T>[];
};

export const readPersistentAppCacheScope = async <T>(
  storeName: PersistentStoreName,
  scope: string
) => {
  const records = await runRequest(
    storeName,
    "readonly",
    (store) => store.index("scope").getAll(scope)
  );
  return (records ?? []) as PersistentAppCacheRecord<T>[];
};

export const readPersistentAppCacheRecord = async <T>(
  storeName: PersistentStoreName,
  id: string
) => {
  const record = await runRequest(
    storeName,
    "readonly",
    (store) => store.get(id)
  );
  return (record ?? null) as PersistentAppCacheRecord<T> | null;
};

export const countPersistentAppCacheScope = async (
  storeName: PersistentStoreName,
  scope: string
) => {
  const count = await runRequest(
    storeName,
    "readonly",
    (store) => store.index("scope").count(scope)
  );
  return count ?? 0;
};

export const writePersistentAppCache = <T>(
  storeName: PersistentStoreName,
  record: PersistentAppCacheRecord<T>
) => runRequest(storeName, "readwrite", (store) => store.put(record))
  .then((result) => result !== null);

export const deletePersistentAppCache = (
  storeName: PersistentStoreName,
  id: string
) => runRequest(storeName, "readwrite", (store) => store.delete(id))
  .then(() => undefined);

