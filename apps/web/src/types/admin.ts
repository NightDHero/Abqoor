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
  sourcePage?: number;
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
  sheetSummary: Array<{
    sheetName: string;
    topic: string;
    subtopic: string | null;
    questionCount: number;
  }>;
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
  importType: "general" | "aqsam";
  bankId: string | null;
  bankName: string | null;
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
  subtopic: string | null;
  subtopicId: string | null;
  metadata: Record<string, unknown>;
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

export type ImportDiagnostics = {
  configuredQuestionRange: { from: number; to: number };
  selectedWorksheetNames: string[];
  parsedQuestionIdentifiers: number[];
  mediaIdentifiers: number[];
  missingQuestionIdentifiers: number[];
  unmatchedMediaIdentifiers: number[];
  matchingStatus: "completed" | "not_attempted";
  sheets: Array<{
    sheetName: string;
    selected: boolean;
    recognized: boolean;
    format: string | null;
      detectedSection: "quantitative" | "verbal" | null;
      sectionDetectionSource: "structure" | "worksheet-name" | null;
    detectedHeaders: string[];
    columnMappings: Array<{
      field: string;
      columnIndex: number | null;
      columnName: string;
      header: string | null;
      source: "column" | "row-order";
    }>;
    skippedReason: string | null;
    emptyRowCount: number;
    rows: Array<{
      excelRowNumber: number;
      status: "extracted" | "invalid" | "skipped";
      reason: string | null;
      rawValues: unknown[];
      questionNumber: number | null;
      questionText: string | null;
      options: [string, string, string, string] | null;
      correctAnswer: "A" | "B" | "C" | "D" | null;
      subject: "quantitative" | "verbal" | null;
      topic: string | null;
      topicId: string | null;
      subtopic: string | null;
      subtopicId: string | null;
      difficulty: number | null;
      format: string | null;
      detectedSection: "quantitative" | "verbal" | null;
      sourceIdentifiers: {
        primary: string | null;
        secondary: string | null;
        code: string | null;
      } | null;
      comparisonA: string | null;
      comparisonB: string | null;
      imageIndicator: string | null;
      additionalCategory: string | null;
      comparisonImages: string[];
      topicSource: string | null;
      subtopicSource: string | null;
      mediaMatchStatus: "matched" | "missing" | "not_attempted";
      matchedMediaIdentifier: number | null;
      matchedPageNumber: number | null;
      matchedSourceName: string | null;
      metadata: Record<string, unknown> | null;
      issues: ImportIssue[];
    }>;
  }>;
};

export type ImportJobDetail = {
  job: ImportJob;
  items: ImportJobItem[];
  diagnostics?: ImportDiagnostics;
};

export type QuestionImportTaxonomy = {
  sections: Array<{
    id: string;
    label: string;
    topics: Array<{
      id: string;
      label: string;
      subtopics: Array<{
        id: string;
        label: string;
      }>;
    }>;
  }>;
};

export type AdminQuestion = {
  id: string;
  questionNumber: number;
  questionImageUrl: string;
  correctAnswer: "A" | "B" | "C" | "D";
  subject: string;
  topic: string;
  topicId: string | null;
  subtopic: string | null;
  subtopicId: string | null;
  difficulty: number;
  importJobId: string | null;
  importedAt: string | null;
  importedBy: string | null;
  imageExists: boolean;
  questionScope: "general" | "aqsam";
  bankId: string | null;
  bankName: string | null;
  bankQuestionNumber: number | null;
};

export type AdminQuestionSubtopicCount = {
  subtopicId: string | null;
  subtopicLabel: string;
  count: number;
};

export type AdminQuestionTopicCount = {
  topicId: string | null;
  topicLabel: string;
  count: number;
  subtopics: AdminQuestionSubtopicCount[];
};

export type AdminQuestionSubjectCount = {
  subjectId: "arabic" | "math";
  subjectLabel: string;
  total: number;
  topics: AdminQuestionTopicCount[];
};

export type AdminQuestionBankResponse = {
  mode: "general" | "aqsam";
  banks: Array<{
    id: string;
    key: string;
    name: string;
    questionCount: number;
    subjectId: "arabic" | "math" | null;
  }>;
  page: number;
  pageSize: number;
  total: number;
  questionCounts: {
    subjects: AdminQuestionSubjectCount[];
  };
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
