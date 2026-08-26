import type {
  AdminAccountsResponse,
  AdminAccount,
  AdminQuestionBankResponse,
  DuplicateAction,
  ImportJob,
  ImportJobDetail,
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
    password: string;
    passwordConfirmation: string;
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
    pdf?: File;
    images?: File[];
    startQuestionNumber?: string;
  }) => {
    const formData = new FormData();
    formData.append("excel", input.excel);
    if (input.pdf) {
      formData.append("pdf", input.pdf);
    }
    for (const image of input.images ?? []) {
      formData.append("images", image);
    }
    if (input.startQuestionNumber) {
      formData.append("startQuestionNumber", input.startQuestionNumber);
    }
    return apiRequest<ImportJobDetail>("/admin/import/analyze", {
      body: formData,
      method: "POST"
    });
  },
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
