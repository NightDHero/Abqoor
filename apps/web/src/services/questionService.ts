import type { CorrectAnswer, QuestionAnswerResponse, QuestionListResponse } from "../types/question";
import { apiRequest } from "./http";
import { invalidateQueries, loadQuery, readQueryCache } from "./queryCache";
import { reviewBankService } from "./reviewBankService";

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

const questionCacheMaxAgeMs = 5 * 60_000;
const questionCacheKey = (query: QuestionQuery) =>
  `questions:${toQueryString(query) || "all"}`;

export const questionService = {
  invalidate: () => invalidateQueries("questions:"),
  getCachedQuestions: (query: QuestionQuery) =>
    readQueryCache<QuestionListResponse>(questionCacheKey(query), questionCacheMaxAgeMs),
  getQuestions: (query: QuestionQuery) => {
    const queryString = toQueryString(query);
    return loadQuery({
      key: questionCacheKey(query),
      loader: () => apiRequest<QuestionListResponse>(`/questions${queryString}`),
      maxAgeMs: questionCacheMaxAgeMs
    });
  },
  evaluateAnswer: async (questionId: string, answer: CorrectAnswer) => {
    const response = await apiRequest<QuestionAnswerResponse>(`/questions/${encodeURIComponent(questionId)}/answer`, {
      body: JSON.stringify({ answer }),
      method: "POST"
    });
    reviewBankService.invalidate();
    return response;
  }
};
