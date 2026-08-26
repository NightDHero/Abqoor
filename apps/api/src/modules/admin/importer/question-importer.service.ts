import { writeQuestionImage, questionImageExists } from "../../media/media.service.js";
import { findQuestionById } from "../../questions/question.repository.js";
import { saveQuestion } from "../../questions/question.service.js";
import { readArabicExcelRows } from "./adapters/excel.adapter.js";
import {
  getPdfPageCount,
  renderPdfPageToPng,
  selectPdfPages
} from "./adapters/pdf.adapter.js";
import { createImportJob } from "./import-job.repository.js";
import {
  mapMetadataRows,
  mapPdfPageTarget,
  mapPdfPageToQuestion,
  validateCommitQuestion
} from "./question-format.mapper.js";
import type {
  ImportJobStatus,
  ImportManifestItem,
  ImportRequest,
  MetadataAdapterResult,
  RawMetadataAdapterResult
} from "./importer.types.js";

export class ImporterError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

const validateImportRequest = (request: ImportRequest) => {
  if (!Number.isInteger(request.startQuestionNumber) || request.startQuestionNumber < 1) {
    throw new ImporterError("startQuestionNumber must be a positive integer.");
  }

  if (request.mode !== "preview" && request.mode !== "commit") {
    throw new ImporterError("mode must be preview or commit.");
  }

  if (!request.topic.trim()) {
    throw new ImporterError("topic is required.");
  }

  if (!Number.isInteger(request.difficulty) || request.difficulty < 1 || request.difficulty > 10) {
    throw new ImporterError("difficulty must be an integer from 1 to 10.");
  }

  if (request.metadataSource === "excel" && !request.excelBuffer) {
    throw new ImporterError("Excel metadata file is required for Excel imports.");
  }
};

const readMetadata = async (
  request: ImportRequest
): Promise<MetadataAdapterResult> => {
  let rawResult: RawMetadataAdapterResult;

  rawResult = await readArabicExcelRows(request.excelBuffer as Buffer);
  const mapped = mapMetadataRows(rawResult.rows, {
    correctAnswerColumnIndex: 6,
    answerColumnLabel: "G",
    subject: request.subject,
    subjectId: request.subjectId,
    topic: request.topic,
    topicId: request.topicId,
    subtopicId: request.subtopicId,
    difficulty: request.difficulty,
    difficultyScore: request.difficultyScore
  });

  return {
    ...mapped,
    globalErrors: [...rawResult.globalErrors, ...mapped.globalErrors]
  };
};

const getJobStatus = (
  mode: ImportRequest["mode"],
  successCount: number
): ImportJobStatus => {
  if (mode === "preview") {
    return "ready";
  }

  return successCount > 0 ? "completed" : "failed";
};

const failPage = (
  page: {
    questionNumber: number;
    pageIndex: number;
  },
  error: string
): ImportManifestItem => {
  const target = mapPdfPageTarget(page);

  return {
    questionId: target.questionId,
    questionNumber: target.numericQuestionNumber,
    imageUrl: target.questionImageUrl,
    questionImageUrl: target.questionImageUrl,
    pageIndex: target.pageIndex,
    status: "failed",
    error
  };
};

