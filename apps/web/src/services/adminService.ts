import type {
  AdminAccountsResponse,
  AdminAccount,
  AdminQuestionBankResponse,
  DuplicateAction,
  ImportJob,
  ImportJobDetail,
  QuestionImportTaxonomy,
  ValidationQuestion,
  ValidationSummary
} from "../types/admin";
import { apiRequest } from "./http";

export const adminService = {
  getValidationSummary: () =>
    apiRequest<ValidationSummary>("/admin/validation/summary"),
  getValidationQuestions: () =>
    apiRequest<{ questions: ValidationQuestion[] }>(
      "/admin/validation/questions"
    ),
  getAdminAccounts: () =>
    apiRequest<AdminAccountsResponse>("/admin/accounts"),
  createAdminAccount: (input: {
    email: string;
  }) =>
    apiRequest<{ admin: AdminAccount }>("/admin/accounts", {
      body: JSON.stringify(input),
      method: "POST"
    }),
  removeAdminAccount: (userId: string) =>
    apiRequest<AdminAccountsResponse>(`/admin/accounts/${userId}`, {
      method: "DELETE"
    }),
  analyzeImport: (input: {
    excel: File;
    questionFrom: string;
    questionTo: string;
    pdf?: File;
    pdfPageFrom?: string;
    pdfPageTo?: string;
    images?: File[];
  }) => {
    const formData = new FormData();
    formData.append("excel", input.excel);
    formData.append("questionFrom", input.questionFrom);
    formData.append("questionTo", input.questionTo);
    if (input.pdf) {
      formData.append("pdf", input.pdf);
    }
    for (const image of input.images ?? []) {
      formData.append("images", image);
    }
    if (input.pdfPageFrom) {
      formData.append("pdfPageFrom", input.pdfPageFrom);
    }
    if (input.pdfPageTo) {
      formData.append("pdfPageTo", input.pdfPageTo);
    }
    return apiRequest<ImportJobDetail>("/admin/import/analyze", {
      body: formData,
      method: "POST"
    });
  },
  getImportTaxonomy: () =>
    apiRequest<QuestionImportTaxonomy>("/admin/import/taxonomy"),
  getImportJobs: () =>
    apiRequest<{ jobs: ImportJob[] }>("/admin/import/jobs"),
  getImportJob: (jobId: string) =>
    apiRequest<ImportJobDetail>(`/admin/import/jobs/${jobId}`),
  confirmImport: (
    jobId: string,
    input: {
      applyToAllDuplicates: boolean;
      defaultDuplicateAction?: DuplicateAction;
      duplicateDecisions: Array<{
        questionNumber: number;
        action: DuplicateAction;
      }>;
    }
  ) =>
    apiRequest<ImportJobDetail>(`/admin/import/jobs/${jobId}/confirm`, {
      body: JSON.stringify(input),
      method: "POST"
    }),
  cancelImport: (jobId: string) =>
    apiRequest<ImportJobDetail>(`/admin/import/jobs/${jobId}/cancel`, {
      method: "POST"
    }),
  rollbackImport: (jobId: string) =>
    apiRequest<ImportJobDetail>(`/admin/import/jobs/${jobId}/rollback`, {
      method: "POST"
    }),
  getQuestionBank: (input: {
    page: number;
    pageSize?: number;
    query?: string;
    sort?: "asc" | "desc";
  }) => {
    const params = new URLSearchParams({
      page: String(input.page),
      pageSize: String(input.pageSize ?? 50),
      sort: input.sort ?? "asc"
    });
    if (input.query?.trim()) {
      params.set("query", input.query.trim());
    }
    return apiRequest<AdminQuestionBankResponse>(
      `/admin/import/questions?${params.toString()}`
    );
  }
};
