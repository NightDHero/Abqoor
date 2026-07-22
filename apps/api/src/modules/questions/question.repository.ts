import { db } from "../../database/client.js";
import type {
  QuestionFilters,
  QuestionRecord,
  QuestionWriteInput
} from "./question.types.js";

const findQuestionByIdStatement = db.prepare<string, QuestionRecord>(
  "SELECT * FROM questions WHERE id = ?"
);

const insertQuestionStatement = db.prepare(`
  INSERT INTO questions (
    id,
    question_image_url,
    correct_answer,
    subject,
    subject_id,
    topic,
    topic_id,
    subtopic,
    subtopic_id,
    difficulty,
    difficulty_score,
    source,
    version,
    created_at,
    updated_at
  )
  VALUES (
    @id,
    @questionImageUrl,
    @correctAnswer,
    @subject,
    @subjectId,
    @topic,
    @topicId,
    @subtopic,
    @subtopicId,
    @difficulty,
    @difficultyScore,
    @source,
    @version,
    @createdAt,
    @updatedAt
  )
`);

const upsertQuestionStatement = db.prepare(`
  INSERT INTO questions (
    id,
    question_image_url,
    correct_answer,
    subject,
    subject_id,
    topic,
    topic_id,
    subtopic,
    subtopic_id,
    difficulty,
    difficulty_score,
    source,
    version,
    created_at,
    updated_at
  )
  VALUES (
    @id,
    @questionImageUrl,
    @correctAnswer,
    @subject,
    @subjectId,
    @topic,
    @topicId,
    @subtopic,
    @subtopicId,
    @difficulty,
    @difficultyScore,
    @source,
    @version,
    @createdAt,
    @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    question_image_url = excluded.question_image_url,
    correct_answer = excluded.correct_answer,
    subject = excluded.subject,
    subject_id = excluded.subject_id,
    topic = excluded.topic,
    topic_id = excluded.topic_id,
    subtopic = excluded.subtopic,
    subtopic_id = excluded.subtopic_id,
    difficulty = excluded.difficulty,
    difficulty_score = excluded.difficulty_score,
    source = excluded.source,
    version = excluded.version,
    updated_at = excluded.updated_at
`);

export const findQuestionById = (id: string) => {
  return findQuestionByIdStatement.get(id) ?? null;
};

export const listQuestions = (filters: QuestionFilters = {}) => {
  const clauses: string[] = [];
  const values: Array<string | number> = [];

  if (filters.subject) {
    clauses.push("subject = ?");
    values.push(filters.subject);
  }

  if (filters.subjectId) {
    clauses.push("subject_id = ?");
    values.push(filters.subjectId);
  }

  if (filters.topic) {
    clauses.push("topic = ?");
    values.push(filters.topic);
  }

  if (filters.topicId) {
    clauses.push("topic_id = ?");
    values.push(filters.topicId);
  }

  if (filters.subtopicId) {
    clauses.push("subtopic_id = ?");
    values.push(filters.subtopicId);
  }

  if (filters.difficulty) {
    clauses.push("difficulty = ?");
    values.push(filters.difficulty);
  }

  if (filters.difficultyScore) {
    clauses.push("difficulty_score = ?");
    values.push(filters.difficultyScore);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(`SELECT * FROM questions ${where} ORDER BY id ASC`)
    .all(...values) as QuestionRecord[];
};

export const insertQuestion = (question: QuestionWriteInput) => {
  const now = new Date().toISOString();

  insertQuestionStatement.run({
    ...question,
    difficultyScore: question.difficultyScore ?? question.difficulty,
    subjectId: question.subjectId ?? null,
    subtopicId: question.subtopicId ?? null,
    subtopic: question.subtopic ?? null,
    topicId: question.topicId ?? null,
    createdAt: now,
    updatedAt: now
  });

  return findQuestionById(question.id);
};

export const upsertQuestion = (question: QuestionWriteInput) => {
  const existing = findQuestionById(question.id);
  const now = new Date().toISOString();

  upsertQuestionStatement.run({
    ...question,
    difficultyScore: question.difficultyScore ?? question.difficulty,
    subjectId: question.subjectId ?? null,
    subtopicId: question.subtopicId ?? null,
    subtopic: question.subtopic ?? null,
    topicId: question.topicId ?? null,
    createdAt: existing?.created_at ?? now,
    updatedAt: now
  });

  return findQuestionById(question.id);
};
