import type {
  CorrectAnswer,
  SessionResult,
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
    questionId: string;
    sessionId: string;
    userAnswer: CorrectAnswer;
  }) =>
    apiRequest<SubmitAnswerResponse>("/sessions/submit", {
      body: JSON.stringify(input),
      method: "POST"
    }),

  getResult: (sessionId: string) =>
    apiRequest<SessionResult>(`/sessions/${sessionId}/result`)
};
