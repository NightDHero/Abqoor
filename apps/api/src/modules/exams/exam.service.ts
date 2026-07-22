import {
  getOfficialExamHistory,
  getOfficialExamResult,
  OfficialExamError
} from "./exam-mode.service.js";

export { OfficialExamError as ExamError };

export const getExamHistory = getOfficialExamHistory;

export const getExamResult = getOfficialExamResult;
