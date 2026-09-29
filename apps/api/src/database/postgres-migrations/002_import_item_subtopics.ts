export const id = "002_import_item_subtopics";

export const sql = `
  ALTER TABLE import_job_items
    ADD COLUMN IF NOT EXISTS subtopic TEXT;

  ALTER TABLE import_job_items
    ADD COLUMN IF NOT EXISTS subtopic_id TEXT;
`;
