import { randomUUID } from "node:crypto";
import { db } from "../../../database/client.js";
import type { QuestionRecord } from "../../questions/question.types.js";
import type {
  DuplicateAction,
  ImportItemOutcome,
  ImportJob,
  ImportJobItem,
  ImportJobStatus,
  ImportSourceType,
  ImportValidationIssue,
  MediaSummary,
  SheetSummary
} from "./importer.types.js";

type ImportJobRecord = {
  id: string;
  source_type: ImportSourceType;
  status: ImportJobStatus;
  start_question_number: number | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  excel_filename: string;
  media_filename: string;
  total_pages: number;
  total_questions: number;
  success_count: number;
  failure_count: number;
  new_count: number;
  duplicate_count: number;
  created_count: number;
  replaced_count: number;
  skipped_count: number;
  processed_count: number;
  error_count: number;
  sheet_summary_json: string;
  media_summary_json: string;
  issues_json: string;
  error_message: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  rolled_back_at: string | null;
};

type ImportJobItemRecord = {
  import_job_id: string;
  question_number: number;
  question_id: string;
  sheet_name: string;
  excel_row_number: number;
  question_text: string;
  options_json: string;
  correct_answer: ImportJobItem["correctAnswer"];
  subject: ImportJobItem["subject"];
  topic: string;
  topic_id: string;
  difficulty: number;
  page_number: number | null;
  source_image_name: string | null;
  image_status: ImportJobItem["imageStatus"];
  validation_status: ImportJobItem["validationStatus"];
  errors_json: string;
  is_duplicate: number;
  duplicate_action: DuplicateAction | null;
  outcome: ImportItemOutcome;
  previous_question_json: string | null;
  applied_question_json: string | null;
  previous_image_existed: number;
  created_at: string;
  updated_at: string;
};

const parseJson = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const emptyMediaSummary: MediaSummary = {
  expected: 0,
  extra: 0,
  found: 0,
  matched: 0,
  missing: 0
};

const toImportJob = (record: ImportJobRecord): ImportJob => ({
  id: record.id,
  sourceType: record.source_type,
  status: record.status,
  startQuestionNumber: record.start_question_number,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
  createdBy: record.created_by,
  excelFilename: record.excel_filename,
  mediaFilename: record.media_filename,
  totalPages: record.total_pages,
  totalQuestions: record.total_questions,
  successCount: record.success_count,
  failureCount: record.failure_count,
  newCount: record.new_count,
  duplicateCount: record.duplicate_count,
  createdCount: record.created_count,
  replacedCount: record.replaced_count,
  skippedCount: record.skipped_count,
  processedCount: record.processed_count,
  errorCount: record.error_count,
  sheetSummary: parseJson<SheetSummary[]>(record.sheet_summary_json, []),
  mediaSummary: parseJson<MediaSummary>(record.media_summary_json, emptyMediaSummary),
  issues: parseJson<ImportValidationIssue[]>(record.issues_json, []),
  errorMessage: record.error_message,
  confirmedAt: record.confirmed_at,
  completedAt: record.completed_at,
  rolledBackAt: record.rolled_back_at
});

const toQuestionSnapshot = (value: string | null) =>
  value ? parseJson<QuestionRecord | null>(value, null) : null;

const toImportJobItem = (record: ImportJobItemRecord): ImportJobItem => ({
  importJobId: record.import_job_id,
  questionNumber: record.question_number,
  questionId: record.question_id,
  sheetName: record.sheet_name,
  excelRowNumber: record.excel_row_number,
  questionText: record.question_text,
  options: parseJson<[string, string, string, string]>(record.options_json, ["", "", "", ""]),
  correctAnswer: record.correct_answer,
  subject: record.subject,
  topic: record.topic,
  topicId: record.topic_id,
  difficulty: record.difficulty,
  pageNumber: record.page_number,
  sourceImageName: record.source_image_name,
  imageStatus: record.image_status,
  validationStatus: record.validation_status,
  errors: parseJson<ImportValidationIssue[]>(record.errors_json, []),
  isDuplicate: record.is_duplicate === 1,
  duplicateAction: record.duplicate_action,
  outcome: record.outcome,
  previousQuestion: toQuestionSnapshot(record.previous_question_json),
  appliedQuestion: toQuestionSnapshot(record.applied_question_json),
  previousImageExisted: record.previous_image_existed === 1,
  createdAt: record.created_at,
  updatedAt: record.updated_at
});

