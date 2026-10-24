import {
  findTutorialProgress,
  tutorialStatuses,
  upsertTutorialProgress,
  type TutorialProgressRecord,
  type TutorialStatus
} from "./tutorial-progress.repository.js";

export const productTutorialStepCount = 6;

export type TutorialProgress = {
  completedAt: string | null;
  currentStep: number;
  dismissedAt: string | null;
  status: TutorialStatus;
  updatedAt: string | null;
};

export class TutorialProgressError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
  }
}

const toTutorialProgress = (
  record: TutorialProgressRecord | null
): TutorialProgress => ({
  completedAt: record?.completed_at ?? null,
  currentStep: record?.current_step ?? 0,
  dismissedAt: record?.dismissed_at ?? null,
  status: record?.status ?? "not_started",
  updatedAt: record?.updated_at ?? null
});

export const getTutorialProgress = async (userId: string) =>
  toTutorialProgress(await findTutorialProgress(userId));

export const saveTutorialProgress = async (
  userId: string,
  input: { currentStep?: unknown; status?: unknown }
) => {
  if (
    typeof input.status !== "string" ||
    !tutorialStatuses.includes(input.status as TutorialStatus)
  ) {
    throw new TutorialProgressError("حالة الجولة التعريفية غير صالحة.");
  }

  if (
    typeof input.currentStep !== "number" ||
    !Number.isInteger(input.currentStep) ||
    input.currentStep < 0 ||
    input.currentStep >= productTutorialStepCount
  ) {
    throw new TutorialProgressError("خطوة الجولة التعريفية غير صالحة.");
  }

  const status = input.status as TutorialStatus;
  const now = new Date().toISOString();
  const existing = await findTutorialProgress(userId);
  const completedAt = status === "completed"
    ? existing?.completed_at ?? now
    : null;
  const dismissedAt = status === "dismissed" ? now : null;
  const record = await upsertTutorialProgress({
    completedAt,
    currentStep: input.currentStep,
    dismissedAt,
    status,
    updatedAt: now,
    userId
  });

  return toTutorialProgress(record);
};
