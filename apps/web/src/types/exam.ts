import type { CorrectAnswer } from "./session";

export type ExamCategory = "math" | "arabic";
export type ExamStatus = "active" | "completed";
export type ExamSectionStatus = "pending" | "active" | "completed";

export type ExamQuestion = {
  questionId: string;
  questionImageUrl: string;
  sectionNumber: number;
  positionInSection: number;
  globalPosition: number;
  category: ExamCategory;
  userAnswer?: CorrectAnswer;
  flagged: boolean;
  subject: string;
  subjectId?: string;
  topic: string;
  topicId?: string;
  subtopic?: string;
  subtopicId?: string;
  difficulty: number;
  difficultyScore?: number;
};

export type ExamSection = {
  sectionNumber: number;
  status: ExamSectionStatus;
  startedAt?: string;
  completedAt?: string;
  questions: ExamQuestion[];
};

export type ExamResult = {
  id: string;
  examId: string;
  mathScore: number;
  arabicScore: number;
  finalScore: number;
  sectionScores: number[];
  topicScores?: ExamTopicScore[];
  createdAt: string;
  created_at: string;
};

export type ExamTopicScore = {
  subject: ExamCategory;
  topicId: string;
  topicName: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
};

export type ExamAttempt = {
  id: string;
  isTestMode: boolean;
  testModeMessage?: string;
  status: ExamStatus;
  currentSection: number;
  sectionDurationSeconds: number;
  startedAt: string;
  completedAt?: string;
  sections: ExamSection[];
  result?: ExamResult;
};

export type ExamAttemptResponse = {
  exam: ExamAttempt;
};

export type CompleteExamSectionResponse = {
  exam: ExamAttempt;
  result?: ExamResult;
};

export type ExamHistoryResponse = {
  examResults: ExamResult[];
};
