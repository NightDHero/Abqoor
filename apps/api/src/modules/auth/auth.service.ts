import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import {
  createUser,
  findUserByEmail,
  findUserById
} from "./auth.repository.js";
import type { AuthTokenPayload } from "./auth.types.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMinLength = 8;

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const validateCredentials = (email: string, password: string) => {
  if (!emailPattern.test(email)) {
    throw new AuthError("A valid email is required.");
  }

  if (password.length < passwordMinLength) {
    throw new AuthError(
      `Password must be at least ${passwordMinLength} characters.`
    );
  }
};

export const registerUser = async (emailInput: string, password: string) => {
  const email = normalizeEmail(emailInput);
  validateCredentials(email, password);

  if (findUserByEmail(email)) {
    throw new AuthError("Email is already registered.", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return createUser(email, passwordHash);
};

export const loginUser = async (emailInput: string, password: string) => {
  const email = normalizeEmail(emailInput);
  const user = findUserByEmail(email);

  if (!user) {
    throw new AuthError("Invalid email or password.", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AuthError("Invalid email or password.", 401);
  }

  return user;
};

export const createSessionToken = (payload: AuthTokenPayload) => {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
};

export const verifySessionToken = (token: string) => {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
};

export const getUserFromToken = (token: string) => {
  const payload = verifySessionToken(token);
  return findUserById(payload.sub);
};

