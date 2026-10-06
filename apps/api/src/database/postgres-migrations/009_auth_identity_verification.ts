export const id = "009_auth_identity_verification";

export const sql = `
  CREATE TABLE IF NOT EXISTS email_verification_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    used_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email
  ON email_verification_codes(email);

  CREATE INDEX IF NOT EXISTS idx_email_verification_codes_expires_at
  ON email_verification_codes(expires_at);

  CREATE TABLE IF NOT EXISTS auth_external_identities (
    provider TEXT NOT NULL,
    provider_subject TEXT NOT NULL,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (provider, provider_subject),
    UNIQUE (provider, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_auth_external_identities_user_id
  ON auth_external_identities(user_id);
`;
