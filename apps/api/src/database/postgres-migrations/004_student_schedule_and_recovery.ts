export const id = "004_student_schedule_and_recovery";

export const sql = `
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone_number TEXT,
    ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_number
  ON users(phone_number)
  WHERE phone_number IS NOT NULL;

  ALTER TABLE student_profiles
    ADD COLUMN IF NOT EXISTS weekly_rest_day INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS weekly_review_day INTEGER NOT NULL DEFAULT 6;

  UPDATE student_profiles
  SET weekly_rest_day = COALESCE(
    NULLIF((regexp_match(weekly_rest_days_json, '^\\s*\\[\\s*([0-6])'))[1], '')::INTEGER,
    5
  );

  UPDATE student_profiles
  SET weekly_review_day = CASE WHEN weekly_rest_day = 6 THEN 5 ELSE 6 END
  WHERE weekly_review_day = weekly_rest_day;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_weekly_rest_day_check'
    ) THEN
      ALTER TABLE student_profiles
        ADD CONSTRAINT student_profiles_weekly_rest_day_check
        CHECK (weekly_rest_day BETWEEN 0 AND 6);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_weekly_review_day_check'
    ) THEN
      ALTER TABLE student_profiles
        ADD CONSTRAINT student_profiles_weekly_review_day_check
        CHECK (weekly_review_day BETWEEN 0 AND 6);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_distinct_schedule_days_check'
    ) THEN
      ALTER TABLE student_profiles
        ADD CONSTRAINT student_profiles_distinct_schedule_days_check
        CHECK (weekly_rest_day <> weekly_review_day);
    END IF;
  END $$;

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);

  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
  ON password_reset_tokens(expires_at);
`;
