import { randomUUID } from "node:crypto";
import { db } from "../../database/client.js";

type EmailVerificationRecord = {
  id: string;
  email: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  used_at: string | null;
  created_at: string;
};

const deletePendingCodesStatement = db.prepare(`
  DELETE FROM email_verification_codes
  WHERE email = @email AND used_at IS NULL
`);

const createCodeStatement = db.prepare(`
  INSERT INTO email_verification_codes (
    id, email, code_hash, expires_at, attempts, used_at, created_at
  ) VALUES (
    @id, @email, @codeHash, @expiresAt, 0, NULL, @createdAt
  )
`);

const findLatestCodeStatement = db.prepare<string, EmailVerificationRecord>(`
  SELECT * FROM email_verification_codes
  WHERE email = ? AND used_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
`);

const findMostRecentCodeStatement = db.prepare<string, EmailVerificationRecord>(`
  SELECT * FROM email_verification_codes
  WHERE email = ?
  ORDER BY created_at DESC
  LIMIT 1
`);

const incrementAttemptsStatement = db.prepare(`
  UPDATE email_verification_codes
  SET attempts = attempts + 1
  WHERE id = @id AND used_at IS NULL
`);

const consumeCodeStatement = db.prepare(`
  UPDATE email_verification_codes
  SET used_at = @usedAt
  WHERE id = @id AND used_at IS NULL
`);

const deleteCodeStatement = db.prepare("DELETE FROM email_verification_codes WHERE id = ?");

export const createEmailVerificationCode = async (input: {
  codeHash: string;
  email: string;
  expiresAt: string;
}) => {
  const now = new Date().toISOString();
  const id = randomUUID();
  await db.transaction(async () => {
    await deletePendingCodesStatement.run({ email: input.email });
    await createCodeStatement.run({
      codeHash: input.codeHash,
      createdAt: now,
      email: input.email,
      expiresAt: input.expiresAt,
      id
    });
  });
  return id;
};

export const findLatestEmailVerificationCode = async (email: string) =>
  (await findLatestCodeStatement.get(email)) ?? null;

export const findMostRecentEmailVerificationCode = async (email: string) =>
  (await findMostRecentCodeStatement.get(email)) ?? null;

export const incrementEmailVerificationAttempts = async (id: string) => {
  await incrementAttemptsStatement.run({ id });
};

export const consumeEmailVerificationCode = async (id: string) => {
  const result = await consumeCodeStatement.run({
    id,
    usedAt: new Date().toISOString()
  });
  return result.changes === 1;
};

export const deleteEmailVerificationCode = async (id: string) => {
  await deleteCodeStatement.run(id);
};
