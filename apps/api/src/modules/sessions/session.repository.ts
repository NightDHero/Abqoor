import { db } from "../../database/client.js";
import type { CorrectAnswer } from "../questions/question.types.js";

export type SessionStatus = "active" | "completed";

export type SessionRecord = {
  session_id: string;
  user_id: string;
  question_order: string;
  created_at: string;
  updated_at: string;
  status: SessionStatus;
};

export type SessionAnswerRecord = {
  session_id: string;
  question_id: string;
  user_answer: CorrectAnswer;
  is_correct: 0 | 1;
  created_at: string;
};

const createSessionStatement = db.prepare(`
  INSERT INTO sessions (
    session_id,
    user_id,
    question_order,
    created_at,
    updated_at,
    status
  )
  VALUES (
    @sessionId,
    @userId,
    @questionOrder,
    @createdAt,
    @updatedAt,
    @status
  )
`);

const findSessionStatement = db.prepare<string, SessionRecord>(`
  SELECT session_id, user_id, question_order, created_at, updated_at, status
  FROM sessions
  WHERE session_id = ?
`);

const upsertAnswerStatement = db.prepare(`
  INSERT INTO session_answers (
    session_id,
    question_id,
    user_answer,
    is_correct,
    created_at
  )
  VALUES (
    @sessionId,
    @questionId,
    @userAnswer,
    @isCorrect,
    @createdAt
  )
  ON CONFLICT(session_id, question_id) DO UPDATE SET
    user_answer = excluded.user_answer,
    is_correct = excluded.is_correct,
    created_at = excluded.created_at
`);

const touchSessionStatement = db.prepare(`
  UPDATE sessions
  SET updated_at = @updatedAt
  WHERE session_id = @sessionId
`);

const completeSessionStatement = db.prepare(`
  UPDATE sessions
  SET status = 'completed',
      updated_at = @updatedAt
  WHERE session_id = @sessionId
    AND status != 'completed'
`);

const countSessionAnswersStatement = db.prepare<string, {
  answeredQuestions: number;
  correctAnswers: number;
}>(`
  SELECT
    COUNT(*) AS answeredQuestions,
    SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correctAnswers
  FROM session_answers
  WHERE session_id = ?
`);

const findUserAnswerHistoryStatement = db.prepare<string, SessionAnswerRecord>(`
  SELECT
    session_answers.session_id,
    session_answers.question_id,
    session_answers.user_answer,
    session_answers.is_correct,
    session_answers.created_at
  FROM session_answers
  INNER JOIN sessions ON sessions.session_id = session_answers.session_id
  WHERE sessions.user_id = ?
  ORDER BY session_answers.created_at ASC
`);

const writeSessionAnswer = (input: {
  sessionId: string;
  questionId: string;
  userAnswer: CorrectAnswer;
  isCorrect: boolean;
  createdAt: string;
}) => {
  upsertAnswerStatement.run({
    ...input,
    isCorrect: input.isCorrect ? 1 : 0
  });
  touchSessionStatement.run({
    sessionId: input.sessionId,
    updatedAt: input.createdAt
  });
};

export const createSession = (input: {
  sessionId: string;
  userId: string;
  questionOrder: string[];
  createdAt: string;
  updatedAt: string;
  status: SessionStatus;
}) => {
  createSessionStatement.run({
    ...input,
    questionOrder: JSON.stringify(input.questionOrder)
  });
  return findSession(input.sessionId);
};

export const findSession = (sessionId: string) => {
  return findSessionStatement.get(sessionId) ?? null;
};

export const saveSessionAnswer = (input: {
  sessionId: string;
  questionId: string;
  userAnswer: CorrectAnswer;
  isCorrect: boolean;
  createdAt: string;
}) => {
  const transaction = db.transaction(() => {
    writeSessionAnswer(input);
  });

  transaction();
};

export const saveSessionAnswerAndThen = <T>(
  input: {
    sessionId: string;
    questionId: string;
    userAnswer: CorrectAnswer;
    isCorrect: boolean;
    createdAt: string;
  },
  afterSave: () => T
) => {
  const transaction = db.transaction(() => {
    writeSessionAnswer(input);
    return afterSave();
  });

  return transaction();
};

export const runSessionLifecycleTransaction = <T>(operation: () => T) => {
  const transaction = db.transaction(operation);
  return transaction();
};

export const countSessionAnswers = (sessionId: string) => {
  const counts = countSessionAnswersStatement.get(sessionId);

  return {
    answeredQuestions: counts?.answeredQuestions ?? 0,
    correctAnswers: counts?.correctAnswers ?? 0
  };
};

export const findUserAnswerHistory = (userId: string) => {
  return findUserAnswerHistoryStatement.all(userId) as SessionAnswerRecord[];
};

export const markSessionCompleted = (sessionId: string) => {
  completeSessionStatement.run({
    sessionId,
    updatedAt: new Date().toISOString()
  });
};