export const importPdfQuestions = async (request: ImportRequest) => {
  validateImportRequest(request);

  const pageCount = await getPdfPageCount(request.pdfBuffer);
  const pages = selectPdfPages(
    pageCount,
    request.startQuestionNumber,
    request.pageRange
  );

  let metadataResult: MetadataAdapterResult;
  try {
    metadataResult = await readMetadata(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Metadata adapter failed.";
    const manifest = pages.map((page) => failPage(page, message));
    const importJob = createImportJob({
      sourceType: "pdf",
      status: "failed",
      startQuestionNumber: request.startQuestionNumber,
      createdBy: request.createdBy,
      totalPages: pages.length,
      successCount: 0,
      failureCount: manifest.length
    });

    return {
      importJob,
      manifest,
      metadataErrors: [message]
    };
  }

  const manifest: ImportManifestItem[] = [];

  for (const page of pages) {
    const metadataError = metadataResult.errorsByQuestionNumber.get(
      page.questionNumber
    );
    const metadata = metadataResult.metadataByQuestionNumber.get(
      page.questionNumber
    );

    if (metadataError) {
      manifest.push(failPage(page, metadataError));
      continue;
    }

    if (!metadata) {
      manifest.push(
        failPage(
          page,
          `Missing metadata row for question number ${page.questionNumber}.`
        )
      );
      continue;
    }

    let mappedQuestion;
    try {
      mappedQuestion = mapPdfPageToQuestion(page, metadata);
    } catch (error) {
      manifest.push(
        failPage(
          page,
          error instanceof Error ? error.message : "Question mapping failed."
        )
      );
      continue;
    }

    const existingQuestion = findQuestionById(mappedQuestion.questionId);
    if (existingQuestion && !request.overwriteExisting) {
      manifest.push(failPage(page, `Duplicate questionId ${mappedQuestion.questionId}.`));
      continue;
    }

    if (
      request.mode === "commit" &&
      questionImageExists(mappedQuestion.questionId) &&
      !request.overwriteExisting
    ) {
      manifest.push(
        failPage(page, `Duplicate question image ${mappedQuestion.questionId}.png.`)
      );
      continue;
    }

    if (request.mode === "preview") {
      manifest.push({
        questionId: mappedQuestion.questionId,
        questionNumber: mappedQuestion.numericQuestionNumber,
        imageUrl: mappedQuestion.questionImageUrl,
        questionImageUrl: mappedQuestion.questionImageUrl,
        pageIndex: mappedQuestion.pageIndex,
        correctAnswer: mappedQuestion.correctAnswer,
        subject: mappedQuestion.subject,
        subjectId: mappedQuestion.subjectId,
        topic: mappedQuestion.topic,
        topicId: mappedQuestion.topicId,
        subtopicId: mappedQuestion.subtopicId,
        difficulty: mappedQuestion.difficulty,
        difficultyScore: mappedQuestion.difficultyScore,
        status: "success"
      });
      continue;
    }

    try {
      validateCommitQuestion(mappedQuestion);
      const image = await renderPdfPageToPng(request.pdfBuffer, page.pageIndex);
      writeQuestionImage(mappedQuestion.questionId, image, {
        overwriteExisting: request.overwriteExisting
      });
      saveQuestion({
        id: mappedQuestion.questionId,
        questionImageUrl: mappedQuestion.questionImageUrl,
        correctAnswer: mappedQuestion.correctAnswer,
        subject: mappedQuestion.subject,
        subjectId: mappedQuestion.subjectId,
        topic: mappedQuestion.topic,
        topicId: mappedQuestion.topicId,
        subtopicId: mappedQuestion.subtopicId,
        difficulty: mappedQuestion.difficulty,
        difficultyScore: mappedQuestion.difficultyScore,
        source: "pdf",
        version: 1
      });

      manifest.push({
        questionId: mappedQuestion.questionId,
        questionNumber: mappedQuestion.numericQuestionNumber,
        imageUrl: mappedQuestion.questionImageUrl,
        questionImageUrl: mappedQuestion.questionImageUrl,
        pageIndex: mappedQuestion.pageIndex,
        correctAnswer: mappedQuestion.correctAnswer,
        subject: mappedQuestion.subject,
        subjectId: mappedQuestion.subjectId,
        topic: mappedQuestion.topic,
        topicId: mappedQuestion.topicId,
        subtopicId: mappedQuestion.subtopicId,
        difficulty: mappedQuestion.difficulty,
        difficultyScore: mappedQuestion.difficultyScore,
        status: "success"
      });
    } catch (error) {
      manifest.push(
        failPage(
          page,
          error instanceof Error ? error.message : "Question import failed."
        )
      );
    }
  }

  const successCount = manifest.filter((item) => item.status === "success").length;
  const failureCount = manifest.length - successCount;
  const importJob = createImportJob({
    sourceType: "pdf",
    status: getJobStatus(request.mode, successCount),
    startQuestionNumber: request.startQuestionNumber,
    createdBy: request.createdBy,
    totalPages: pages.length,
    successCount,
    failureCount
  });

  return {
    importJob,
    manifest,
    metadataErrors: metadataResult.globalErrors
  };
};
