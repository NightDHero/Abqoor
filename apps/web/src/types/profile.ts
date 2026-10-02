export type WeakerSection = "quantitative" | "verbal" | "both";
export type StudyRestDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

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
  weeklyRestDay: StudyRestDay;
  weeklyReviewDay: StudyRestDay;
  studyPlanBankCount: number | null;
  studyPlanStudyDays: number | null;
  studyPlanCalendarDays: number | null;
  studyPlanCompletionDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
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
  studyPlanStartDate: string;
  weeklyRestDay: StudyRestDay;
  weeklyReviewDay: StudyRestDay;
};
