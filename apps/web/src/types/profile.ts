export type WeakerSection = "quantitative" | "verbal" | "both";
export type StudyRestDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type StudyScheduleSubjectId = "math" | "arabic";

export type StudyScheduleDay = {
  date: string;
  kind: "study" | "review" | "rest";
  questionTarget: number | null;
  subjectId: StudyScheduleSubjectId | null;
  subjectLabel: string | null;
  weekday: StudyRestDay;
};

export type StudyPlanPreview = {
  bankCount: number;
  calendarDays: number;
  completionDate: string;
  schedule: StudyScheduleDay[];
  studyDays: number;
  weeklyReviewDays: 1;
  weeklyRestDays: 1;
  weeklyStudyDays: 5;
};

export type BankConfig = {
  availableBankCount: number;
  mathQuestionsPerBank: number;
  verbalQuestionsPerBank: number;
  studyPaceBanksPerDay: number;
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
  quantitativeStudyDays: StudyRestDay[];
  weeklyRestDay: StudyRestDay;
  weeklyReviewDay: StudyRestDay;
  studyPlanBankCount: number | null;
  studyPlanStudyDays: number | null;
  studyPlanCalendarDays: number | null;
  studyPlanCompletionDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  verbalStudyDays: StudyRestDay[];
};

export type StudentProfileInput = {
  username: string;
  targetScore: number;
  hasExamDate: boolean;
  examDate: string | null;
  hasTakenQudurat: boolean;
  attemptCount: number | null;
  latestScore: number | null;
  weakerSection: WeakerSection;
  studyPlanBankCount: number;
  studyPlanStartDate: string;
  quantitativeStudyDays: StudyRestDay[];
  weeklyRestDay: StudyRestDay;
  weeklyReviewDay: StudyRestDay;
  verbalStudyDays: StudyRestDay[];
};
