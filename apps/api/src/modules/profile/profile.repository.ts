import { db } from "../../database/client.js";
import type {
  StudentProfileRecord,
  StudyStrategyPreference,
  StudyStylePreference,
  WeakerSection,
  WeeklyStudyHours
} from "./profile.types.js";

const findProfileByUserIdStatement = db.prepare<string, StudentProfileRecord>(`
  SELECT
    user_id,
    profile_completed,
    target_score,
    has_exam_date,
    exam_date,
    weekly_study_hours,
    has_taken_qudurat,
    attempt_count,
    latest_score,
    weaker_section,
    study_style_preference,
    study_strategy_preference,
    created_at,
    updated_at
  FROM student_profiles
  WHERE user_id = ?
`);

const upsertProfileStatement = db.prepare(`
  INSERT INTO student_profiles (
    user_id,
    profile_completed,
    target_score,
    has_exam_date,
    exam_date,
    weekly_study_hours,
    has_taken_qudurat,
    attempt_count,
    latest_score,
    weaker_section,
    study_style_preference,
    study_strategy_preference,
    created_at,
    updated_at
  )
  VALUES (
    @userId,
    @profileCompleted,
    @targetScore,
    @hasExamDate,
    @examDate,
    @weeklyStudyHours,
    @hasTakenQudurat,
    @attemptCount,
    @latestScore,
    @weakerSection,
    @studyStylePreference,
    @studyStrategyPreference,
    @createdAt,
    @updatedAt
  )
  ON CONFLICT(user_id) DO UPDATE SET
    profile_completed = excluded.profile_completed,
    target_score = excluded.target_score,
    has_exam_date = excluded.has_exam_date,
    exam_date = excluded.exam_date,
    weekly_study_hours = excluded.weekly_study_hours,
    has_taken_qudurat = excluded.has_taken_qudurat,
    attempt_count = excluded.attempt_count,
    latest_score = excluded.latest_score,
    weaker_section = excluded.weaker_section,
    study_style_preference = excluded.study_style_preference,
    study_strategy_preference = excluded.study_strategy_preference,
    updated_at = excluded.updated_at
`);

export const findStudentProfileByUserId = (userId: string) => {
  return findProfileByUserIdStatement.get(userId) ?? null;
};

export const isStudentProfileCompleted = (userId: string) => {
  return findStudentProfileByUserId(userId)?.profile_completed === 1;
};

export const upsertStudentProfile = (input: {
  attemptCount: number | null;
  examDate: string | null;
  hasExamDate: boolean;
  hasTakenQudurat: boolean;
  latestScore: number | null;
  studyStrategyPreference: StudyStrategyPreference;
  studyStylePreference: StudyStylePreference;
  targetScore: number;
  userId: string;
  weakerSection: WeakerSection;
  weeklyStudyHours: WeeklyStudyHours;
}) => {
  const now = new Date().toISOString();
  const existing = findStudentProfileByUserId(input.userId);

  upsertProfileStatement.run({
    attemptCount: input.attemptCount,
    createdAt: existing?.created_at ?? now,
    examDate: input.examDate,
    hasExamDate: input.hasExamDate ? 1 : 0,
    hasTakenQudurat: input.hasTakenQudurat ? 1 : 0,
    latestScore: input.latestScore,
    profileCompleted: 1,
    studyStrategyPreference: input.studyStrategyPreference,
    studyStylePreference: input.studyStylePreference,
    targetScore: input.targetScore,
    updatedAt: now,
    userId: input.userId,
    weakerSection: input.weakerSection,
    weeklyStudyHours: input.weeklyStudyHours
  });

  return findStudentProfileByUserId(input.userId);
};
