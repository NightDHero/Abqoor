import { env } from "../../config/env";
import type { CorrectAnswer, SessionQuestion } from "../../types/session";

export const studyAnswers: CorrectAnswer[] = ["A", "B", "C", "D"];

export const toStudyImageSrc = (questionImageUrl: string) =>
  questionImageUrl.startsWith("http")
    ? questionImageUrl
    : `${env.apiUrl}${questionImageUrl}`;

export const getWeakTopics = (
  questions: SessionQuestion[],
  incorrectQuestionIds: string[]
) => {
  const incorrectIds = new Set(incorrectQuestionIds);
  const topics = questions
    .filter((question) => incorrectIds.has(question.id))
    .map((question) => question.topic.trim())
    .filter(Boolean);

  return [...new Set(topics)];
};
