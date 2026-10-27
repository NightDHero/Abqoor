export const id = "015_admin_question_bank_schema_repair";

export const sql = `
  ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS question_scope TEXT NOT NULL DEFAULT 'general';
  ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS bank_id TEXT;
  ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS bank_question_number INTEGER;
  ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS import_metadata_json TEXT;
  ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS image_storage_key TEXT;

  ALTER TABLE import_job_items
    ADD COLUMN IF NOT EXISTS question_id TEXT;
  ALTER TABLE import_job_items
    ADD COLUMN IF NOT EXISTS metadata_json TEXT;

  CREATE INDEX IF NOT EXISTS idx_questions_scope
    ON questions(question_scope);
  CREATE INDEX IF NOT EXISTS idx_questions_bank_id
    ON questions(bank_id);
  CREATE INDEX IF NOT EXISTS idx_questions_image_storage_key
    ON questions(image_storage_key);
  CREATE INDEX IF NOT EXISTS idx_import_job_items_question_id
    ON import_job_items(question_id);
`;
