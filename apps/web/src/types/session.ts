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
