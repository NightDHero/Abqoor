export const id = "013_question_image_storage_key";

export const sql = `
  ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS image_storage_key TEXT;

  CREATE INDEX IF NOT EXISTS idx_questions_image_storage_key
    ON questions(image_storage_key);
`;
