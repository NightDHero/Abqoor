import { getQuestionImageUrl, questionImagesPublicPath } from "../../media/media.service.js";
import {
  isLearningSubject,
  resolveQuestionClassification,
  type LearningSubject
} from "../../learning-taxonomy/taxonomy.js";
import {
  isCorrectAnswer,
  isSubject,
  toDifficulty
} from "../../questions/question.service.js";
import type {
  CorrectAnswer,
  Subject
} from "../../questions/question.types.js";
import type {
  ImportQuestionMetadata,
  MappedImportQuestion,
  MetadataAdapterResult,
  PdfQuestionPage,
  RawMetadataRow,
  UnifiedImportQuestion
} from "./importer.types.js";

type MetadataMappingOptions = {
  correctAnswerColumnIndex: number;
  answerColumnLabel: string;
  subject: Subject;
  subjectId?: LearningSubject;
  topic: string;
  topicId?: string;
  subtopicId?: string;
  difficulty: number;
  difficultyScore?: number;
};

const padQuestionNumber = (questionNumber: number) => {
  return String(questionNumber).padStart(3, "0");
};

export const toQuestionId = (questionNumber: number) => {
  return `Q-${padQuestionNumber(questionNumber)}`;
};

export const parseQuestionNumber = (value: unknown) => {
  const parsed =
    typeof value === "number" ? value : Number(String(value ?? "").trim());

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const parseCorrectAnswer = (value: unknown) => {
  const answer = String(value ?? "")
    .trim()
    .toUpperCase();
  const answerAliases: Record<string, CorrectAnswer> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    "أ": "A",
    "ا": "A",
    "إ": "A",
    "آ": "A",
    "ب": "B",
    "ج": "C",
    "د": "D"
  };

  return answerAliases[answer] ?? (isCorrectAnswer(answer) ? answer : null);
};

export const mapMetadataRows = (
  rows: RawMetadataRow[],
  options: MetadataMappingOptions
): MetadataAdapterResult => {
  const result: MetadataAdapterResult = {
    metadataByQuestionNumber: new Map<number, ImportQuestionMetadata>(),
    errorsByQuestionNumber: new Map<number, string>(),
    globalErrors: []
  };
  const difficulty = toDifficulty(options.difficulty);

  if (!isSubject(options.subject)) {
    result.globalErrors.push("Invalid subject value for metadata mapping.");
    return result;
  }

  if (!options.topic.trim()) {
    result.globalErrors.push("Missing topic for metadata mapping.");
    return result;
  }

  if (difficulty === null) {
    result.globalErrors.push("Invalid difficulty for metadata mapping.");
    return result;
  }

  if (options.subjectId && !isLearningSubject(options.subjectId)) {
    result.globalErrors.push("Invalid subjectId for metadata mapping.");
    return result;
  }

  const classification = resolveQuestionClassification({
    difficulty,
    difficultyScore: options.difficultyScore,
    legacySubject: options.subject,
    subject: options.subjectId,
    subtopicId: options.subtopicId,
    topic: options.topic,
    topicId: options.topicId
  });

  for (const row of rows) {
    const questionNumber = parseQuestionNumber(row.cells[0]);

    if (questionNumber === null) {
      result.globalErrors.push(`Invalid question number in row ${row.rowNumber}.`);
      continue;
    }

    if (result.metadataByQuestionNumber.has(questionNumber)) {
      result.errorsByQuestionNumber.set(
        questionNumber,
        `Duplicate question number ${questionNumber} in row ${row.rowNumber}.`
      );
      continue;
    }

    if (row.cells.length <= options.correctAnswerColumnIndex) {
      result.errorsByQuestionNumber.set(
        questionNumber,
        `Missing required column ${options.answerColumnLabel} for question number ${questionNumber}.`
      );
      continue;
    }

    const correctAnswer = parseCorrectAnswer(
      row.cells[options.correctAnswerColumnIndex]
    );

    if (!correctAnswer) {
      result.errorsByQuestionNumber.set(
        questionNumber,
        `Missing or invalid correctAnswer in column ${options.answerColumnLabel} for question number ${questionNumber}.`
      );
      continue;
    }

    result.metadataByQuestionNumber.set(questionNumber, {
      questionNumber,
      correctAnswer: correctAnswer as CorrectAnswer,
      subject: options.subject,
      subjectId: classification.subjectId ?? options.subjectId,
      topic: options.topic.trim(),
      topicId: classification.topicId ?? options.topicId,
      subtopicId: classification.subtopicId ?? options.subtopicId,
      difficulty,
      difficultyScore: classification.difficultyScore ?? difficulty
    });
  }

  return result;
};

