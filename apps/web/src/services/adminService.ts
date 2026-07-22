import type {
  ImportMode,
  ImportResponse,
  ValidationQuestion,
  ValidationSummary
} from "../types/admin";
import { apiRequest } from "./http";

export const adminService = {
  getValidationSummary: async () => {
    return apiRequest<ValidationSummary>("/admin/validation/summary");
  },
  getValidationQuestions: async () => {
    return apiRequest<{ questions: ValidationQuestion[] }>(
      "/admin/validation/questions"
    );
  },
  importPdfQuestions: async (input: {
    pdf: File;
    excel: File;
    startQuestionNumber: string;
    mode: ImportMode;
    pageRangeFrom?: string;
    pageRangeTo?: string;
  }) => {
    const formData = new FormData();
    formData.append("pdf", input.pdf);
    formData.append("excelFile", input.excel);
    formData.append("startQuestionNumber", input.startQuestionNumber);
    formData.append("mode", input.mode);
    formData.append("overwriteExisting", "false");
    formData.append("topic", "التناظر اللفظي");
    formData.append("difficulty", "1");

    if (input.pageRangeFrom && input.pageRangeTo) {
      formData.append("pageRangeFrom", input.pageRangeFrom);
      formData.append("pageRangeTo", input.pageRangeTo);
    }

    return apiRequest<ImportResponse>("/admin/import/pdf", {
      body: formData,
      method: "POST"
    });
  }
};
