import { questionImagesPublicPath } from "../media/media.service.js";
import {
  isLearningSubject,
  resolveQuestionClassification
} from "../learning-taxonomy/taxonomy.js";
import {
  findQuestionById,
  listQuestions,
  upsertQuestion
} from "./question.repository.js";
import {
  correctAnswers,
  questionSources,
  subjects,
  toQuestion,
  type CorrectAnswer,
  type QuestionFilters,
  type QuestionWriteInput,
  type Subject
} from "./question.types.js";

export class QuestionError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

export const isCorrectAnswer = (value: unknown): value is CorrectAnswer => {
  return typeof value === "string" && correctAnswers.includes(value as CorrectAnswer);
};

export const isSubject = (value: unknown): value is Subject => {
  return typeof value === "string" && subjects.includes(value as Subject);
};

export const toDifficulty = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : null;
};

export const isQuestionSubjectId = isLearningSubject;

const enrichQuestionInput = (question: QuestionWriteInput): QuestionWriteInput => {
  const classification = resolveQuestionClassification({
    difficulty: question.difficulty,
    difficultyScore: question.difficultyScore,
    legacySubject: question.subject,
    subject: question.subjectId,
    subtopic: question.subtopic,
    subtopicId: question.subtopicId,
    topic: question.topic,
    topicId: question.topicId
  });

  return {
    ...question,
    difficultyScore: classification.difficultyScore ?? question.difficulty,
    subjectId: classification.subjectId ?? question.subjectId,
    subtopicId: classification.subtopicId ?? question.subtopicId,
    topicId: classification.topicId ?? question.topicId
  };
};

export const validateQuestionInput = (question: QuestionWriteInput) => {
  if (!question.id.trim()) {
    throw new QuestionError("Question id is required.");
  }

  if (
    !question.questionImageUrl.startsWith(`${questionImagesPublicPath}/`) ||
    !question.questionImageUrl.endsWith(".png")
  ) {
    throw new QuestionError("question_image_url must use the /question-images/ PNG path.");
  }

  if (!isCorrectAnswer(question.correctAnswer)) {
    throw new QuestionError("correct_answer must be one of A, B, C, D.");
  }

  if (!isSubject(question.subject)) {
    throw new QuestionError("subject must be quantitative or verbal.");
  }

  if (!question.topic.trim()) {
    throw new QuestionError("topic is required.");
  }

  if (toDifficulty(question.difficulty) === null) {
    throw new QuestionError("difficulty must be an integer from 1 to 10.");
  }

  if (toDifficulty(question.difficultyScore ?? question.difficulty) === null) {
    throw new QuestionError("difficulty_score must be an integer from 1 to 10.");
  }

  if (question.subjectId && !isQuestionSubjectId(question.subjectId)) {
    throw new QuestionError("subject_id must be math or arabic.");
  }

  if (!questionSources.includes(question.source)) {
    throw new QuestionError("source is invalid.");
  }
};

export const getQuestions = (filters: QuestionFilters) => {
  return listQuestions(filters).map(toQuestion);
};

export const getQuestion = (id: string) => {
  const question = findQuestionById(id);
  return question ? toQuestion(question) : null;
};

export const saveQuestion = (question: QuestionWriteInput) => {
  const enrichedQuestion = enrichQuestionInput(question);
  validateQuestionInput(enrichedQuestion);
  const saved = upsertQuestion(enrichedQuestion);

  if (!saved) {
    throw new QuestionError("Question save failed.", 500);
  }

  return toQuestion(saved);
};
