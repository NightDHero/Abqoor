import { db } from "../../../database/client.js";
import { questionImageExists } from "../../media/media.service.js";

type ValidationQuestionRecord = {
  id: string;
  question_image_url: string;
  image_storage_key: string | null;
  correct_answer: string;
  subject: string;
  subject_id: string | null;
  topic: string;
  topic_id: string | null;
  subtopic: string | null;
  subtopic_id: string | null;
  difficulty: number;
  difficulty_score: number | null;
};

type LatestImportJobRecord = {
  failure_count: number;
} | undefined;

const importedQuestionsStatement = db.prepare(`
  SELECT
    id,
    question_image_url,
    image_storage_key,
    correct_answer,
    subject,
    subject_id,
    topic,
    topic_id,
    subtopic,
    subtopic_id,
    difficulty,
    difficulty_score
  FROM questions
  WHERE source = 'pdf'
  ORDER BY id ASC
`);

const totalQuestionsStatement = db.prepare(`
  SELECT COUNT(*) AS totalQuestions
  FROM questions
`);

const latestImportJobStatement = db.prepare(`
  SELECT failure_count
  FROM import_jobs
  WHERE status != 'preview'
  ORDER BY created_at DESC
  LIMIT 1
`);

const toDerivedQuestionNumber = (questionId: string) => {
  const match = /^Q-(\d+)$/.exec(questionId);
  return match ? Number(match[1]) : null;
};

const toValidationQuestion = (record: ValidationQuestionRecord) => {
  const questionNumber = toDerivedQuestionNumber(record.id);

  return {
    id: record.id,
    question_image_url: record.question_image_url,
    correct_answer: record.correct_answer,
    subject: record.subject,
    subject_id: record.subject_id,
    topic: record.topic,
    topic_id: record.topic_id,
    subtopic: record.subtopic,
    subtopic_id: record.subtopic_id,
    difficulty: record.difficulty,
    difficulty_score: record.difficulty_score,
    pdfPageNumber: questionNumber,
    excelRowNumber: questionNumber === null ? null : questionNumber + 1,
    imageExists: Boolean(record.image_storage_key) || questionImageExists(record.id)
  };
};

export const getValidationQuestions = () => {
  return (importedQuestionsStatement.all() as ValidationQuestionRecord[]).map(
    toValidationQuestion
  );
};

export const getValidationSummary = () => {
  const questions = getValidationQuestions();
  const total = totalQuestionsStatement.get() as { totalQuestions: number };
  const latestImportJob =
    latestImportJobStatement.get() as LatestImportJobRecord;

  return {
    totalQuestions: total.totalQuestions,
    importedQuestions: questions.length,
    failedQuestions: latestImportJob?.failure_count ?? 0,
    missingCorrectAnswers: questions.filter(
      (question) => !["A", "B", "C", "D"].includes(question.correct_answer)
    ).length,
    missingImages: questions.filter(
      (question) => !question.question_image_url || !question.imageExists
    ).length,
    missingSubjects: questions.filter((question) => !question.subject_id).length,
    missingTopics: questions.filter((question) => !question.topic_id).length,
    missingSubtopics: questions.filter(
      (question) => question.subject_id === "math" && !question.subtopic_id
    ).length,
    missingDifficulty: questions.filter(
      (question) =>
        question.difficulty_score === null ||
        !Number.isInteger(question.difficulty_score) ||
        question.difficulty_score < 1 ||
        question.difficulty_score > 10
    ).length
  };
};
