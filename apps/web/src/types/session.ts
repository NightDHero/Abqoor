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
  sessionId: string;
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

export type StudyProgressDay = {
  date: string;
  answeredQuestions: number;
  correctAnswers: number;
  approximateStudySeconds: number;
  intensity: StudyProgressIntensity;
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

export type StudyProgressResponse = {
  generatedAt: string;
  timeZone: string;
  activeStudyDay: number;
  today: StudyProgressDay;
  week: StudyProgressPeriod;
  month: StudyProgressPeriod;
};
