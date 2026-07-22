import { Router, type Response } from "express";
import multer from "multer";
import { requireImportAdmin } from "./admin-import.middleware.js";
import { ImporterError, importPdfQuestions } from "./question-importer.service.js";
import {
  findTopicDefinition,
  isLearningSubject,
  toLegacyQuestionSubject,
  toLearningSubject
} from "../../learning-taxonomy/taxonomy.js";
import type {
  ImportMode,
  MetadataSourceType,
  PageRange
} from "./importer.types.js";

export const importerRouter = Router();

const importerUploadFileSizeLimitBytes = 120 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 2,
    fileSize: importerUploadFileSizeLimitBytes
  }
});

const fields = upload.fields([
  { name: "pdf", maxCount: 1 },
  { name: "excel", maxCount: 1 },
  { name: "excelFile", maxCount: 1 }
]);

const getField = (body: Record<string, unknown>, key: string) => {
  const value = body[key];
  return typeof value === "string" ? value.trim() : undefined;
};

const toPositiveInteger = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return false;
  }

  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
};

const parsePageRange = (body: Record<string, unknown>): PageRange | undefined => {
  const pageRange = getField(body, "pageRange");

  if (pageRange) {
    const parsed = JSON.parse(pageRange) as { from?: unknown; to?: unknown };
    const from = toPositiveInteger(parsed.from);
    const to = toPositiveInteger(parsed.to);

    if (from === null || to === null) {
      throw new ImporterError("pageRange.from and pageRange.to must be positive integers.");
    }

    return { from, to };
  }

  const from = toPositiveInteger(getField(body, "pageRangeFrom"));
  const to = toPositiveInteger(getField(body, "pageRangeTo"));

  if (from === null && to === null) {
    return undefined;
  }

  if (from === null || to === null) {
    throw new ImporterError("Both pageRangeFrom and pageRangeTo are required.");
  }

  return { from, to };
};

const getUploadedFile = (
  files: Record<string, Express.Multer.File[]> | undefined,
  field: string
) => {
  return files?.[field]?.[0];
};

const getMetadataSource = (
  body: Record<string, unknown>,
  files: Record<string, Express.Multer.File[]> | undefined
): MetadataSourceType => {
  const requestedSource = getField(body, "metadataSource");

  if (requestedSource === "excel") {
    return requestedSource;
  }

  if (requestedSource && requestedSource !== "excel") {
    throw new ImporterError("Excel is the only spreadsheet import source for the MVP.");
  }

  if (getUploadedFile(files, "excel") || getUploadedFile(files, "excelFile")) {
    return "excel";
  }

  throw new ImporterError("An Excel workbook is required for spreadsheet metadata.");
};

const handleRouteError = (error: unknown, response: Response) => {
  if (error instanceof ImporterError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (error instanceof SyntaxError) {
    response.status(400).json({ message: "Invalid pageRange JSON." });
    return;
  }

  response.status(500).json({ message: "Import request failed." });
};

importerRouter.post("/pdf", requireImportAdmin, fields, async (request, response) => {
  try {
    const files = request.files as
      | Record<string, Express.Multer.File[]>
      | undefined;
    const pdf = getUploadedFile(files, "pdf");

    if (!pdf) {
      throw new ImporterError("PDF file is required.");
    }

    const body = request.body as Record<string, unknown>;
    const mode = getField(body, "mode") as ImportMode | undefined;
    const startQuestionNumber = toPositiveInteger(
      getField(body, "startQuestionNumber")
    );
    const difficulty = toPositiveInteger(
      getField(body, "difficultyScore") ?? getField(body, "difficulty")
    );
    const requestedSubject =
      getField(body, "subjectId") ?? getField(body, "subject") ?? "arabic";
    const subjectId = toLearningSubject(requestedSubject);
    const topicId = getField(body, "topicId");
    const topic = getField(body, "topic");
    const subtopicId = getField(body, "subtopicId");
    const metadataSource = getMetadataSource(body, files);
    const excel = getUploadedFile(files, "excel") ?? getUploadedFile(files, "excelFile");

    if (!mode) {
      throw new ImporterError("mode is required.");
    }

    if (startQuestionNumber === null) {
      throw new ImporterError("startQuestionNumber must be a positive integer.");
    }

    if (!subjectId || !isLearningSubject(subjectId)) {
      throw new ImporterError("subjectId must be math or arabic.");
    }

    if (!topic && !topicId) {
      throw new ImporterError("topic or topicId is required.");
    }

    if (difficulty === null) {
      throw new ImporterError("difficulty must be an integer from 1 to 10.");
    }

    const topicDefinition = findTopicDefinition(subjectId, topicId ?? topic);
    const resolvedTopic = topic ?? topicDefinition?.displayNameAr ?? topicId;

    if (!resolvedTopic) {
      throw new ImporterError("topic or topicId is required.");
    }

    const result = await importPdfQuestions({
      pdfBuffer: pdf.buffer,
      startQuestionNumber,
      pageRange: parsePageRange(body),
      overwriteExisting: toBoolean(getField(body, "overwriteExisting")),
      mode,
      metadataSource,
      excelBuffer: excel?.buffer,
      subject: toLegacyQuestionSubject(subjectId),
      subjectId,
      topic: resolvedTopic,
      topicId: topicDefinition?.slug ?? topicId,
      subtopicId,
      difficulty,
      difficultyScore: difficulty,
      createdBy: request.user?.email ?? "unknown"
    });

    response.status(200).json(result);
  } catch (error) {
    handleRouteError(error, response);
  }
});
