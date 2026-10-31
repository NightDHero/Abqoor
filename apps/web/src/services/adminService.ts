import type {
  AdminAccountsResponse,
  AdminAccount,
  AdminQuestionBankResponse,
  DuplicateAction,
  ImportHistoryResponse,
  ImportJobDetail,
  QuestionImportTaxonomy,
  ValidationQuestion,
  ValidationSummary
} from "../types/admin";
import { apiRequest, apiRequestTimeouts } from "./http";
import {
  invalidateQueries,
  loadQuery,
  readQueryCache,
  writeQueryCache
} from "./queryCache";
import { questionService } from "./questionService";

const importHistoryCacheMaxAgeMs = 20_000;
const importDetailCacheMaxAgeMs = 10_000;
const adminAccountsCacheMaxAgeMs = 60_000;
const questionBankCacheMaxAgeMs = 30_000;
const validationCacheMaxAgeMs = 30_000;
const taxonomyCacheMaxAgeMs = 5 * 60_000;
const adminAccountsCacheKey = "admin:accounts";
const validationSummaryCacheKey = "admin:validation:summary";
const validationQuestionsCacheKey = "admin:validation:questions";
const importTaxonomyCacheKey = "admin:imports:taxonomy";
const importHistoryCacheKey = (page: number, pageSize: number) =>
  `admin:imports:history:${page}:${pageSize}`;
const importDetailCacheKey = (jobId: string) => `admin:imports:detail:${jobId}`;

const questionBankRequest = (input: {
  page: number;
  pageSize?: number;
  query?: string;
  sort?: "asc" | "desc";
  mode?: "general" | "aqsam";
  bankId?: string;
}) => {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize ?? 50),
    sort: input.sort ?? "asc"
  });
  params.set("mode", input.mode ?? "general");
  if (input.bankId) params.set("bankId", input.bankId);
  if (input.query?.trim()) params.set("query", input.query.trim());

  const query = params.toString();
  return {
    cacheKey: `admin:questions:${query}`,
    path: `/admin/import/questions?${query}`
  };
};

const cacheImportDetail = (detail: ImportJobDetail) => {
  writeQueryCache(importDetailCacheKey(detail.job.id), detail);
  if (detail.job.status === "completed" || detail.job.status === "rolled_back") {
    questionService.invalidate();
    invalidateQueries("admin:questions:");
    invalidateQueries("admin:validation:");
  }
  return detail;
};

const recordImportMutation = (detail: ImportJobDetail) => {
  invalidateQueries("admin:imports:history:");
  return cacheImportDetail(detail);
};

