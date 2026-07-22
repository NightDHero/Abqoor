export const weeklyStudyHourOptions = [
  "less_than_3",
  "3_to_5",
  "5_to_10",
  "10_to_15",
  "more_than_15"
] as const;

export const weakerSectionOptions = [
  "quantitative",
  "verbal",
  "both"
] as const;

export const studyStylePreferenceOptions = [
  "short_daily",
  "longer_few_times_weekly",
  "no_preference"
] as const;

export const studyStrategyPreferenceOptions = [
  "weakness_first",
  "balanced",
  "fastest_highest_score"
] as const;

export type WeeklyStudyHours = (typeof weeklyStudyHourOptions)[number];
export type WeakerSection = (typeof weakerSectionOptions)[number];
export type StudyStylePreference =
  (typeof studyStylePreferenceOptions)[number];
export type StudyStrategyPreference =
  (typeof studyStrategyPreferenceOptions)[number];

export type StudentProfileRecord = {
  user_id: string;
  profile_completed: 0 | 1;
  target_score: number | null;
  has_exam_date: 0 | 1;
  exam_date: string | null;
  weekly_study_hours: WeeklyStudyHours | null;
  has_taken_qudurat: 0 | 1 | null;
  attempt_count: number | null;
  latest_score: number | null;
  weaker_section: WeakerSection | null;
  study_style_preference: StudyStylePreference | null;
  study_strategy_preference: StudyStrategyPreference | null;
  created_at: string;
  updated_at: string;
};

export type StudentProfile = {
  userId: string;
  profileCompleted: boolean;
  targetScore: number | null;
  hasExamDate: boolean;
  examDate: string | null;
  weeklyStudyHours: WeeklyStudyHours | null;
  hasTakenQudurat: boolean | null;
  attemptCount: number | null;
  latestScore: number | null;
  weakerSection: WeakerSection | null;
  studyStylePreference: StudyStylePreference | null;
  studyStrategyPreference: StudyStrategyPreference | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type UpdateStudentProfileInput = {
  targetScore: unknown;
  hasExamDate: unknown;
  examDate?: unknown;
  weeklyStudyHours: unknown;
  hasTakenQudurat: unknown;
  attemptCount?: unknown;
  latestScore?: unknown;
  weakerSection: unknown;
  studyStylePreference: unknown;
  studyStrategyPreference: unknown;
};

export const toStudentProfile = (
  userId: string,
  record: StudentProfileRecord | null
): StudentProfile => {
  if (!record) {
    return {
      attemptCount: null,
      createdAt: null,
      examDate: null,
      hasExamDate: false,
      hasTakenQudurat: null,
      latestScore: null,
      profileCompleted: false,
      studyStrategyPreference: null,
      studyStylePreference: null,
      targetScore: null,
      updatedAt: null,
      userId,
      weakerSection: null,
      weeklyStudyHours: null
    };
  }

  return {
    attemptCount: record.attempt_count,
    createdAt: record.created_at,
    examDate: record.exam_date,
    hasExamDate: record.has_exam_date === 1,
    hasTakenQudurat:
      record.has_taken_qudurat === null ? null : record.has_taken_qudurat === 1,
    latestScore: record.latest_score,
    profileCompleted: record.profile_completed === 1,
    studyStrategyPreference: record.study_strategy_preference,
    studyStylePreference: record.study_style_preference,
    targetScore: record.target_score,
    updatedAt: record.updated_at,
    userId: record.user_id,
    weakerSection: record.weaker_section,
    weeklyStudyHours: record.weekly_study_hours
  };
};
