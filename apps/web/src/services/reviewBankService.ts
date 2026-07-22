import { apiRequest } from "./http";

export type ReviewSource = "manual" | "wrong_answer";

export type ReviewItem = {
  id: string;
  questionId: string;
  questionImageUrl: string;
  correctAnswer: string;
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

export const reviewBankService = {
  addQuestion: (questionId: string, source: ReviewSource = "manual") =>
    apiRequest<ReviewItem>("/review", {
      body: JSON.stringify({ questionId, source }),
      method: "POST"
    }),

  getReviewBank: () => apiRequest<ReviewBankResponse>("/review"),

  removeQuestion: (reviewItemId: string) =>
    apiRequest<null>(`/review/${reviewItemId}`, {
      method: "DELETE"
    })
};
