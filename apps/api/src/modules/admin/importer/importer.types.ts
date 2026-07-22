import type { CorrectAnswer, Subject } from "../../questions/question.types.js";
import type { LearningSubject } from "../../learning-taxonomy/taxonomy.js";

export type ImportMode = "preview" | "commit";
export type ImportJobStatus = "preview" | "committed" | "failed" | "cancelled";
export type ImportSourceType = "pdf" | "excel";
export type MetadataSourceType = "excel";

export type PageRange = {
  from: number;
  to: number;
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

export type RawMetadataRow = {
  rowNumber: number;
  cells: unknown[];
};

export type RawMetadataAdapterResult = {
  rows: RawMetadataRow[];
  globalErrors: string[];
};

export type MetadataAdapterResult = {
  metadataByQuestionNumber: Map<number, ImportQuestionMetadata>;
  errorsByQuestionNumber: Map<number, string>;
  globalErrors: string[];
};

export type PdfQuestionPage = {
  questionNumber: number;
  pageIndex: number;
};

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

export type ImportJob = {
  id: string;
  sourceType: ImportSourceType;
  status: ImportJobStatus;
  startQuestionNumber: number;
  createdAt: string;
  createdBy: string;
  totalPages: number;
  successCount: number;
  failureCount: number;
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
