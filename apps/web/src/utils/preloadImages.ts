import {
  getNetworkInformation,
  type NetworkInformationLike
} from "./networkPreferences";

const loadedSources = new Set<string>();
const pendingSources = new Map<string, Promise<void>>();

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

const preloadImage = (source: string) => {
  if (
    !source ||
    loadedSources.has(source) ||
    typeof Image === "undefined"
  ) {
    return Promise.resolve();
  }

  const pending = pendingSources.get(source);
  if (pending) return pending;

  const request = new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      loadedSources.add(source);
      resolve();
    };
    image.onerror = () => resolve();
    image.src = source;
  }).finally(() => {
    pendingSources.delete(source);
  });

  pendingSources.set(source, request);
  return request;
};

export const preloadImages = (
  sources: Array<string | null | undefined>,
  requestedLimit = 3
) => {
  const uniqueSources = [...new Set(sources.filter((source): source is string => Boolean(source)))];
  const limit = getImagePreloadLimit(requestedLimit);
  return Promise.allSettled(uniqueSources.slice(0, limit).map(preloadImage));
};

