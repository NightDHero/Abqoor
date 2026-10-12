export const id = "011_question_banks_and_password_change";

export const sql = `
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password INTEGER NOT NULL DEFAULT 0;

  CREATE TABLE IF NOT EXISTS question_banks (
    id TEXT PRIMARY KEY,
    bank_type TEXT NOT NULL CHECK (bank_type IN ('general', 'aqsam')),
    bank_key TEXT NOT NULL,
    name TEXT NOT NULL,
    subject_id TEXT CHECK (subject_id IS NULL OR subject_id IN ('math', 'arabic')),
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(bank_type, bank_key)
  );

  ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS question_scope TEXT NOT NULL DEFAULT 'general'
      CHECK (question_scope IN ('general', 'aqsam'));
  ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS bank_id TEXT REFERENCES question_banks(id);
  ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS bank_question_number INTEGER;
  ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS import_metadata_json TEXT;

  ALTER TABLE import_jobs
    ADD COLUMN IF NOT EXISTS import_type TEXT NOT NULL DEFAULT 'general'
      CHECK (import_type IN ('general', 'aqsam'));
  ALTER TABLE import_jobs
    ADD COLUMN IF NOT EXISTS bank_id TEXT REFERENCES question_banks(id);
  ALTER TABLE import_job_items
    ADD COLUMN IF NOT EXISTS metadata_json TEXT;

  CREATE INDEX IF NOT EXISTS idx_questions_scope
    ON questions(question_scope);
  CREATE INDEX IF NOT EXISTS idx_questions_bank_id
    ON questions(bank_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_bank_number
    ON questions(bank_id, bank_question_number)
    WHERE bank_id IS NOT NULL AND bank_question_number IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_import_jobs_bank_id
    ON import_jobs(bank_id);
`;
