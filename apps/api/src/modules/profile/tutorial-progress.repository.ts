import { db } from "../../database/client.js";

export const tutorialStatuses = [
  "not_started",
  "in_progress",
  "dismissed",
  "completed"
] as const;

export type TutorialStatus = (typeof tutorialStatuses)[number];

export type TutorialProgressRecord = {
  completed_at: string | null;
  created_at: string;
  current_step: number;
  dismissed_at: string | null;
  status: TutorialStatus;
  updated_at: string;
  user_id: string;
};

export const findTutorialProgress = async (userId: string) =>
  (await db.prepare<{ userId: string }, TutorialProgressRecord>(`
    SELECT user_id, status, current_step, completed_at, dismissed_at, created_at, updated_at
    FROM user_tutorial_progress
    WHERE user_id = @userId
  `).get({ userId })) ?? null;

export const upsertTutorialProgress = async (input: {
  completedAt: string | null;
  currentStep: number;
  dismissedAt: string | null;
  status: TutorialStatus;
  updatedAt: string;
  userId: string;
}) => {
  await db.prepare(`
    INSERT INTO user_tutorial_progress (
      user_id, status, current_step, completed_at, dismissed_at, created_at, updated_at
    ) VALUES (
      @userId, @status, @currentStep, @completedAt, @dismissedAt, @updatedAt, @updatedAt
    )
    ON CONFLICT(user_id) DO UPDATE SET
      status = excluded.status,
      current_step = excluded.current_step,
      completed_at = excluded.completed_at,
      dismissed_at = excluded.dismissed_at,
      updated_at = excluded.updated_at
  `).run(input);

  return findTutorialProgress(input.userId);
};
