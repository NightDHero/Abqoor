export const id = "012_remove_phone_identity";

export const sql = `
  DROP TABLE IF EXISTS phone_verification_requests;
  DROP INDEX IF EXISTS idx_users_phone_number;

  ALTER TABLE users
    DROP COLUMN IF EXISTS phone_verified_at,
    DROP COLUMN IF EXISTS phone_number;
`;
