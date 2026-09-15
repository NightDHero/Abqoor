import { randomUUID } from "node:crypto";
import { db } from "../../database/client.js";
import type { UserRecord } from "./auth.types.js";

const findUserByEmailStatement = db.prepare<string, UserRecord>(
  "SELECT * FROM users WHERE email = ?"
);

const findUserByIdStatement = db.prepare<string, UserRecord>(
  "SELECT * FROM users WHERE id = ?"
);

const createUserStatement = db.prepare(`
  INSERT INTO users (id, email, password_hash, created_at, updated_at)
  VALUES (@id, @email, @passwordHash, @createdAt, @updatedAt)
`);

const updateUserPasswordHashStatement = db.prepare(`
  UPDATE users
  SET password_hash = @passwordHash,
      updated_at = @updatedAt
  WHERE id = @id
`);

export const findUserByEmail = async (email: string) => {
  return (await findUserByEmailStatement.get(email.toLowerCase())) ?? null;
};

export const findUserById = async (id: string) => {
  return (await findUserByIdStatement.get(id)) ?? null;
};

export const createUser = async (email: string, passwordHash: string) => {
  const now = new Date().toISOString();
  const user = {
    id: randomUUID(),
    email: email.toLowerCase(),
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
