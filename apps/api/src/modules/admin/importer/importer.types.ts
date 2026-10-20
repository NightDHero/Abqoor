import type { LearningSubject } from "../../learning-taxonomy/taxonomy.js";
import type {
  CorrectAnswer,
  QuestionRecord,
  Subject
} from "../../questions/question.types.js";

export type ImportMode = "preview" | "commit";
export type QuestionImportType = "general" | "aqsam";
export type ImportJobStatus =
  | "analyzing"
  | "ready"
  | "importing"
  | "completed"
  | "failed"
  | "cancelled"
  | "rolled_back";
export type ImportSourceType = "pdf" | "images";
export type QuestionBankType = "quantitative" | "verbal";
export type MetadataSourceType = "excel";
export type DuplicateAction = "replace" | "skip" | "stop";
export type ImportItemOutcome =
  | "pending"
  | "created"
  | "replaced"
  | "skipped"
  | "failed";

export type PageRange = { from: number; to: number };

export type ImportTopicSelection = {
  topic: string;
  topicId: string;
  subtopic: string | null;
  subtopicId: string | null;
};

export type ImportValidationIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
  questionNumber?: number;
  rowNumber?: number;
  sheetName?: string;
  sourcePage?: number;
};

export type ImportQuestionMetadata = {
  questionNumber: number;
  correctAnswer: CorrectAnswer;
  subject: Subject;
  subjectId?: LearningSubject;
  topic: string;
  topicId?: string;
  subtopicId?: string;
  difficulty: number;
  difficultyScore?: number;
};

export type UnifiedImportQuestion = {
  questionNumber: string | number;
  questionImageUrl: string;
  correctAnswer: CorrectAnswer;
  subject: Subject;
  subjectId?: LearningSubject;
  topic: string;
  topicId?: string;
  subtopicId?: string;
  difficulty: number;
  difficultyScore?: number;
};

export type MappedImportQuestion = UnifiedImportQuestion & {
  questionId: string;
  numericQuestionNumber: number;
  pageIndex: number;
};

export type RawMetadataRow = { rowNumber: number; cells: unknown[] };
export type RawMetadataAdapterResult = {
  rows: RawMetadataRow[];
  globalErrors: string[];
};
export type MetadataAdapterResult = {
  metadataByQuestionNumber: Map<number, ImportQuestionMetadata>;
  errorsByQuestionNumber: Map<number, string>;
  globalErrors: string[];
};
export type PdfQuestionPage = { questionNumber: number; pageIndex: number };

export type ImportManifestItem = {
  questionId: string;
  questionNumber: number;
  imageUrl: string;
  questionImageUrl: string;
  pageIndex: number;
  correctAnswer?: CorrectAnswer;
  subject?: Subject;
  subjectId?: LearningSubject;
  topic?: string;
  topicId?: string;
  subtopicId?: string;
  difficulty?: number;
  difficultyScore?: number;
  status: "success" | "failed";
  error?: string;
};

export type SheetSummary = {
  sheetName: string;
  topic: string;
  subtopic: string | null;
  questionCount: number;
};

export type WorkbookColumnMapping = {
  field: string;
  columnIndex: number | null;
  columnName: string;
  header: string | null;
  source: "column" | "row-order";
};

export type WorkbookDiagnosticRow = {
  excelRowNumber: number;
  status: "extracted" | "invalid" | "skipped";
  reason: string | null;
  rawValues: unknown[];
  questionNumber: number | null;
  questionText: string | null;
  options: [string, string, string, string] | null;
  correctAnswer: CorrectAnswer | null;
  subject: Subject | null;
  topic: string | null;
  topicId: string | null;
  subtopic: string | null;
  subtopicId: string | null;
  difficulty: number | null;
  metadata: Record<string, unknown> | null;
  issues: ImportValidationIssue[];
};

export type WorkbookSheetDiagnostic = {
  sheetName: string;
  selected: boolean;
  recognized: boolean;
  format: string | null;
  detectedHeaders: string[];
  columnMappings: WorkbookColumnMapping[];
  skippedReason: string | null;
  emptyRowCount: number;
  rows: WorkbookDiagnosticRow[];
};