const createImportJobStatement = db.prepare(`
  INSERT INTO import_jobs (
    id, source_type, status, start_question_number, created_at, updated_at,
    created_by, excel_filename, media_filename, total_pages, total_questions,
    success_count, failure_count, new_count, duplicate_count, created_count,
    replaced_count, skipped_count, processed_count, error_count,
    sheet_summary_json, media_summary_json, issues_json, error_message,
    confirmed_at, completed_at, rolled_back_at
  )
  VALUES (
    @id, @sourceType, @status, @startQuestionNumber, @createdAt, @updatedAt,
    @createdBy, @excelFilename, @mediaFilename, @totalPages, @totalQuestions,
    @successCount, @failureCount, @newCount, @duplicateCount, @createdCount,
    @replacedCount, @skippedCount, @processedCount, @errorCount,
    @sheetSummaryJson, @mediaSummaryJson, @issuesJson, @errorMessage,
    @confirmedAt, @completedAt, @rolledBackAt
  )
`);

const findImportJobStatement = db.prepare<string, ImportJobRecord>(
  "SELECT * FROM import_jobs WHERE id = ?"
);

const listImportJobsStatement = db.prepare<[], ImportJobRecord>(`
  SELECT * FROM import_jobs ORDER BY created_at DESC
`);

const insertImportItemStatement = db.prepare(`
  INSERT INTO import_job_items (
    import_job_id, question_number, question_id, sheet_name, excel_row_number,
    question_text, options_json, correct_answer, subject, topic, topic_id,
    difficulty, page_number, source_image_name, image_status, validation_status,
    errors_json, is_duplicate, duplicate_action, outcome, previous_question_json,
    applied_question_json, previous_image_existed, created_at, updated_at
  )
  VALUES (
    @importJobId, @questionNumber, @questionId, @sheetName, @excelRowNumber,
    @questionText, @optionsJson, @correctAnswer, @subject, @topic, @topicId,
    @difficulty, @pageNumber, @sourceImageName, @imageStatus, @validationStatus,
    @errorsJson, @isDuplicate, @duplicateAction, @outcome, @previousQuestionJson,
    @appliedQuestionJson, @previousImageExisted, @createdAt, @updatedAt
  )
`);

const listImportItemsStatement = db.prepare<string, ImportJobItemRecord>(`
  SELECT * FROM import_job_items
  WHERE import_job_id = ?
  ORDER BY question_number ASC
`);

const updateAnalysisStatement = db.prepare(`
  UPDATE import_jobs
  SET
    status = @status,
    updated_at = @updatedAt,
    total_pages = @totalPages,
    total_questions = @totalQuestions,
    success_count = @successCount,
    failure_count = @failureCount,
    new_count = @newCount,
    duplicate_count = @duplicateCount,
    error_count = @errorCount,
    sheet_summary_json = @sheetSummaryJson,
    media_summary_json = @mediaSummaryJson,
    issues_json = @issuesJson,
    error_message = @errorMessage
  WHERE id = @id
`);

const markImportingStatement = db.prepare(`
  UPDATE import_jobs
  SET status = 'importing', confirmed_at = @now, updated_at = @now,
      processed_count = 0, error_message = NULL
  WHERE id = @id AND status = 'ready'
`);

const completeImportStatement = db.prepare(`
  UPDATE import_jobs
  SET status = 'completed', updated_at = @now, completed_at = @now,
      processed_count = @processedCount, success_count = @successCount,
      failure_count = @failureCount, created_count = @createdCount,
      replaced_count = @replacedCount, skipped_count = @skippedCount,
      error_message = NULL
  WHERE id = @id
`);

