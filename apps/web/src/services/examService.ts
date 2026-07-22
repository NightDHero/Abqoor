import type { CorrectAnswer } from "../types/session";
import type {
  CompleteExamSectionResponse,
  ExamAttemptResponse,
  ExamHistoryResponse
} from "../types/exam";
import { apiRequest } from "./http";

export const examService = {
  startExam: () =>
    apiRequest<ExamAttemptResponse>("/exams/start", {
      method: "POST"
    }),

  getAttempt: (examId: string) =>
    apiRequest<ExamAttemptResponse>(`/exams/attempts/${examId}`),

  answerQuestion: (input: {
    examId: string;
    positionInSection: number;
    sectionNumber: number;
    userAnswer: CorrectAnswer;
  }) =>
    apiRequest<ExamAttemptResponse>(`/exams/attempts/${input.examId}/answers`, {
      body: JSON.stringify({
        positionInSection: input.positionInSection,
        sectionNumber: input.sectionNumber,
        userAnswer: input.userAnswer
      }),
      method: "PATCH"
    }),

  flagQuestion: (input: {
    examId: string;
    flagged: boolean;
    positionInSection: number;
    sectionNumber: number;
  }) =>
    apiRequest<ExamAttemptResponse>(`/exams/attempts/${input.examId}/flags`, {
      body: JSON.stringify({
        flagged: input.flagged,
        positionInSection: input.positionInSection,
        sectionNumber: input.sectionNumber
      }),
      method: "PATCH"
    }),

  completeSection: (input: { examId: string; sectionNumber: number }) =>
    apiRequest<CompleteExamSectionResponse>(
      `/exams/attempts/${input.examId}/sections/${input.sectionNumber}/complete`,
      { method: "POST" }
    ),

  getHistory: () => apiRequest<ExamHistoryResponse>("/exams/history")
};
