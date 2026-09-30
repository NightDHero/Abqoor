import { db } from "../../database/client.js";
import type { StudyRestDay } from "../banks/bank-config.js";
import type { StudentProfileRecord, WeakerSection } from "./profile.types.js";

const findProfileByUserIdStatement = db.prepare<string, StudentProfileRecord>(`
  SELECT user_id, username, profile_completed, target_score, has_exam_date,
    exam_date, has_taken_qudurat, attempt_count, latest_score, weaker_section,
    study_plan_start_date, weekly_rest_days_json, study_plan_bank_count,
    study_plan_study_days, study_plan_calendar_days, study_plan_completion_date,
    created_at, updated_at
  FROM student_profiles
  WHERE user_id = ?
`);

const upsertProfileStatement = db.prepare(`
  INSERT INTO student_profiles (
    user_id, username, profile_completed, target_score, has_exam_date, exam_date,
    has_taken_qudurat, attempt_count, latest_score, weaker_section,
    study_plan_start_date, weekly_rest_days_json, study_plan_bank_count,
    study_plan_study_days, study_plan_calendar_days, study_plan_completion_date,
    created_at, updated_at
  )
  VALUES (
    @userId, @username, @profileCompleted, @targetScore, @hasExamDate, @examDate,
    @hasTakenQudurat, @attemptCount, @latestScore, @weakerSection,
    @studyPlanStartDate, @weeklyRestDaysJson, @studyPlanBankCount,
    @studyPlanStudyDays, @studyPlanCalendarDays, @studyPlanCompletionDate,
    @createdAt, @updatedAt
  )
  ON CONFLICT(user_id) DO UPDATE SET
    username = excluded.username,
    profile_completed = excluded.profile_completed,
    target_score = excluded.target_score,
    has_exam_date = excluded.has_exam_date,
    exam_date = excluded.exam_date,
    has_taken_qudurat = excluded.has_taken_qudurat,
    attempt_count = excluded.attempt_count,
    latest_score = excluded.latest_score,
    weaker_section = excluded.weaker_section,
    study_plan_start_date = excluded.study_plan_start_date,
    weekly_rest_days_json = excluded.weekly_rest_days_json,
    study_plan_bank_count = excluded.study_plan_bank_count,
    study_plan_study_days = excluded.study_plan_study_days,
    study_plan_calendar_days = excluded.study_plan_calendar_days,
    study_plan_completion_date = excluded.study_plan_completion_date,
    updated_at = excluded.updated_at
`);

const findProfileByUsernameStatement = db.prepare<
  { userId: string; username: string },
  { user_id: string }
>(`
  SELECT user_id FROM student_profiles
  WHERE username = @username COLLATE NOCASE AND user_id <> @userId
`);

export const findStudentProfileByUserId = async (userId: string) =>
  (await findProfileByUserIdStatement.get(userId)) ?? null;

export const isStudentProfileCompleted = async (userId: string) => {
  const profile = await findStudentProfileByUserId(userId);
  return profile?.profile_completed === 1 && Boolean(profile.username);
};

export const getStudentProfileIdentity = async (userId: string) => {
  const profile = await findStudentProfileByUserId(userId);
  return {
    profileCompleted:
      profile?.profile_completed === 1 && Boolean(profile.username),
    username: profile?.username ?? null
  };
};

export const isUsernameAvailable = async (username: string, userId: string) =>
  !(await findProfileByUsernameStatement.get({ userId, username }));

export const upsertStudentProfile = async (input: {
  attemptCount: number | null;
  examDate: string | null;
  hasExamDate: boolean;
  hasTakenQudurat: boolean;
  latestScore: number | null;
  studyPlanBankCount: number;
  studyPlanCalendarDays: number;
  studyPlanCompletionDate: string;
  studyPlanStartDate: string;
  studyPlanStudyDays: number;
  targetScore: number;
  userId: string;
  username: string;
  weakerSection: WeakerSection;
  weeklyRestDays: StudyRestDay[];
}) => {
  const now = new Date().toISOString();
  const existing = await findStudentProfileByUserId(input.userId);

  await upsertProfileStatement.run({
    attemptCount: input.attemptCount,
    createdAt: existing?.created_at ?? now,
    examDate: input.examDate,
    hasExamDate: input.hasExamDate ? 1 : 0,
    hasTakenQudurat: input.hasTakenQudurat ? 1 : 0,
    latestScore: input.latestScore,
    profileCompleted: 1,
    studyPlanBankCount: input.studyPlanBankCount,
    studyPlanCalendarDays: input.studyPlanCalendarDays,
    studyPlanCompletionDate: input.studyPlanCompletionDate,
    studyPlanStartDate: input.studyPlanStartDate,
    studyPlanStudyDays: input.studyPlanStudyDays,
    targetScore: input.targetScore,
    updatedAt: now,
    userId: input.userId,
    username: input.username,
    weakerSection: input.weakerSection,
    weeklyRestDaysJson: JSON.stringify(input.weeklyRestDays)
  });

  return findStudentProfileByUserId(input.userId);
};