export type ImportDiagnostics = {
  configuredQuestionRange: PageRange;
  selectedWorksheetNames: string[];
  parsedQuestionIdentifiers: number[];
  mediaIdentifiers: number[];
  missingQuestionIdentifiers: number[];
  unmatchedMediaIdentifiers: number[];
  matchingStatus: "completed" | "not_attempted";
  sheets: WorkbookSheetDiagnostic[];
};
export type MediaSummary = {
  expected: number;
  found: number;
  matched: number;
  missing: number;
  extra: number;
};

export type ImportJob = {
  id: string;
  sourceType: ImportSourceType;
  status: ImportJobStatus;
  startQuestionNumber: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  sourcePdfId: string | null;
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
  sheetSummary: SheetSummary[];
  mediaSummary: MediaSummary;
  issues: ImportValidationIssue[];
  errorMessage: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  rolledBackAt: string | null;
  importType: QuestionImportType;
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
  correctAnswer: CorrectAnswer | null;
  subject: Subject;
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
  errors: ImportValidationIssue[];
  isDuplicate: boolean;
  duplicateAction: DuplicateAction | null;
  outcome: ImportItemOutcome;
  previousQuestion: QuestionRecord | null;
  appliedQuestion: QuestionRecord | null;
  previousImageExisted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ImportJobDetail = {
  job: ImportJob;
  items: ImportJobItem[];
  diagnostics?: ImportDiagnostics;
};

export type ParsedWorkbookQuestion = {
  questionNumber: number;
  sheetName: string;
  rowNumber: number;
  questionText: string;
  options: [string, string, string, string];
  correctAnswer: CorrectAnswer | null;
  subject: Subject;
  topic: string;
  topicId: string;
  subtopic: string | null;
  subtopicId: string | null;
  difficulty: number;
  metadata: Record<string, unknown>;
  embeddedImages: EmbeddedWorkbookImage[];
  issues: ImportValidationIssue[];
};

export type EmbeddedWorkbookImage = {
  buffer: Buffer;
  columnIndex: number;
  filename: string;
  mediaType: string;
  rowNumber: number;
  sheetName: string;
};

export type WorkbookAnalysis = {
  questions: ParsedWorkbookQuestion[];
  sheetSummary: SheetSummary[];
  issues: ImportValidationIssue[];
  diagnostics: Omit<
    ImportDiagnostics,
    | "configuredQuestionRange"
    | "matchingStatus"
    | "mediaIdentifiers"
    | "missingQuestionIdentifiers"
    | "unmatchedMediaIdentifiers"
  >;
  structuralFailure: boolean;
};

export type UploadedImportFile = {
  buffer: Buffer;
  fileSize?: number;
  mimetype: string;
  originalname: string;
  temporaryPath?: string;
};

export type AnalyzeImportRequest = {
  createdBy: string;
  excel: UploadedImportFile;
  questionRange: PageRange;
  pdf?: UploadedImportFile;
  pdfPageRange?: PageRange;
  images?: UploadedImportFile[];
  importType: QuestionImportType;
  bankKey?: string;
  bankName?: string;
  onStage?: (
    stage: "workbook_analysis_started" | "workbook_analysis_completed" | "media_analysis_started" | "media_analysis_completed",
    detail?: Record<string, string | number | boolean>
  ) => void;
};

export type ConfirmImportRequest = {
  applyToAllDuplicates?: boolean;
  defaultDuplicateAction?: DuplicateAction;
  duplicateDecisions?: Array<{
    questionNumber: number;
    action: DuplicateAction;
  }>;
};

export type ImportRequest = {
  pdfBuffer: Buffer;
  startQuestionNumber: number;
  pageRange?: PageRange;
  overwriteExisting: boolean;
  mode: ImportMode;
  metadataSource: MetadataSourceType;
  excelBuffer?: Buffer;
  subject: Subject;
  subjectId?: LearningSubject;
  topic: string;
  topicId?: string;
  subtopicId?: string;
  difficulty: number;
  difficultyScore?: number;
  createdBy: string;
};
