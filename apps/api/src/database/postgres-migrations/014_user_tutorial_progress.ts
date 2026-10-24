export const id = "014_user_tutorial_progress";

export const sql = `
  CREATE TABLE IF NOT EXISTS user_tutorial_progress (
    user_id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'dismissed', 'completed')),
    current_step INTEGER NOT NULL DEFAULT 0 CHECK (current_step >= 0),
    completed_at TEXT,
    dismissed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_user_tutorial_progress_status
    ON user_tutorial_progress(status);
`;
