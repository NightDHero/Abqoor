import { apiRequest } from "./http";
import { loadQuery, readQueryCache, writeQueryCache } from "./queryCache";

export type TutorialStatus =
  | "not_started"
  | "in_progress"
  | "dismissed"
  | "completed";

export type TutorialProgress = {
  completedAt: string | null;
  currentStep: number;
  dismissedAt: string | null;
  status: TutorialStatus;
  updatedAt: string | null;
};

type TutorialResponse = {
  tutorial: TutorialProgress;
};

const tutorialCacheKey = "profile:tutorial";
const tutorialCacheMaxAgeMs = 60_000;

export const tutorialService = {
  getCachedProgress: () =>
    readQueryCache<TutorialResponse>(tutorialCacheKey, tutorialCacheMaxAgeMs),
  getProgress: () => loadQuery({
    key: tutorialCacheKey,
    loader: () => apiRequest<TutorialResponse>("/profile/tutorial"),
    maxAgeMs: tutorialCacheMaxAgeMs
  }),
  saveProgress: (status: TutorialStatus, currentStep: number) =>
    apiRequest<TutorialResponse>("/profile/tutorial", {
      body: JSON.stringify({ currentStep, status }),
      method: "PUT"
    }).then((response) => writeQueryCache(tutorialCacheKey, response))
};
