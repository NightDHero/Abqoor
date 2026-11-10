import { env } from "../../config/env";
import { getCachedQuestionAssetSource } from "../../services/questionAssetCache";
import type { CorrectAnswer, SessionQuestion } from "../../types/session";

export const studyAnswers: CorrectAnswer[] = ["A", "B", "C", "D"];

export const toStudyImageSrc = (questionImageUrl: string) => {
  const source = questionImageUrl.startsWith("http")
    ? questionImageUrl
    : `${env.apiUrl}${questionImageUrl}`;
  return getCachedQuestionAssetSource(source) ?? source;
};

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