export const adminService = {
  getCachedValidationSummary: () =>
    readQueryCache<ValidationSummary>(validationSummaryCacheKey, validationCacheMaxAgeMs),
  getValidationSummary: () => loadQuery({
    key: validationSummaryCacheKey,
    loader: () => apiRequest<ValidationSummary>("/admin/validation/summary"),
    maxAgeMs: validationCacheMaxAgeMs
  }),
  getCachedValidationQuestions: () =>
    readQueryCache<{ questions: ValidationQuestion[] }>(
      validationQuestionsCacheKey,
      validationCacheMaxAgeMs
    ),
  getValidationQuestions: () => loadQuery({
    key: validationQuestionsCacheKey,
    loader: () => apiRequest<{ questions: ValidationQuestion[] }>(
      "/admin/validation/questions"
    ),
    maxAgeMs: validationCacheMaxAgeMs
  }),
  getCachedAdminAccounts: () =>
    readQueryCache<AdminAccountsResponse>(adminAccountsCacheKey, adminAccountsCacheMaxAgeMs),
  getAdminAccounts: () => loadQuery({
    key: adminAccountsCacheKey,
    loader: () => apiRequest<AdminAccountsResponse>("/admin/accounts"),
    maxAgeMs: adminAccountsCacheMaxAgeMs
  }),
  createAdminAccount: (input: {
    email: string;
  }) =>
    apiRequest<{ admin: AdminAccount }>("/admin/accounts", {
      body: JSON.stringify(input),
      method: "POST"
    }).then((response) => {
      invalidateQueries(adminAccountsCacheKey);
      return response;
    }),
  removeAdminAccount: (userId: string) =>
    apiRequest<AdminAccountsResponse>(`/admin/accounts/${userId}`, {
      method: "DELETE"
    }).then((response) => writeQueryCache(adminAccountsCacheKey, response)),
  analyzeImport: (input: {
    excel: File;
    questionFrom: string;
    questionTo: string;
    pdf?: File;
    pdfPageFrom?: string;
    pdfPageTo?: string;
    images?: File[];
    importType: "general" | "aqsam";
    bankName?: string;
    bankKey?: string;
  }) => {
    const formData = new FormData();
    formData.append("excel", input.excel);
    formData.append("questionFrom", input.questionFrom);
    formData.append("questionTo", input.questionTo);
    formData.append("importType", input.importType);
    if (input.bankName) formData.append("bankName", input.bankName);
    if (input.bankKey) formData.append("bankKey", input.bankKey);
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
      method: "POST",
      timeoutMs: apiRequestTimeouts.upload
    }).then(recordImportMutation);
  },
  getCachedImportTaxonomy: () =>
    readQueryCache<QuestionImportTaxonomy>(importTaxonomyCacheKey, taxonomyCacheMaxAgeMs),
  getImportTaxonomy: () => loadQuery({
    key: importTaxonomyCacheKey,
    loader: () => apiRequest<QuestionImportTaxonomy>("/admin/import/taxonomy"),
    maxAgeMs: taxonomyCacheMaxAgeMs
  }),
  getCachedImportJobs: (page = 1, pageSize = 25) =>
    readQueryCache<ImportHistoryResponse>(
      importHistoryCacheKey(page, pageSize),
      importHistoryCacheMaxAgeMs
    ),
  getImportJobs: (page = 1, pageSize = 25) => loadQuery({
    key: importHistoryCacheKey(page, pageSize),
    loader: () => apiRequest<ImportHistoryResponse>(
      `/admin/import/jobs?page=${page}&pageSize=${pageSize}`
    ),
    maxAgeMs: importHistoryCacheMaxAgeMs
  }),
  getCachedImportJob: (jobId: string) =>
    readQueryCache<ImportJobDetail>(
      importDetailCacheKey(jobId),
      importDetailCacheMaxAgeMs
    ),
  getImportJob: async (jobId: string, force = false) => {
    const detail = await loadQuery({
      force,
      key: importDetailCacheKey(jobId),
      loader: () => apiRequest<ImportJobDetail>(`/admin/import/jobs/${jobId}`),
      maxAgeMs: importDetailCacheMaxAgeMs
    });
    return cacheImportDetail(detail);
  },
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
    }).then(recordImportMutation),
  cancelImport: (jobId: string) =>
    apiRequest<ImportJobDetail>(`/admin/import/jobs/${jobId}/cancel`, {
      method: "POST"
    }).then(recordImportMutation),
  rollbackImport: (jobId: string) =>
    apiRequest<ImportJobDetail>(`/admin/import/jobs/${jobId}/rollback`, {
      method: "POST"
    }).then(recordImportMutation),
  getCachedQuestionBank: (input: {
    page: number;
    pageSize?: number;
    query?: string;
    sort?: "asc" | "desc";
    mode?: "general" | "aqsam";
    bankId?: string;
  }) => readQueryCache<AdminQuestionBankResponse>(
    questionBankRequest(input).cacheKey,
    questionBankCacheMaxAgeMs
  ),
  getQuestionBank: (input: {
    page: number;
    pageSize?: number;
    query?: string;
    sort?: "asc" | "desc";
    mode?: "general" | "aqsam";
    bankId?: string;
  }) => {
    const request = questionBankRequest(input);
    return loadQuery({
      key: request.cacheKey,
      loader: () => apiRequest<AdminQuestionBankResponse>(request.path),
      maxAgeMs: questionBankCacheMaxAgeMs
    });
  }
};