const failImportStatement = db.prepare(`
  UPDATE import_jobs
  SET status = 'failed', updated_at = @now, error_message = @message
  WHERE id = @id
`);

const cancelImportStatement = db.prepare(`
  UPDATE import_jobs
  SET status = 'cancelled', updated_at = @now
  WHERE id = @id AND status IN ('analyzing', 'ready')
`);

const rollbackImportStatement = db.prepare(`
  UPDATE import_jobs
  SET status = 'rolled_back', updated_at = @now, rolled_back_at = @now
  WHERE id = @id AND status = 'completed'
`);

const updateImportItemStatement = db.prepare(`
  UPDATE import_job_items
  SET duplicate_action = @duplicateAction,
      outcome = @outcome,
      previous_question_json = @previousQuestionJson,
      applied_question_json = @appliedQuestionJson,
      previous_image_existed = @previousImageExisted,
      updated_at = @updatedAt
  WHERE import_job_id = @importJobId AND question_number = @questionNumber
`);

export const createImportJob = (input: {
  sourceType: ImportSourceType;
  status: ImportJobStatus;
  startQuestionNumber: number | null;
  createdBy: string;
  totalPages?: number;
  successCount?: number;
  failureCount?: number;
  excelFilename?: string;
  mediaFilename?: string;
}) => {
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    sourceType: input.sourceType,
    status: input.status,
    startQuestionNumber: input.startQuestionNumber,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
    excelFilename: input.excelFilename ?? "",
    mediaFilename: input.mediaFilename ?? "",
    totalPages: input.totalPages ?? 0,
    totalQuestions: input.totalPages ?? 0,
    successCount: input.successCount ?? 0,
    failureCount: input.failureCount ?? 0,
    newCount: input.successCount ?? 0,
    duplicateCount: 0,
    createdCount: 0,
    replacedCount: 0,
    skippedCount: 0,
    processedCount: 0,
    errorCount: input.failureCount ?? 0,
    sheetSummaryJson: "[]",
    mediaSummaryJson: JSON.stringify(emptyMediaSummary),
    issuesJson: "[]",
    errorMessage: null,
    confirmedAt: null,
    completedAt: null,
    rolledBackAt: null
  };

  createImportJobStatement.run(record);
  return findImportJob(record.id) as ImportJob;
};

export const findImportJob = (id: string) => {
  const record = findImportJobStatement.get(id);
  return record ? toImportJob(record) : null;
};

export const listImportJobs = () => listImportJobsStatement.all().map(toImportJob);

export const insertImportItems = (items: ImportJobItem[]) => {
  const insertAll = db.transaction(() => {
    for (const item of items) {
      insertImportItemStatement.run({
        ...item,
        optionsJson: JSON.stringify(item.options),
        errorsJson: JSON.stringify(item.errors),
        isDuplicate: item.isDuplicate ? 1 : 0,
        previousQuestionJson: item.previousQuestion
          ? JSON.stringify(item.previousQuestion)
          : null,
        appliedQuestionJson: item.appliedQuestion
          ? JSON.stringify(item.appliedQuestion)
          : null,
        previousImageExisted: item.previousImageExisted ? 1 : 0
      });
    }
  });
  insertAll();
};

export const listImportJobItems = (jobId: string) =>
  listImportItemsStatement.all(jobId).map(toImportJobItem);

export const completeImportAnalysis = (input: {
  id: string;
  status: "ready" | "failed";
  totalPages: number;
  totalQuestions: number;
  successCount: number;
  failureCount: number;
  newCount: number;
  duplicateCount: number;
  errorCount: number;
  sheetSummary: SheetSummary[];
  mediaSummary: MediaSummary;
  issues: ImportValidationIssue[];
  errorMessage?: string | null;
}) => {
  updateAnalysisStatement.run({
    ...input,
    updatedAt: new Date().toISOString(),
    sheetSummaryJson: JSON.stringify(input.sheetSummary),
    mediaSummaryJson: JSON.stringify(input.mediaSummary),
    issuesJson: JSON.stringify(input.issues),
    errorMessage: input.errorMessage ?? null
  });
  return findImportJob(input.id);
};

