import { db } from "../../database/client.js";

export type SessionProgressActivityRecord = {
  session_id: string;
  question_id: string;
  answered_at: string;
  is_correct: 0 | 1;
  active_duration_seconds: number | null;
  subject: "quantitative" | "verbal";
  subject_id: "math" | "arabic" | null;
};

const findUserProgressActivityStatement = db.prepare<
  string,
  SessionProgressActivityRecord
>(`
  SELECT
    sessions.session_id,
    session_answers.question_id,
    session_answers.created_at AS answered_at,
    session_answers.is_correct,
    session_answers.active_duration_seconds,
    questions.subject,
    questions.subject_id
  FROM session_answers
  INNER JOIN sessions ON sessions.session_id = session_answers.session_id
  INNER JOIN questions ON questions.id = session_answers.question_id
  WHERE sessions.user_id = ?
  ORDER BY session_answers.created_at ASC
`);

export const findUserProgressActivity = async (userId: string) => {
  return await findUserProgressActivityStatement.all(userId);
};
