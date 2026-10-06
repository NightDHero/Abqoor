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

const findUserByPhoneStatement = db.prepare<string, UserRecord>(
  "SELECT * FROM users WHERE phone_number = ?"
);

const findVerifiedUserByPhoneStatement = db.prepare<string, UserRecord>(
  "SELECT * FROM users WHERE phone_number = ? AND phone_verified_at IS NOT NULL"
);

const createUserStatement = db.prepare(`
  INSERT INTO users (
    id, email, email_verified_at, password_hash, phone_number,
    phone_verified_at, session_version, created_at, updated_at
  )
  VALUES (
    @id, @email, @emailVerifiedAt, @passwordHash, @phoneNumber,
    @phoneVerifiedAt, 0, @createdAt, @updatedAt
  )
`);

const updateUserPasswordHashStatement = db.prepare(`
  UPDATE users
  SET password_hash = @passwordHash,
      updated_at = @updatedAt
  WHERE id = @id
`);

const updateUserPasswordAndSessionStatement = db.prepare(`
  UPDATE users
  SET password_hash = @passwordHash,
      session_version = session_version + 1,
      updated_at = @updatedAt
  WHERE id = @id
`);

const updateUserPhoneStatement = db.prepare(`
  UPDATE users
  SET phone_number = @phoneNumber,
      phone_verified_at = @phoneVerifiedAt,
      updated_at = @updatedAt
  WHERE id = @id
`);

export const findUserByEmail = async (email: string) => {
  return (await findUserByEmailStatement.get(email.toLowerCase())) ?? null;
};

export const findUserById = async (id: string) => {
  return (await findUserByIdStatement.get(id)) ?? null;
};

export const findUserByPhone = async (phoneNumber: string) => {
  return (await findUserByPhoneStatement.get(phoneNumber)) ?? null;
};

export const findVerifiedUserByPhone = async (phoneNumber: string) => {
  return (await findVerifiedUserByPhoneStatement.get(phoneNumber)) ?? null;
};

export const createUser = async (
  email: string,
  passwordHash: string,
  phoneNumber: string | null = null,
  verification: {
    emailVerifiedAt?: string | null;
    phoneVerifiedAt?: string | null;
  } = {}
) => {
  const now = new Date().toISOString();
  const user = {
    id: randomUUID(),
    email: email.toLowerCase(),
    emailVerifiedAt: verification.emailVerifiedAt ?? now,
    passwordHash,
    phoneNumber,
    phoneVerifiedAt: verification.phoneVerifiedAt ?? null,
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

export const updateUserPhoneNumber = async (
  userId: string,
  phoneNumber: string,
  phoneVerifiedAt = new Date().toISOString()
) => {
  await updateUserPhoneStatement.run({
    id: userId,
    phoneNumber,
    phoneVerifiedAt,
    updatedAt: new Date().toISOString()
  });

  const updatedUser = await findUserById(userId);
  if (!updatedUser) throw new Error("User phone update failed.");
  return updatedUser;
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
  passwordHash: string
) => {
  await updateUserPasswordAndSessionStatement.run({
    id: userId,
    passwordHash,
    updatedAt: new Date().toISOString()
  });
  await revokeUserAuthSessions(userId);

  const updatedUser = await findUserById(userId);
  if (!updatedUser) throw new Error("User password update failed.");
  return updatedUser;
};
