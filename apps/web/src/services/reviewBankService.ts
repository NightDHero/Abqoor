import { apiRequest } from "./http";
import {
  invalidateQueries,
  loadQuery,
  readQueryCache,
  updateQueryCache
} from "./queryCache";

export type ReviewSource = "manual" | "wrong_answer";

export type ReviewItem = {
  id: string;
  questionId: string;
  questionImageUrl: string;
  source: ReviewSource;
  addedAt: string;
  updatedAt: string;
  priority: number;
  reviewAfter?: string;
  spacedRepetitionState?: string;
  aiScheduleMetadata?: string;
  subject: string;
  subjectId?: "math" | "arabic";
  topic: string;
  topicId?: string;
  subtopic?: string;
  subtopicId?: string;
  difficulty: number;
  difficultyScore?: number;
};

export type ReviewBankResponse = {
  savedQuestions: ReviewItem[];
  wrongQuestions: ReviewItem[];
};

export const emptyReviewBank: ReviewBankResponse = {
  savedQuestions: [],
  wrongQuestions: []
};

const reviewBankCacheKey = "review:bank";
const reviewBankCacheMaxAgeMs = 60_000;

const withReviewItem = (bank: ReviewBankResponse, item: ReviewItem) => {
  const listKey = item.source === "manual" ? "savedQuestions" : "wrongQuestions";
  const existing = bank[listKey].filter((candidate) => candidate.id !== item.id);
  return { ...bank, [listKey]: [item, ...existing] };
};

export const reviewBankService = {
  addQuestion: async (questionId: string, source: ReviewSource = "manual") => {
    const item = await apiRequest<ReviewItem>("/review", {
      body: JSON.stringify({ questionId, source }),
      method: "POST"
    });
    updateQueryCache<ReviewBankResponse>(reviewBankCacheKey, (current) =>
      withReviewItem(current ?? emptyReviewBank, item)
    );
    return item;
  },

  getCachedReviewBank: () =>
    readQueryCache<ReviewBankResponse>(reviewBankCacheKey, reviewBankCacheMaxAgeMs),

  getReviewBank: () => loadQuery({
    key: reviewBankCacheKey,
    loader: () => apiRequest<ReviewBankResponse>("/review"),
    maxAgeMs: reviewBankCacheMaxAgeMs
  }),

  invalidate: () => invalidateQueries("review:"),

  removeQuestion: async (reviewItemId: string) => {
    const response = await apiRequest<null>(`/review/${reviewItemId}`, {
      method: "DELETE"
    });
    updateQueryCache<ReviewBankResponse>(reviewBankCacheKey, (current) => current
      ? {
          savedQuestions: current.savedQuestions.filter((item) => item.id !== reviewItemId),
          wrongQuestions: current.wrongQuestions.filter((item) => item.id !== reviewItemId)
        }
      : null
    );
    return response;
  }
};
