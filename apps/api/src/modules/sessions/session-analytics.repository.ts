import { randomUUID } from "node:crypto";
import { db } from "../../database/client.js";
import type { Subject } from "../questions/question.types.js";

export type ExamResultRecord = {
  id: string;
  session_id: string;
  user_id: string;
  math_score: number;
  arabic_score: number;
  final_score: number;
  created_at: string;
};

export type SessionAnswerAnalyticsRecord = {
  question_id: string;
  is_correct: 0 | 1;
  subject: Subject;
};

const sessionAnswerAnalyticsStatement = db.prepare<
  string,
  SessionAnswerAnalyticsRecord
>(`
  SELECT
    session_answers.question_id,
    session_answers.is_correct,
    questions.subject
  FROM session_answers
  INNER JOIN questions ON questions.id = session_answers.question_id
  WHERE session_answers.session_id = ?
`);

const insertExamResultStatement = db.prepare(`
  INSERT INTO exam_results (
    id,
    session_id,
    user_id,
    math_score,
    arabic_score,
    final_score,
    created_at
  )
  VALUES (
    @id,
    @sessionId,
    @userId,
    @mathScore,
    @arabicScore,
    @finalScore,
    @createdAt
  )
  ON CONFLICT(session_id) DO NOTHING
`);

const findExamResultsByUserStatement = db.prepare<string, ExamResultRecord>(`
  SELECT
    id,
    session_id,
    user_id,
    math_score,
    arabic_score,
    final_score,
    created_at
  FROM exam_results
  WHERE user_id = ?
  ORDER BY created_at DESC
`);

const findExamResultByIdStatement = db.prepare<string, ExamResultRecord>(`
  SELECT
    id,
    session_id,
    user_id,
    math_score,
    arabic_score,
    final_score,
    created_at
  FROM exam_results
  WHERE id = ?
`);

const findExamResultByIdForUserStatement = db.prepare<
  { id: string; userId: string },
  ExamResultRecord
>(`
  SELECT
    id,
    session_id,
    user_id,
    math_score,
    arabic_score,
    final_score,
    created_at
  FROM exam_results
  WHERE id = @id
    AND user_id = @userId
`);

const findExamResultBySessionIdStatement = db.prepare<string, ExamResultRecord>(`
  SELECT
    id,
    session_id,
    user_id,
    math_score,
    arabic_score,
    final_score,
    created_at
  FROM exam_results
  WHERE session_id = ?
`);

export const findSessionAnswerAnalytics = (sessionId: string) => {
  return sessionAnswerAnalyticsStatement.all(sessionId);
};

export const insertExamResult = (input: {
  sessionId: string;
  userId: string;
  mathScore: number;
  arabicScore: number;
  finalScore: number;
}) => {
  const existing = findExamResultBySessionIdStatement.get(input.sessionId);

  if (existing) {
    return existing;
  }

  const record = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input
  };

  insertExamResultStatement.run(record);
  return findExamResultBySessionIdStatement.get(record.sessionId) ?? null;
};

export const findExamResultsByUser = (userId: string) => {
  return findExamResultsByUserStatement.all(userId);
};

export const findExamResultByIdForUser = (id: string, userId: string) => {
  return findExamResultByIdForUserStatement.get({ id, userId }) ?? null;
};

export const findExamResultBySessionId = (sessionId: string) => {
  return findExamResultBySessionIdStatement.get(sessionId) ?? null;
};
