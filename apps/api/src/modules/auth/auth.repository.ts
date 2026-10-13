import { randomUUID } from "node:crypto";
import { db } from "../../database/client.js";
import type { UserRecord } from "./auth.types.js";
import { revokeUserAuthSessions } from "./auth-session.repository.js";

const findUserByEmailStatement = db.prepare<string, UserRecord>(
  "SELECT * FROM users WHERE email = ?"
);

const findUserByIdStatement = db.prepare<string, UserRecord>(
  "SELECT * FROM users WHERE id = ?"
);

const createUserStatement = db.prepare(`
  INSERT INTO users (
    id, email, email_verified_at, password_hash,
    session_version, created_at, updated_at
  )
  VALUES (
    @id, @email, @emailVerifiedAt, @passwordHash,
    0, @createdAt, @updatedAt
  )
`);

const updateUserPasswordHashStatement = db.prepare(`
  UPDATE users
  SET password_hash = @passwordHash,
      must_change_password = 0,
      updated_at = @updatedAt
  WHERE id = @id
`);

const updateUserPasswordAndSessionStatement = db.prepare(`
  UPDATE users
  SET password_hash = @passwordHash,
      must_change_password = @mustChangePassword,
      session_version = session_version + 1,
      updated_at = @updatedAt
  WHERE id = @id
`);

export const findUserByEmail = async (email: string) => {
  return (await findUserByEmailStatement.get(email.toLowerCase())) ?? null;
};

export const findUserById = async (id: string) => {
  return (await findUserByIdStatement.get(id)) ?? null;
};

export const createUser = async (
  email: string,
  passwordHash: string,
  verification: {
    emailVerifiedAt?: string | null;
  } = {}
) => {
  const now = new Date().toISOString();
  const user = {
    id: randomUUID(),
    email: email.toLowerCase(),
    emailVerifiedAt: verification.emailVerifiedAt ?? now,
    passwordHash,
    createdAt: now,
    updatedAt: now
  };

  await createUserStatement.run(user);

  const createdUser = await findUserById(user.id);
  if (!createdUser) {
    throw new Error("User creation failed.");
  }

  return createdUser;
};

export const updateUserPasswordHash = async (
  userId: string,
  passwordHash: string
) => {
  await updateUserPasswordHashStatement.run({
    id: userId,
    passwordHash,
    updatedAt: new Date().toISOString()
  });

  const updatedUser = await findUserById(userId);
  if (!updatedUser) {
    throw new Error("User password update failed.");
  }

  return updatedUser;
};

export const updateUserPasswordAndInvalidateSessions = async (
  userId: string,
  passwordHash: string,
  mustChangePassword = false
) => {
  await updateUserPasswordAndSessionStatement.run({
    id: userId,
    mustChangePassword: mustChangePassword ? 1 : 0,
    passwordHash,
    updatedAt: new Date().toISOString()
  });
  await revokeUserAuthSessions(userId);

  const updatedUser = await findUserById(userId);
  if (!updatedUser) throw new Error("User password update failed.");
  return updatedUser;
};
