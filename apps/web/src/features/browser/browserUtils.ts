import { env } from "../../config/env";
import type { CorrectAnswer, Question } from "../../types/question";

export const answers: CorrectAnswer[] = ["A", "B", "C", "D"];

export const toQuestionNumber = (questionId: string) => {
  const match = /^Q-(\d+)$/i.exec(questionId);
  return match ? Number(match[1]) : null;
};

export const sortByImporterOrder = (questions: Question[]) => {
  return [...questions].sort((left, right) => {
    const leftNumber = toQuestionNumber(left.id);
    const rightNumber = toQuestionNumber(right.id);

    if (leftNumber !== null && rightNumber !== null) {
      return leftNumber - rightNumber;
    }

    return left.id.localeCompare(right.id);
  });
};

export const matchesQuestionSearch = (question: Question, searchText: string) => {
  const value = searchText.trim().toLowerCase();

  if (!value) {
    return true;
  }

  const questionNumber = toQuestionNumber(question.id);
  const normalizedQuestionNumber =
    questionNumber === null ? "" : String(questionNumber);

  return (
    question.id.toLowerCase().includes(value) ||
    normalizedQuestionNumber.includes(value)
  );
};

export const toMediaSrc = (path: string) => {
  return path.startsWith("http") ? path : `${env.apiUrl}${path}`;
};

export const getAnswerImageUrl = (
  question: Question,
  answer: CorrectAnswer
) => {
  return (
    question.answerImageUrls?.[answer] ??
    question.optionImageUrls?.[answer] ??
    null
  );
};
