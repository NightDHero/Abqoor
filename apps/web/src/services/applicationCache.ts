import {
  activateStudyProgressCache,
  prepareStudyProgressPersistence
} from "../features/career/studyProgressCache";
import {
  getQueryCacheScope,
  prepareQueryCachePersistence
} from "./queryCache";
import {
  activateQuestionAssetCache,
  prepareQuestionAssetCache
} from "./questionAssetCache";
import {
  activatePreparationManifest,
  preparePreparationManifestPersistence
} from "./preparationManifest";

let preparation: Promise<void> | null = null;

export const prepareApplicationCache = () => {
  if (!preparation) {
    preparation = Promise.all([
      prepareQueryCachePersistence(),
      prepareQuestionAssetCache(),
      preparePreparationManifestPersistence(),
      prepareStudyProgressPersistence()
    ]).then(() => undefined);
  }
  return preparation;
};

export const activateApplicationCache = (userId: string | null) => {
  activateStudyProgressCache(userId);
  const scope = userId ? getQueryCacheScope() : "anonymous";
  activatePreparationManifest(scope);
  return activateQuestionAssetCache(scope);
};

