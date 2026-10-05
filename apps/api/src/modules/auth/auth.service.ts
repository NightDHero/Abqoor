import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByPhone,
  updateUserPhoneNumber,
  updateUserPasswordAndInvalidateSessions
} from "./auth.repository.js";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  deletePasswordResetToken
} from "./password-reset.repository.js";
import { sendPasswordResetEmail } from "./password-reset-email.service.js";
import type { AuthTokenPayload } from "./auth.types.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const passwordMinLength = 12;
const commonPasswords = new Set([
  "111111111111",
  "123456789012",
  "password1234",
  "qwerty123456",
  "admin12345678",
  "welcome12345",
  "abcdefgh1234"
]);

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const normalizePhoneNumber = (phoneNumber: string) => {
  const compact = phoneNumber.trim().replace(/[\s()-]/g, "");
  const digits = compact.replace(/^\+/, "");
  let normalized: string;

  if (/^00966\d{9}$/.test(digits)) normalized = `+${digits.slice(2)}`;
  else if (/^966\d{9}$/.test(digits)) normalized = `+${digits}`;
  else if (/^05\d{8}$/.test(digits)) normalized = `+966${digits.slice(1)}`;
  else if (/^5\d{8}$/.test(digits)) normalized = `+966${digits}`;
  else if (/^\d{8,15}$/.test(digits)) normalized = `+${digits}`;
  else throw new AuthError("رقم الجوال غير صالح.");

  return normalized;
};

export const validatePassword = (password: string) => {
  const normalized = password.trim().toLowerCase();
  if (password.length < passwordMinLength || commonPasswords.has(normalized)) {
    throw new AuthError(
      `كلمة المرور يجب أن تكون قوية وألا تقل عن ${passwordMinLength.toLocaleString("ar-SA")} حرفاً.`
    );
  }
};

const validateCredentials = (email: string, password: string) => {
  if (!emailPattern.test(email)) {
    throw new AuthError("البريد الإلكتروني غير صالح.");
  }

  validatePassword(password);
};

export const registerUser = async (
  emailInput: string,
  password: string,
  phoneNumberInput?: string
) => {
  const email = normalizeEmail(emailInput);
  validateCredentials(email, password);
  const phoneNumber = phoneNumberInput
    ? normalizePhoneNumber(phoneNumberInput)
    : null;

  if (
    (await findUserByEmail(email)) ||
    (phoneNumber && (await findUserByPhone(phoneNumber)))
  ) {
    throw new AuthError("البريد الإلكتروني أو رقم الجوال مستخدم بالفعل.", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return createUser(email, passwordHash, phoneNumber);
};

export const registerStudent = async (input: {
  email: string;
  password: string;
  passwordConfirmation: string;
  phoneNumber: string;
}) => {
  if (input.password !== input.passwordConfirmation) {
    throw new AuthError("كلمة المرور وتأكيدها غير متطابقين.");
  }

  return registerUser(input.email, input.password, input.phoneNumber);
};

export const loginUser = async (emailInput: string, password: string) => {
  const email = normalizeEmail(emailInput);
  const user = await findUserByEmail(email);

  if (!user) {
    throw new AuthError("Invalid email or password.", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AuthError("Invalid email or password.", 401);
  }

  return user;
};

export const addPhoneNumber = async (
  userId: string,
  phoneNumberInput: string,
  password: string
) => {
  const user = await findUserById(userId);
  if (!user) throw new AuthError("تسجيل الدخول مطلوب.", 401);

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) throw new AuthError("كلمة المرور غير صحيحة.", 401);

  const phoneNumber = normalizePhoneNumber(phoneNumberInput);
  if (user.phone_number === phoneNumber) return user;

  const existingUser = await findUserByPhone(phoneNumber);
  if (existingUser && existingUser.id !== user.id) {
    throw new AuthError("رقم الجوال مستخدم بالفعل.", 409);
  }
  return updateUserPhoneNumber(user.id, phoneNumber);
};

export const createSessionToken = (payload: AuthTokenPayload) => {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
};

export const verifySessionToken = (token: string) => {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
};

export const getUserFromToken = async (token: string) => {
  const payload = verifySessionToken(token);
  const user = await findUserById(payload.sub);
  if (!user || (payload.ver ?? 0) !== user.session_version) return null;
  return user;
};

const hashResetToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const requestPasswordReset = async (
  emailInput: string,
  phoneNumberInput: string,
  deliver: (input: { email: string; resetUrl: string }) => Promise<boolean> =
    sendPasswordResetEmail
) => {
  let email: string;
  let phoneNumber: string;
  try {
    email = normalizeEmail(emailInput);
    phoneNumber = normalizePhoneNumber(phoneNumberInput);
  } catch {
    return;
  }

  const user = await findUserByEmail(email);
  if (!user || user.phone_number !== phoneNumber) return;

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(
    Date.now() + env.passwordResetTokenTtlMinutes * 60 * 1000
  ).toISOString();
  await createPasswordResetToken({ expiresAt, tokenHash, userId: user.id });

  const baseUrl = env.passwordResetUrlBase;
  if (!baseUrl) {
    await deletePasswordResetToken(tokenHash);
    return;
  }

  const delivered = await deliver({
    email: user.email,
    resetUrl: `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`
  }).catch(() => false);
  if (!delivered) await deletePasswordResetToken(tokenHash);
};

export const resetPassword = async (input: {
  password: string;
  passwordConfirmation: string;
  token: string;
}) => {
  if (input.password !== input.passwordConfirmation) {
    throw new AuthError("كلمة المرور وتأكيدها غير متطابقين.");
  }
  validatePassword(input.password);
  if (!input.token.trim()) throw new AuthError("رابط الاستعادة غير صالح أو منتهي.");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await consumePasswordResetToken(
    hashResetToken(input.token),
    (userId) => updateUserPasswordAndInvalidateSessions(userId, passwordHash)
  );
  if (!user) throw new AuthError("رابط الاستعادة غير صالح أو منتهي.", 400);
  return user;
};
