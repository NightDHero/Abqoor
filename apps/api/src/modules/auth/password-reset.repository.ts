import { randomUUID } from "node:crypto";
import { db } from "../../database/client.js";
import type { UserRecord } from "./auth.types.js";

type PasswordResetRecord = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

const createTokenStatement = db.prepare(`
  INSERT INTO password_reset_tokens (
    id, user_id, token_hash, expires_at, used_at, created_at
  ) VALUES (
    @id, @userId, @tokenHash, @expiresAt, NULL, @createdAt
  )
`);

const findTokenStatement = db.prepare<string, PasswordResetRecord>(`
  SELECT id, user_id, token_hash, expires_at, used_at, created_at
  FROM password_reset_tokens
  WHERE token_hash = ?
`);

const useTokenStatement = db.prepare(`
  UPDATE password_reset_tokens
  SET used_at = @usedAt
  WHERE id = @id AND used_at IS NULL AND expires_at > @usedAt
`);

const invalidateUserTokensStatement = db.prepare(`
  UPDATE password_reset_tokens
  SET used_at = @usedAt
  WHERE user_id = @userId AND used_at IS NULL
`);

const deleteTokenStatement = db.prepare(`
  DELETE FROM password_reset_tokens WHERE token_hash = ?
`);

export const createPasswordResetToken = async (input: {
  expiresAt: string;
  tokenHash: string;
  userId: string;
}) => {
  const createdAt = new Date().toISOString();
  await invalidateUserTokensStatement.run({
    usedAt: createdAt,
    userId: input.userId
  });
  await createTokenStatement.run({
    createdAt,
    expiresAt: input.expiresAt,
    id: randomUUID(),
    tokenHash: input.tokenHash,
    userId: input.userId
  });
};

export const deletePasswordResetToken = async (tokenHash: string) => {
  await deleteTokenStatement.run(tokenHash);
};

export const consumePasswordResetToken = async (
  tokenHash: string,
  updatePassword: (userId: string) => Promise<UserRecord>
) =>
  db.transaction(async () => {
    const record = await findTokenStatement.get(tokenHash);
    const now = new Date().toISOString();
    if (!record || record.used_at || record.expires_at <= now) return null;

    const used = await useTokenStatement.run({ id: record.id, usedAt: now });
    if (used.changes !== 1) return null;

    const user = await updatePassword(record.user_id);
    await invalidateUserTokensStatement.run({ usedAt: now, userId: record.user_id });
    return user;
  });
