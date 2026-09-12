import type { LearningSubject } from "../../learning-taxonomy/taxonomy.js";
import type {
  CorrectAnswer,
  QuestionRecord,
  Subject
} from "../../questions/question.types.js";

export type ImportMode = "preview" | "commit";
export type ImportJobStatus =
  | "analyzing"
  | "ready"
  | "importing"
  | "completed"
  | "failed"
  | "cancelled"
  | "rolled_back";
export type ImportSourceType = "pdf" | "images";
export type MetadataSourceType = "excel";
export type DuplicateAction = "replace" | "skip" | "stop";
export type ImportItemOutcome =
  | "pending"
  | "created"
  | "replaced"
  | "skipped"
  | "failed";

export type PageRange = { from: number; to: number };

export type ImportValidationIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
  questionNumber?: number;
  rowNumber?: number;
  sheetName?: string;
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

export type SheetSummary = { sheetName: string; questionCount: number };
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

export type ImportJobDetail = { job: ImportJob; items: ImportJobItem[] };

export type ParsedWorkbookQuestion = {
  questionNumber: number;
  sheetName: string;
  rowNumber: number;
  questionText: string;
  options: [string, string, string, string];
  correctAnswer: CorrectAnswer | null;
  topic: string;
  topicId: string;
  issues: ImportValidationIssue[];
};

export type WorkbookAnalysis = {
  questions: ParsedWorkbookQuestion[];
  sheetSummary: SheetSummary[];
  issues: ImportValidationIssue[];
};

export type UploadedImportFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  temporaryPath?: string;
};

export type AnalyzeImportRequest = {
  createdBy: string;
  excel: UploadedImportFile;
  pdf?: UploadedImportFile;
  images?: UploadedImportFile[];
  startQuestionNumber?: number;
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
