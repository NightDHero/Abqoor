export const id = "016_question_archive";

export const sql = `
  ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS archived_at TEXT;
  ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS archived_by TEXT;

  CREATE INDEX IF NOT EXISTS idx_questions_archived_at
    ON questions(archived_at);
`;
