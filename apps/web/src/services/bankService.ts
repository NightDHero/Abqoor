import type { BankConfig } from "../types/profile";
import { apiRequest } from "./http";
import { readPersistentReference, writePersistentReference } from "./persistentReferenceCache";
import { loadQuery, readQueryCache, writeQueryCache } from "./queryCache";

const bankConfigCacheKey = "banks:config";
const bankConfigCacheMaxAgeMs = 5 * 60_000;
const bankConfigPersistentKey = "abqoor:reference-cache:banks:v1";
const bankConfigPersistentVersion = 1;
const bankConfigPersistentTtlMs = 24 * 60 * 60_000;
let shouldRevalidatePersistentConfig = false;

const isBankConfigResponse = (value: unknown): value is { config: BankConfig } => {
  if (!value || typeof value !== "object") return false;
  const config = (value as { config?: Partial<BankConfig> }).config;
  return Boolean(
    config &&
    Number.isFinite(config.availableBankCount) &&
    Number.isFinite(config.mathQuestionsPerBank) &&
    Number.isFinite(config.verbalQuestionsPerBank) &&
    Number.isFinite(config.studyPaceBanksPerDay)
  );
};

const hydratePersistentConfig = () => {
  const cached = readQueryCache<{ config: BankConfig }>(
    bankConfigCacheKey,
    bankConfigCacheMaxAgeMs
  );
  if (cached) return;

  const persisted = readPersistentReference({
    key: bankConfigPersistentKey,
    validate: isBankConfigResponse,
    version: bankConfigPersistentVersion
  });
  if (!persisted) return;

  writeQueryCache(bankConfigCacheKey, persisted.data, persisted.storedAt);
  shouldRevalidatePersistentConfig = true;
};

const loadBankConfig = () => apiRequest<{ config: BankConfig }>("/banks/config")
  .then((response) => {
    writePersistentReference({
      data: response,
      key: bankConfigPersistentKey,
      ttlMs: bankConfigPersistentTtlMs,
      version: bankConfigPersistentVersion
    });
    return response;
  });

export const bankService = {
  getCachedConfig: () => {
    hydratePersistentConfig();
    return readQueryCache<{ config: BankConfig }>(
      bankConfigCacheKey,
      bankConfigCacheMaxAgeMs
    );
  },
  getConfig: () => {
    hydratePersistentConfig();
    const cached = readQueryCache<{ config: BankConfig }>(
      bankConfigCacheKey,
      bankConfigCacheMaxAgeMs
    );

    if (cached && shouldRevalidatePersistentConfig) {
      shouldRevalidatePersistentConfig = false;
      void loadQuery({
        force: true,
        key: bankConfigCacheKey,
        loader: loadBankConfig,
        maxAgeMs: bankConfigCacheMaxAgeMs
      }).catch(() => {
        shouldRevalidatePersistentConfig = true;
      });
      return Promise.resolve(cached.data);
    }

    return loadQuery({
      key: bankConfigCacheKey,
      loader: loadBankConfig,
      maxAgeMs: bankConfigCacheMaxAgeMs
    });
  }
};
