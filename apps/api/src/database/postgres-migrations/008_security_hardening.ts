export const id = "008_security_hardening";

export const sql = `
  CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
  ON auth_sessions(user_id);

  CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
  ON auth_sessions(expires_at);

  CREATE TABLE IF NOT EXISTS security_bootstrap_state (
    bootstrap_key TEXT PRIMARY KEY,
    consumed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_security_lock (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    nonce INTEGER NOT NULL DEFAULT 0
  );

  INSERT INTO admin_security_lock (id, nonce)
  VALUES (1, 0)
  ON CONFLICT(id) DO NOTHING;

  ALTER TABLE official_exam_sections
    ADD COLUMN IF NOT EXISTS deadline_at TEXT;

  UPDATE official_exam_sections
  SET deadline_at = (started_at::timestamptz + interval '25 minutes')::text
  WHERE started_at IS NOT NULL AND deadline_at IS NULL;
`;
