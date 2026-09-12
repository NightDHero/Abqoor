import type {
  CorrectAnswer,
  SessionResult,
  StudyProgressResponse,
  StartSessionResponse,
  SubmitAnswerResponse
} from "../types/session";
import { apiRequest } from "./http";

export const sessionService = {
  startSession: (questionLimit: number) =>
    apiRequest<StartSessionResponse>("/sessions/start", {
      body: JSON.stringify({ questionLimit }),
      method: "POST"
    }),

  submitAnswer: (input: {
    activeDurationSeconds?: number;
    questionId: string;
    sessionId: string;
    userAnswer: CorrectAnswer;
  }) =>
    apiRequest<SubmitAnswerResponse>("/sessions/submit", {
      body: JSON.stringify(input),
      method: "POST"
    }),

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