export const mapPdfPageToQuestion = (
  page: PdfQuestionPage,
  metadata: ImportQuestionMetadata
): MappedImportQuestion => {
  const target = mapPdfPageTarget(page);
  const question: MappedImportQuestion = {
    ...target,
    correctAnswer: metadata.correctAnswer,
    subject: metadata.subject,
    subjectId: metadata.subjectId,
    topic: metadata.topic,
    topicId: metadata.topicId,
    subtopicId: metadata.subtopicId,
    difficulty: metadata.difficulty,
    difficultyScore: metadata.difficultyScore
  };

  validateUnifiedQuestionOutput(question);
  return question;
};

export const mapPdfPageTarget = (page: PdfQuestionPage) => {
  validatePdfPage(page);

  const questionId = toQuestionId(page.questionNumber);

  return {
    questionId,
    numericQuestionNumber: page.questionNumber,
    pageIndex: page.pageIndex,
    questionNumber: page.questionNumber,
    questionImageUrl: getQuestionImageUrl(questionId)
  };
};

export const validatePdfPage = (page: PdfQuestionPage) => {
  if (
    !Number.isInteger(page.questionNumber) ||
    page.questionNumber < 1 ||
    !Number.isInteger(page.pageIndex) ||
    page.pageIndex < 1
  ) {
    throw new Error("Malformed PDF page mapping.");
  }
};

export const validateUnifiedQuestionOutput = (
  question: UnifiedImportQuestion
) => {
  if (parseQuestionNumber(question.questionNumber) === null) {
    throw new Error("questionNumber must be a positive integer.");
  }

  if (
    typeof question.questionImageUrl !== "string" ||
    !question.questionImageUrl.startsWith(`${questionImagesPublicPath}/`) ||
    (!question.questionImageUrl.endsWith(".png") &&
      !question.questionImageUrl.endsWith(".webp"))
  ) {
    throw new Error("questionImageUrl must use the /question-images/ image path.");
  }

  if (!isCorrectAnswer(question.correctAnswer)) {
    throw new Error("correctAnswer must be one of A, B, C, D.");
  }

  if (!isSubject(question.subject)) {
    throw new Error("subject must be quantitative or verbal.");
  }

  if (question.subjectId && !isLearningSubject(question.subjectId)) {
    throw new Error("subjectId must be math or arabic.");
  }

  if (typeof question.topic !== "string" || !question.topic.trim()) {
    throw new Error("topic is required.");
  }

  if (toDifficulty(question.difficulty) === null) {
    throw new Error("difficulty must be an integer from 1 to 10.");
  }

  if (toDifficulty(question.difficultyScore ?? question.difficulty) === null) {
    throw new Error("difficultyScore must be an integer from 1 to 10.");
  }
};

export const validateCommitQuestion = (question: MappedImportQuestion) => {
  validateUnifiedQuestionOutput(question);

  if (!question.questionId.trim()) {
    throw new Error("questionId is required.");
  }

  if (
    !Number.isInteger(question.numericQuestionNumber) ||
    question.numericQuestionNumber < 1 ||
    !Number.isInteger(question.pageIndex) ||
    question.pageIndex < 1
  ) {
    throw new Error("Malformed mapped question page.");
  }

  if (toQuestionId(question.numericQuestionNumber) !== question.questionId) {
    throw new Error("questionId does not match questionNumber.");
  }
};
