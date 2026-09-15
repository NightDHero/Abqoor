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
  active_duration_seconds: number | null;
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

const insertAnswerStatement = db.prepare(`
  INSERT INTO session_answers (
    session_id,
    question_id,
    user_answer,
    is_correct,
    active_duration_seconds,
    created_at
  )
  VALUES (
    @sessionId,
    @questionId,
    @userAnswer,
    @isCorrect,
    @activeDurationSeconds,
    @createdAt
  )
  ON CONFLICT(session_id, question_id) DO NOTHING
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

const findSessionAnswerStatement = db.prepare<
  { questionId: string; sessionId: string },
  SessionAnswerRecord
>(`
  SELECT
    session_id,
    question_id,
    user_answer,
    is_correct,
    active_duration_seconds,
    created_at
  FROM session_answers
  WHERE session_id = @sessionId
    AND question_id = @questionId
`);

const findUserAnswerHistoryStatement = db.prepare<string, SessionAnswerRecord>(`
  SELECT
    session_answers.session_id,
    session_answers.question_id,
    session_answers.user_answer,
    session_answers.is_correct,
    session_answers.active_duration_seconds,
    session_answers.created_at
  FROM session_answers
  INNER JOIN sessions ON sessions.session_id = session_answers.session_id
  WHERE sessions.user_id = ?
  ORDER BY session_answers.created_at ASC
`);

const writeSessionAnswer = async (input: {
  sessionId: string;
  questionId: string;
  userAnswer: CorrectAnswer;
  isCorrect: boolean;
  activeDurationSeconds: number | null;
  createdAt: string;
}) => {
  const result = await insertAnswerStatement.run({
    ...input,
    isCorrect: input.isCorrect ? 1 : 0
  });

  if (result.changes === 0) {
    return false;
  }

  await touchSessionStatement.run({
    sessionId: input.sessionId,
    updatedAt: input.createdAt
  });
  return true;
};

export const createSession = async (input: {
  sessionId: string;
  userId: string;
  questionOrder: string[];
  createdAt: string;
  updatedAt: string;
  status: SessionStatus;
}) => {
  await createSessionStatement.run({
    ...input,
    questionOrder: JSON.stringify(input.questionOrder)
  });
  return findSession(input.sessionId);
};

export const findSession = async (sessionId: string) => {
  return (await findSessionStatement.get(sessionId)) ?? null;
};

export const findSessionAnswer = async (sessionId: string, questionId: string) => {
  return (await findSessionAnswerStatement.get({ questionId, sessionId })) ?? null;
};

export const saveSessionAnswer = async (input: {
  sessionId: string;
  questionId: string;
  userAnswer: CorrectAnswer;
  isCorrect: boolean;
  activeDurationSeconds: number | null;
  createdAt: string;
}) => {
  return db.transaction(() => {
    return writeSessionAnswer(input);
  });
};

export const saveSessionAnswerAndThen = async (
  input: {
    sessionId: string;
    questionId: string;
    userAnswer: CorrectAnswer;
    isCorrect: boolean;
    activeDurationSeconds: number | null;
    createdAt: string;
  },
  afterSave: () => void | Promise<void>
) => {
  return db.transaction(async () => {
    if (!(await writeSessionAnswer(input))) {
      return false;
    }

    await afterSave();
    return true;
  });
};

export const runSessionLifecycleTransaction = <T>(
  operation: () => T | Promise<T>
) => {
  return db.transaction(operation);
};

export const countSessionAnswers = async (sessionId: string) => {
  const counts = await countSessionAnswersStatement.get(sessionId);

  return {
    answeredQuestions: counts?.answeredQuestions ?? 0,
    correctAnswers: counts?.correctAnswers ?? 0
  };
};

export const findUserAnswerHistory = async (userId: string) => {
  return (await findUserAnswerHistoryStatement.all(userId)) as SessionAnswerRecord[];
};

export const markSessionCompleted = async (sessionId: string) => {
  await completeSessionStatement.run({
    sessionId,
    updatedAt: new Date().toISOString()
  });
};