export const markImportJobImporting = (id: string) =>
  markImportingStatement.run({ id, now: new Date().toISOString() }).changes > 0;

export const completeImportJob = (input: {
  id: string;
  processedCount: number;
  successCount: number;
  failureCount: number;
  createdCount: number;
  replacedCount: number;
  skippedCount: number;
}) => {
  completeImportStatement.run({ ...input, now: new Date().toISOString() });
};

export const failImportJob = (id: string, message: string) => {
  failImportStatement.run({ id, message, now: new Date().toISOString() });
};

export const cancelImportJob = (id: string) =>
  cancelImportStatement.run({ id, now: new Date().toISOString() }).changes > 0;

export const markImportJobRolledBack = (id: string) =>
  rollbackImportStatement.run({ id, now: new Date().toISOString() }).changes > 0;

export const updateImportItemResult = (input: {
  importJobId: string;
  questionNumber: number;
  duplicateAction: DuplicateAction | null;
  outcome: ImportItemOutcome;
  previousQuestion: QuestionRecord | null;
  appliedQuestion: QuestionRecord | null;
  previousImageExisted: boolean;
}) => {
  updateImportItemStatement.run({
    ...input,
    previousQuestionJson: input.previousQuestion
      ? JSON.stringify(input.previousQuestion)
      : null,
    appliedQuestionJson: input.appliedQuestion
      ? JSON.stringify(input.appliedQuestion)
      : null,
    previousImageExisted: input.previousImageExisted ? 1 : 0,
    updatedAt: new Date().toISOString()
  });
};

export const recoverInterruptedImportJobs = () => {
  db.prepare(`
    UPDATE import_jobs
    SET status = 'failed', updated_at = @now,
        error_message = 'توقفت عملية الاستيراد قبل اكتمال المعاملة.'
    WHERE status = 'importing'
  `).run({ now: new Date().toISOString() });
};

export const runImportTransaction = <T>(operation: () => T) =>
  db.transaction(operation)();

export const listAdminQuestions = (input: {
  query?: string;
  page: number;
  pageSize: number;
  sort: "asc" | "desc";
}) => {
  const normalizedQuery = input.query?.trim() ?? "";
  const numericQuery = /^Q-?(\d+)$/i.exec(normalizedQuery)?.[1] ??
    (/^\d+$/.test(normalizedQuery) ? normalizedQuery : null);
  const where = numericQuery ? "WHERE questions.id = @questionId" : "";
  const params = {
    questionId: numericQuery ? `Q-${String(Number(numericQuery)).padStart(3, "0")}` : null,
    limit: input.pageSize,
    offset: (input.page - 1) * input.pageSize
  };
  const order = input.sort === "desc" ? "DESC" : "ASC";
  const rows = db.prepare(`
    SELECT
      questions.id,
      questions.question_image_url AS questionImageUrl,
      questions.correct_answer AS correctAnswer,
      questions.subject,
      questions.topic,
      questions.topic_id AS topicId,
      questions.difficulty,
      questions.import_job_id AS importJobId,
      import_jobs.created_at AS importedAt,
      import_jobs.created_by AS importedBy
    FROM questions
    LEFT JOIN import_jobs ON import_jobs.id = questions.import_job_id
    ${where}
    ORDER BY CAST(SUBSTR(questions.id, 3) AS INTEGER) ${order}
    LIMIT @limit OFFSET @offset
  `).all(params);
  const count = db.prepare(`
    SELECT COUNT(*) AS count FROM questions ${where}
  `).get(params) as { count: number };

  return {
    page: input.page,
    pageSize: input.pageSize,
    total: count.count,
    questions: rows
  };
};
