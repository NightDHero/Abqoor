export type WeeklyStudyHours =
  | "less_than_3"
  | "3_to_5"
  | "5_to_10"
  | "10_to_15"
  | "more_than_15";

export type WeakerSection = "quantitative" | "verbal" | "both";

export type StudyStylePreference =
  | "short_daily"
  | "longer_few_times_weekly"
  | "no_preference";

export type StudyStrategyPreference =
  | "weakness_first"
  | "balanced"
  | "fastest_highest_score";

export type StudentProfile = {
  userId: string;
  username: string | null;
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

export type StudentProfileInput = {
  username: string;
  targetScore: number;
  hasExamDate: boolean;
  examDate: string | null;
  weeklyStudyHours: WeeklyStudyHours;
  hasTakenQudurat: boolean;
  attemptCount: number | null;
  latestScore: number | null;
  weakerSection: WeakerSection;
  studyStylePreference: StudyStylePreference;
  studyStrategyPreference: StudyStrategyPreference;
};
