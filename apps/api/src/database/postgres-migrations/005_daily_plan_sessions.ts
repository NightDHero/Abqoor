export const id = "005_daily_plan_sessions";

export const sql = `
  ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS subject_id TEXT,
    ADD COLUMN IF NOT EXISTS plan_date TEXT;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'sessions_subject_id_check'
    ) THEN
      ALTER TABLE sessions
        ADD CONSTRAINT sessions_subject_id_check
        CHECK (subject_id IS NULL OR subject_id IN ('math', 'arabic'));
    END IF;
  END $$;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_active_daily_plan
  ON sessions(user_id, subject_id, plan_date)
  WHERE status = 'active' AND subject_id IS NOT NULL AND plan_date IS NOT NULL;
`;
