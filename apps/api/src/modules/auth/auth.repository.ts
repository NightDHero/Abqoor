import { randomUUID } from "node:crypto";
import { db } from "../../database/client.js";
import type { UserRecord } from "./auth.types.js";

const findUserByEmailStatement = db.prepare<string, UserRecord>(
  "SELECT * FROM users WHERE email = ?"
);

const findUserByIdStatement = db.prepare<string, UserRecord>(
  "SELECT * FROM users WHERE id = ?"
);

const findUserByPhoneStatement = db.prepare<string, UserRecord>(
  "SELECT * FROM users WHERE phone_number = ?"
);

const createUserStatement = db.prepare(`
  INSERT INTO users (
    id, email, password_hash, phone_number, session_version, created_at, updated_at
  )
  VALUES (
    @id, @email, @passwordHash, @phoneNumber, 0, @createdAt, @updatedAt
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
  SET phone_number = @phoneNumber, updated_at = @updatedAt
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

export const createUser = async (
  email: string,
  passwordHash: string,
  phoneNumber: string | null = null
) => {
  const now = new Date().toISOString();
  const user = {
    id: randomUUID(),
    email: email.toLowerCase(),
    passwordHash,
    phoneNumber,
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
  phoneNumber: string
) => {
  await updateUserPhoneStatement.run({
    id: userId,
    phoneNumber,
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

  const updatedUser = await findUserById(userId);
  if (!updatedUser) throw new Error("User password update failed.");
  return updatedUser;
};
