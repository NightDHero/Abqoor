import type { BankConfig } from "../types/profile";
import { apiRequest } from "./http";
import { loadQuery, readQueryCache } from "./queryCache";

const bankConfigCacheKey = "banks:config";
const bankConfigCacheMaxAgeMs = 5 * 60_000;

export const bankService = {
  getCachedConfig: () =>
    readQueryCache<{ config: BankConfig }>(bankConfigCacheKey, bankConfigCacheMaxAgeMs),
  getConfig: () => loadQuery({
    key: bankConfigCacheKey,
    loader: () => apiRequest<{ config: BankConfig }>("/banks/config"),
    maxAgeMs: bankConfigCacheMaxAgeMs
  })
};
