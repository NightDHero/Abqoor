export const id = "010_verified_contact_identities";

export const sql = `
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified_at TEXT;

  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone_verified_at TEXT;

  UPDATE users
  SET email_verified_at = created_at
  WHERE email_verified_at IS NULL;

  CREATE TABLE IF NOT EXISTS phone_verification_requests (
    id TEXT PRIMARY KEY,
    phone_number TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('registration', 'link')),
    user_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_phone_verification_requests_destination
  ON phone_verification_requests(phone_number, purpose, created_at);
`;
