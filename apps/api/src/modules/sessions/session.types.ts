import type { CorrectAnswer, Subject } from "../questions/question.types.js";

export type SessionQuestion = {
  id: string;
  questionImageUrl: string;
  subject: Subject;
  subjectId?: string;
  topic: string;
  topicId?: string;
  subtopicId?: string;
  difficulty: number;
  difficultyScore?: number;
};

export type InternalSessionQuestion = SessionQuestion & {
  correctAnswer: CorrectAnswer;
};

export type SessionAnswer = {
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
