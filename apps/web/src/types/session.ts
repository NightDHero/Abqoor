export type CorrectAnswer = "A" | "B" | "C" | "D";

export type SessionQuestion = {
  id: string;
  questionImageUrl: string;
  subject: string;
  subjectId?: string;
  topic: string;
  topicId?: string;
  subtopicId?: string;
  difficulty: number;
  difficultyScore?: number;
};

export type StartSessionResponse = {
  answers: SubmitAnswerResponse[];
  resumed: boolean;
  sessionId: string;
  status: "active" | "completed";
  questions: SessionQuestion[];
  totalQuestions: number;
};

export type SubmitAnswerResponse = {
  sessionId: string;
  questionId: string;
  userAnswer: CorrectAnswer;
  correctAnswer: CorrectAnswer;
  isCorrect: boolean;
  activeDurationSeconds: number | null;
  answeredAt: string;
};

export type SessionResult = {
  sessionId: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  finalScorePercentage: number;
};

export type StudyProgressIntensity = 0 | 1 | 2 | 3;
export type StudyPlanDayKind = "study" | "review" | "rest";

export type StudyProgressDay = {
  date: string;
  answeredQuestions: number;
  correctAnswers: number;
  approximateStudySeconds: number;
  intensity: StudyProgressIntensity;
  planAnsweredQuestions: number;
  planKind: StudyPlanDayKind;
  planSubjectId: "math" | "arabic" | null;
  planSubjectLabel: string | null;
  questionTarget: number | null;
};

export type StudyProgressPeriod = {
  startDate: string;
  endDate: string;
  answeredQuestions: number;
  correctAnswers: number;
  approximateStudySeconds: number;
  activeDays: number;
  days: StudyProgressDay[];
};

export type StudyProgressStreak = {
  current: number;
  highest: number;
};

export type PastUnfinishedStudyPlanDay = {
  date: string;
  hasStarted: boolean;
  planAnsweredQuestions: number;
  planKind: "study";
  planSubjectId: "math" | "arabic";
  planSubjectLabel: string;
  questionTarget: number;
};

export type StudyProgressResponse = {
  career: {
    arabic: CareerSubjectProgress;
    math: CareerSubjectProgress;
  };
  generatedAt: string;
  timeZone: string;
  activeStudyDay: number;
  dailyPlanHasActiveSession: boolean;
  dailyQuestionTarget: number | null;
  streak: StudyProgressStreak;
  today: StudyProgressDay;
  week: StudyProgressPeriod;
  month: StudyProgressPeriod;
  monthWeeks: StudyProgressPeriod[];
  pastUnfinishedDays: PastUnfinishedStudyPlanDay[];
  pastUnfinishedHasMore: boolean;
  year: StudyProgressPeriod;
};

export type CareerSubjectProgress = {
  answeredQuestions: number;
  bankPercent: number;
  errorBankPercent: number;
  incorrectAnswers: number;
};
