import { randomUUID } from "node:crypto";
import { db } from "../../database/client.js";

export type SourcePdfStatus = "uploaded" | "failed";

export type SourcePdfRecord = {
  id: string;
  original_filename: string;
  storage_key: string;
  uploaded_at: string;
  file_size: number;
  page_count: number | null;
  status: SourcePdfStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

const insertSourcePdfStatement = db.prepare(`
  INSERT INTO source_pdfs (
    id,
    original_filename,
    storage_key,
    uploaded_at,
    file_size,
    page_count,
    status,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    @id,
    @originalFilename,
    @storageKey,
    @uploadedAt,
    @fileSize,
    @pageCount,
    @status,
    @createdBy,
    @createdAt,
    @updatedAt
  )
`);

const findSourcePdfByIdStatement = db.prepare<string, SourcePdfRecord>(
  "SELECT * FROM source_pdfs WHERE id = ?"
);

export const createSourcePdf = (input: {
  createdBy: string;
  fileSize: number;
  id?: string;
  originalFilename: string;
  pageCount: number | null;
  storageKey: string;
  status?: SourcePdfStatus;
}) => {
  const now = new Date().toISOString();
  const record = {
    createdAt: now,
    createdBy: input.createdBy,
    fileSize: input.fileSize,
    id: input.id ?? randomUUID(),
    originalFilename: input.originalFilename,
    pageCount: input.pageCount,
    status: input.status ?? "uploaded",
    storageKey: input.storageKey,
    updatedAt: now,
    uploadedAt: now
  };

  insertSourcePdfStatement.run(record);
  return findSourcePdfById(record.id) as SourcePdfRecord;
};

export const findSourcePdfById = (id: string) => {
  return findSourcePdfByIdStatement.get(id) ?? null;
};
