export const id = "003_student_study_plan";

export const sql = `
  ALTER TABLE student_profiles
    ADD COLUMN IF NOT EXISTS study_plan_start_date TEXT,
    ADD COLUMN IF NOT EXISTS weekly_rest_days_json TEXT NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS study_plan_bank_count INTEGER,
    ADD COLUMN IF NOT EXISTS study_plan_study_days INTEGER,
    ADD COLUMN IF NOT EXISTS study_plan_calendar_days INTEGER,
    ADD COLUMN IF NOT EXISTS study_plan_completion_date TEXT;
`;
