import { apiRequest } from "./http";

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

export const tutorialService = {
  getProgress: () => apiRequest<TutorialResponse>("/profile/tutorial"),
  saveProgress: (status: TutorialStatus, currentStep: number) =>
    apiRequest<TutorialResponse>("/profile/tutorial", {
      body: JSON.stringify({ currentStep, status }),
      method: "PUT"
    })
};
