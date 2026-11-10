import {
  getNetworkInformation,
  type NetworkInformationLike
} from "./networkPreferences";
import {
  cacheQuestionAsset,
  getQuestionAssetCacheScope,
  getCachedQuestionAssetSource,
  isQuestionAssetPersisted
} from "../services/questionAssetCache";

const loadedSources = new Set<string>();
const pendingSources = new Map<string, Promise<ImagePreloadResult>>();

export type ImagePreloadResult = {
  loaded: boolean;
  persisted: boolean;
  source: string;
};

const toScopedSource = (source: string) =>
  `${getQuestionAssetCacheScope()}::${source}`;

export const getImagePreloadLimit = (
  requestedLimit: number,
  connection: NetworkInformationLike | null = getNetworkInformation()
) => {
  if (connection?.saveData) return 0;
  if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") {
    return Math.min(requestedLimit, 1);
  }
  return requestedLimit;
};

const preloadImage = async (source: string, persist: boolean) => {
  const scopedSource = toScopedSource(source);
  if (
    !source ||
    typeof Image === "undefined"
  ) {
    return { loaded: false, persisted: false, source };
  }

  if (loadedSources.has(scopedSource)) {
    return {
      loaded: true,
      persisted: isQuestionAssetPersisted(source),
      source
    };
  }

  const pending = pendingSources.get(scopedSource);
  if (pending) return pending;

  const persistedSource = persist ? await cacheQuestionAsset(source) : null;
  const resolvedSource =
    persistedSource ?? getCachedQuestionAssetSource(source) ?? source;
  const request = new Promise<ImagePreloadResult>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      loadedSources.add(scopedSource);
      resolve({
        loaded: true,
        persisted: persist ? isQuestionAssetPersisted(source) : false,
        source
      });
    };
    image.onerror = () => resolve({ loaded: false, persisted: false, source });
    image.src = resolvedSource;
  }).finally(() => {
    pendingSources.delete(scopedSource);
  });

  pendingSources.set(scopedSource, request);
  return request;
};

export const preloadImages = (
  sources: Array<string | null | undefined>,
  requestedLimit = 3,
  options: { persist?: boolean; required?: boolean } = {}
) => {
  const uniqueSources = [...new Set(sources.filter((source): source is string => Boolean(source)))];
  const limit = options.required
    ? requestedLimit
    : getImagePreloadLimit(requestedLimit);
  return Promise.allSettled(
    uniqueSources
      .slice(0, limit)
      .map((source) => preloadImage(source, options.persist !== false))
  );
};

