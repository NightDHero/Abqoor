import {
  normalizeStoredStudyDays,
  type StudyRestDay
} from "../banks/bank-config.js";

export const weakerSectionOptions = ["quantitative", "verbal", "both"] as const;

export type WeakerSection = (typeof weakerSectionOptions)[number];

export type StudentProfileRecord = {
  user_id: string;
  username: string | null;
  profile_completed: 0 | 1;
  target_score: number | null;
  has_exam_date: 0 | 1;
  exam_date: string | null;
  has_taken_qudurat: 0 | 1 | null;
  attempt_count: number | null;
  latest_score: number | null;
  weaker_section: WeakerSection | null;
  study_plan_start_date: string | null;
  weekly_rest_days_json: string;
  weekly_rest_day: StudyRestDay;
  weekly_review_day: StudyRestDay;
  study_plan_bank_count: number | null;
  study_plan_study_days: number | null;
  study_plan_calendar_days: number | null;
  study_plan_completion_date: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentProfile = {
  userId: string;
  username: string | null;
  profileCompleted: boolean;
  targetScore: number | null;
  hasExamDate: boolean;
  examDate: string | null;
  hasTakenQudurat: boolean | null;
  attemptCount: number | null;
  latestScore: number | null;
  weakerSection: WeakerSection | null;
  studyPlanStartDate: string | null;
  weeklyRestDay: StudyRestDay;
  weeklyReviewDay: StudyRestDay;
  studyPlanBankCount: number | null;
  studyPlanStudyDays: number | null;
  studyPlanCalendarDays: number | null;
  studyPlanCompletionDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type UpdateStudentProfileInput = {
  username: unknown;
  targetScore: unknown;
  hasExamDate: unknown;
  examDate?: unknown;
  hasTakenQudurat: unknown;
  attemptCount?: unknown;
  latestScore?: unknown;
  weakerSection: unknown;
  studyPlanStartDate: unknown;
  studyPlanBankCount?: unknown;
  weeklyRestDay: unknown;
  weeklyReviewDay: unknown;
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
      studyPlanBankCount: null,
      studyPlanCalendarDays: null,
      studyPlanCompletionDate: null,
      studyPlanStartDate: null,
      studyPlanStudyDays: null,
      targetScore: null,
      updatedAt: null,
      userId,
      username: null,
      weakerSection: null,
      weeklyRestDay: 5,
      weeklyReviewDay: 6
    };
  }

  const storedSchedule = normalizeStoredStudyDays({
    restDay: record.weekly_rest_day,
    reviewDay: record.weekly_review_day
  });

  return {
    attemptCount: record.attempt_count,
    createdAt: record.created_at,
    examDate: record.exam_date,
    hasExamDate: record.has_exam_date === 1,
    hasTakenQudurat:
      record.has_taken_qudurat === null ? null : record.has_taken_qudurat === 1,
    latestScore: record.latest_score,
    profileCompleted: record.profile_completed === 1,
    studyPlanBankCount: record.study_plan_bank_count,
    studyPlanCalendarDays: record.study_plan_calendar_days,
    studyPlanCompletionDate: record.study_plan_completion_date,
    studyPlanStartDate: record.study_plan_start_date,
    studyPlanStudyDays: record.study_plan_study_days,
    targetScore: record.target_score,
    updatedAt: record.updated_at,
    userId: record.user_id,
    username: record.username,
    weakerSection: record.weaker_section,
    weeklyRestDay: storedSchedule.restDay,
    weeklyReviewDay: storedSchedule.reviewDay
  };
};
