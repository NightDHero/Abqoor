import { randomUUID } from "node:crypto";
import { db } from "../../database/client.js";

export type AuthSessionRecord = {
  id: string;
  user_id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
};

const createStatement = db.prepare(`
  INSERT INTO auth_sessions (id, user_id, created_at, last_seen_at, expires_at, revoked_at)
  VALUES (@id, @userId, @createdAt, @createdAt, @expiresAt, NULL)
`);
const findStatement = db.prepare<string, AuthSessionRecord>(
  "SELECT * FROM auth_sessions WHERE id = ?"
);
const touchStatement = db.prepare(`
  UPDATE auth_sessions SET last_seen_at = @lastSeenAt
  WHERE id = @id AND revoked_at IS NULL
`);
const revokeStatement = db.prepare(`
  UPDATE auth_sessions SET revoked_at = @revokedAt
  WHERE id = @id AND revoked_at IS NULL
`);
const revokeUserStatement = db.prepare(`
  UPDATE auth_sessions SET revoked_at = @revokedAt
  WHERE user_id = @userId AND revoked_at IS NULL
`);
const cleanupStatement = db.prepare(`
  DELETE FROM auth_sessions
  WHERE expires_at <= @now OR revoked_at IS NOT NULL
`);

export const createAuthSession = async (userId: string, expiresAt: string) => {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await cleanupStatement.run({ now: createdAt });
  await createStatement.run({ createdAt, expiresAt, id, userId });
  return { createdAt, expiresAt, id };
};

export const findAuthSession = async (id: string) =>
  (await findStatement.get(id)) ?? null;

export const touchAuthSession = async (id: string, lastSeenAt: string) => {
  await touchStatement.run({ id, lastSeenAt });
};

export const revokeAuthSession = async (id: string) => {
  await revokeStatement.run({ id, revokedAt: new Date().toISOString() });
};

export const revokeUserAuthSessions = async (userId: string) => {
  await revokeUserStatement.run({ revokedAt: new Date().toISOString(), userId });
};
