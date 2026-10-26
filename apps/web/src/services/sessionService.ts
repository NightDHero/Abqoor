import type {
  CorrectAnswer,
  SessionResult,
  StudyProgressResponse,
  StartSessionResponse,
  SubmitAnswerResponse
} from "../types/session";
import { apiRequest } from "./http";
import { invalidateStudyProgressCache } from "../features/career/studyProgressCache";
import { reviewBankService } from "./reviewBankService";
import { invalidateQueries, loadQuery } from "./queryCache";

const sessionResultCacheMaxAgeMs = 5 * 60_000;

export const sessionService = {
  startSession: (input: {
    planDate?: string;
    questionLimit?: number;
    subjectId?: "math" | "arabic";
  } = {}) =>
    apiRequest<StartSessionResponse>("/sessions/start", {
      body: JSON.stringify(input),
      method: "POST"
    }),

  submitAnswer: async (input: {
    activeDurationSeconds?: number;
    questionId: string;
    sessionId: string;
    userAnswer: CorrectAnswer;
  }) => {
    const response = await apiRequest<SubmitAnswerResponse>("/sessions/submit", {
      body: JSON.stringify(input),
      method: "POST"
    });
    invalidateQueries(`sessions:result:${input.sessionId}`);
    invalidateStudyProgressCache();
    reviewBankService.invalidate();
    return response;
  },

  getResult: (sessionId: string) => loadQuery({
    key: `sessions:result:${sessionId}`,
    loader: () => apiRequest<SessionResult>(`/sessions/${sessionId}/result`),
    maxAgeMs: sessionResultCacheMaxAgeMs
  }),

  getProgress: (timeZone?: string, month?: string) => {
    const params = new URLSearchParams();

    if (timeZone) {
      params.set("timeZone", timeZone);
    }

    if (month) {
      params.set("month", month);
    }

    const query = params.toString();
    return apiRequest<StudyProgressResponse>(
      `/sessions/progress${query ? `?${query}` : ""}`
    );
  }
};
