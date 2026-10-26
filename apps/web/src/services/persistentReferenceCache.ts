type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

type PersistentReferenceEnvelope<T> = {
  expiresAt: number;
  storedAt: number;
  value: T;
  version: number;
};

const getBrowserStorage = (): StorageLike | null => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const readPersistentReference = <T>({
  key,
  now = Date.now(),
  storage = getBrowserStorage(),
  validate,
  version
}: {
  key: string;
  now?: number;
  storage?: StorageLike | null;
  validate: (value: unknown) => value is T;
  version: number;
}) => {
  if (!storage) return null;

  try {
    const serialized = storage.getItem(key);
    if (!serialized) return null;
    const envelope = JSON.parse(serialized) as Partial<PersistentReferenceEnvelope<unknown>>;

    if (
      envelope.version !== version ||
      typeof envelope.expiresAt !== "number" ||
      typeof envelope.storedAt !== "number" ||
      envelope.expiresAt <= now ||
      !validate(envelope.value)
    ) {
      storage.removeItem(key);
      return null;
    }

    return {
      data: envelope.value,
      storedAt: envelope.storedAt
    };
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Storage may be unavailable or blocked; memory caching remains usable.
    }
    return null;
  }
};

export const writePersistentReference = <T>({
  data,
  key,
  now = Date.now(),
  storage = getBrowserStorage(),
  ttlMs,
  version
}: {
  data: T;
  key: string;
  now?: number;
  storage?: StorageLike | null;
  ttlMs: number;
  version: number;
}) => {
  if (!storage) return;

  try {
    storage.setItem(
      key,
      JSON.stringify({
        expiresAt: now + ttlMs,
        storedAt: now,
        value: data,
        version
      } satisfies PersistentReferenceEnvelope<T>)
    );
  } catch {
    // A storage quota/privacy failure must not affect the live application.
  }
};
