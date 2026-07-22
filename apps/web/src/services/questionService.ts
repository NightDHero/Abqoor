import type { QuestionListResponse } from "../types/question";
import { apiRequest } from "./http";

export type QuestionQuery = {
  subjectId?: "math" | "arabic";
  topicId?: string;
  subtopicId?: string;
};

const toQueryString = (query: QuestionQuery) => {
  const params = new URLSearchParams();

  if (query.subjectId) {
    params.set("subjectId", query.subjectId);
  }

  if (query.topicId) {
    params.set("topicId", query.topicId);
  }

  if (query.subtopicId) {
    params.set("subtopicId", query.subtopicId);
  }

  const value = params.toString();
  return value ? `?${value}` : "";
};

export const questionService = {
  getQuestions: (query: QuestionQuery) =>
    apiRequest<QuestionListResponse>(`/questions${toQueryString(query)}`)
};
