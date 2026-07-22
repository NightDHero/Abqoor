import { randomUUID } from "node:crypto";
import { db } from "../../../database/client.js";
import type { ImportJob, ImportJobStatus, ImportSourceType } from "./importer.types.js";

type ImportJobRecord = {
  id: string;
  source_type: ImportSourceType;
  status: ImportJobStatus;
  start_question_number: number;
  created_at: string;
  created_by: string;
  total_pages: number;
  success_count: number;
  failure_count: number;
};

const createImportJobStatement = db.prepare(`
  INSERT INTO import_jobs (
    id,
    source_type,
    status,
    start_question_number,
    created_at,
    created_by,
    total_pages,
    success_count,
    failure_count
  )
  VALUES (
    @id,
    @sourceType,
    @status,
    @startQuestionNumber,
    @createdAt,
    @createdBy,
    @totalPages,
    @successCount,
    @failureCount
  )
`);

const toImportJob = (record: ImportJobRecord): ImportJob => ({
  id: record.id,
  sourceType: record.source_type,
  status: record.status,
  startQuestionNumber: record.start_question_number,
  createdAt: record.created_at,
  createdBy: record.created_by,
  totalPages: record.total_pages,
  successCount: record.success_count,
  failureCount: record.failure_count
});

export const createImportJob = (input: Omit<ImportJob, "id" | "createdAt">) => {
  const record = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input
  };

  createImportJobStatement.run(record);

  return toImportJob({
    id: record.id,
    source_type: record.sourceType,
    status: record.status,
    start_question_number: record.startQuestionNumber,
    created_at: record.createdAt,
    created_by: record.createdBy,
    total_pages: record.totalPages,
    success_count: record.successCount,
    failure_count: record.failureCount
  });
};
