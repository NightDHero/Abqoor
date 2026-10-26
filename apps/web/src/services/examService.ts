import type { CorrectAnswer } from "../types/session";
import type {
  CompleteExamSectionResponse,
  ExamAttemptResponse,
  ExamHistoryResponse,
  ExamStructureResponse
} from "../types/exam";
import { apiRequest } from "./http";
import { invalidateQueries, loadQuery, readQueryCache } from "./queryCache";

const examStructureCacheKey = "exams:structure";
const examHistoryCacheKey = "exams:history";
const examStructureCacheMaxAgeMs = 10 * 60_000;
const examHistoryCacheMaxAgeMs = 60_000;

export const examService = {
  getCachedStructure: () =>
    readQueryCache<ExamStructureResponse>(examStructureCacheKey, examStructureCacheMaxAgeMs),
  getStructure: () => loadQuery({
    key: examStructureCacheKey,
    loader: () => apiRequest<ExamStructureResponse>("/exams/structure"),
    maxAgeMs: examStructureCacheMaxAgeMs
  }),

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
    ).then((response) => {
      if (response.result ?? response.exam.result) {
        invalidateQueries(examHistoryCacheKey);
      }
      return response;
    }),

  getCachedHistory: () =>
    readQueryCache<ExamHistoryResponse>(examHistoryCacheKey, examHistoryCacheMaxAgeMs),
  getHistory: () => loadQuery({
    key: examHistoryCacheKey,
    loader: () => apiRequest<ExamHistoryResponse>("/exams/history"),
    maxAgeMs: examHistoryCacheMaxAgeMs
  })
};
