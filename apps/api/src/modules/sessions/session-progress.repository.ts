import { db } from "../../database/client.js";

export type SessionProgressActivityRecord = {
  session_id: string;
  answered_at: string;
  is_correct: 0 | 1;
  active_duration_seconds: number | null;
};

const findUserProgressActivityStatement = db.prepare<
  string,
  SessionProgressActivityRecord
>(`
  SELECT
    sessions.session_id,
    session_answers.created_at AS answered_at,
    session_answers.is_correct,
    session_answers.active_duration_seconds
  FROM session_answers
  INNER JOIN sessions ON sessions.session_id = session_answers.session_id
  WHERE sessions.user_id = ?
  ORDER BY session_answers.created_at ASC
`);

export const findUserProgressActivity = (userId: string) => {
  return findUserProgressActivityStatement.all(userId);
};
