import type {
  CorrectAnswer,
  SessionResult,
  StudyProgressResponse,
  StartSessionResponse,
  SubmitAnswerResponse
} from "../types/session";
import { apiRequest } from "./http";
import { invalidateStudyProgressCache } from "../features/career/studyProgressCache";

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
    invalidateStudyProgressCache();
    return response;
  },

  getResult: (sessionId: string) =>
    apiRequest<SessionResult>(`/sessions/${sessionId}/result`),

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
