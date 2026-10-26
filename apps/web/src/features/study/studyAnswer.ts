import type {
  CorrectAnswer,
  SessionQuestion,
  SubmitAnswerResponse
} from "../../types/session";

export const createImmediateStudyAnswer = ({
  activeDurationSeconds,
  answer,
  answeredAt = new Date().toISOString(),
  question,
  sessionId
}: {
  activeDurationSeconds: number;
  answer: CorrectAnswer;
  answeredAt?: string;
  question: SessionQuestion;
  sessionId: string;
}): SubmitAnswerResponse | null => {
  if (!question.correctAnswer) return null;

  return {
    activeDurationSeconds,
    answeredAt,
    correctAnswer: question.correctAnswer,
    isCorrect: question.correctAnswer === answer,
    questionId: question.id,
    sessionId,
    userAnswer: answer
  };
};
