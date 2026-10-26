import type {
  CorrectAnswer,
  Question,
  QuestionAnswerResponse
} from "../../types/question";

export const getImmediatePracticeEvaluation = (
  question: Question,
  answer: CorrectAnswer
): QuestionAnswerResponse | null => {
  if (!question.correctAnswer) return null;

  return {
    correctAnswer: question.correctAnswer,
    isCorrect: question.correctAnswer === answer
  };
};

export const evaluatePracticeAnswer = (
  question: Question,
  answer: CorrectAnswer,
  evaluateRemotely: () => Promise<QuestionAnswerResponse>
) => getImmediatePracticeEvaluation(question, answer) ?? evaluateRemotely();
