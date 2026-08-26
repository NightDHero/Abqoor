export type ValidationSummary = {
  totalQuestions: number;
  importedQuestions: number;
  failedQuestions: number;
  missingCorrectAnswers: number;
  missingImages: number;
};

export type ValidationQuestion = {
  id: string;
  question_image_url: string;
  correct_answer: string;
  subject: string;
  topic: string;
  difficulty: number;
  pdfPageNumber: number | null;
  excelRowNumber: number | null;
  imageExists: boolean;
};

export type DuplicateAction = "replace" | "skip" | "stop";
export type ImportJobStatus =
  | "analyzing"
  | "ready"
  | "importing"
  | "completed"
  | "failed"
  | "cancelled"
  | "rolled_back";

export type ImportIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
  questionNumber?: number;
  rowNumber?: number;
  sheetName?: string;
};

export type ImportJob = {
  id: string;
  sourceType: "pdf" | "images";
  status: ImportJobStatus;
  startQuestionNumber: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  excelFilename: string;
  mediaFilename: string;
  totalPages: number;
  totalQuestions: number;
  successCount: number;
  failureCount: number;
  newCount: number;
  duplicateCount: number;
  createdCount: number;
  replacedCount: number;
  skippedCount: number;
  processedCount: number;
  errorCount: number;
  sheetSummary: Array<{ sheetName: string; questionCount: number }>;
  mediaSummary: {
    expected: number;
    found: number;
    matched: number;
    missing: number;
    extra: number;
  };
  issues: ImportIssue[];
  errorMessage: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  rolledBackAt: string | null;
};

export type ImportJobItem = {
  importJobId: string;
  questionNumber: number;
  questionId: string;
  sheetName: string;
  excelRowNumber: number;
  questionText: string;
  options: [string, string, string, string];
  correctAnswer: "A" | "B" | "C" | "D" | null;
  subject: "quantitative" | "verbal";
  topic: string;
  topicId: string;
  difficulty: number;
  pageNumber: number | null;
  sourceImageName: string | null;
  imageStatus: "matched" | "missing";
  validationStatus: "valid" | "error";
  errors: ImportIssue[];
  isDuplicate: boolean;
  duplicateAction: DuplicateAction | null;
  outcome: "pending" | "created" | "replaced" | "skipped" | "failed";
  previousImageExisted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ImportJobDetail = {
  job: ImportJob;
  items: ImportJobItem[];
};

export type AdminQuestion = {
  id: string;
  questionNumber: number;
  questionImageUrl: string;
  correctAnswer: "A" | "B" | "C" | "D";
  subject: string;
  topic: string;
  topicId: string | null;
  difficulty: number;
  importJobId: string | null;
  importedAt: string | null;
  importedBy: string | null;
  imageExists: boolean;
};

export type AdminQuestionBankResponse = {
  page: number;
  pageSize: number;
  total: number;
  questions: AdminQuestion[];
};

export type AdminAccountSource =
  | "managed"
  | "environment"
  | "managed_and_environment";

export type AdminAccount = {
  userId: string;
  email: string;
  source: AdminAccountSource;
  createdAt: string;
  updatedAt: string;
  grantedByEmail: string | null;
  isCurrentUser: boolean;
  canRemove: boolean;
  removalBlockedReason: string | null;
};

export type AdminAccountsResponse = {
  admins: AdminAccount[];
};
