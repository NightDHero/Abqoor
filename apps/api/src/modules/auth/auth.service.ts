import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByPhone,
  findVerifiedUserByPhone,
  updateUserPhoneNumber,
  updateUserPasswordAndInvalidateSessions
} from "./auth.repository.js";
import {
  createExternalIdentity,
  findExternalIdentity
} from "./external-identity.repository.js";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  deletePasswordResetToken
} from "./password-reset.repository.js";
import { sendPasswordResetEmail } from "./password-reset-email.service.js";
import type { AuthTokenPayload } from "./auth.types.js";
import {
  createAuthSession,
  findAuthSession,
  revokeAuthSession,
  revokeUserAuthSessions,
  touchAuthSession
} from "./auth-session.repository.js";

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
    public readonly statusCode = 400,
    public readonly code?: string
  ) {
    super(message);
  }
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const validateEmail = (email: string) => {
  if (!emailPattern.test(email)) {
    throw new AuthError("البريد الإلكتروني غير صالح.");
  }
};

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
  validateEmail(email);
  validatePassword(password);
};

export const registerUser = async (
  emailInput: string,
  password: string,
  phoneNumberInput?: string,
  verification: { phoneVerified?: boolean } = {}
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
  const now = new Date().toISOString();
  try {
    return await createUser(email, passwordHash, phoneNumber, {
      emailVerifiedAt: now,
      phoneVerifiedAt: verification.phoneVerified && phoneNumber ? now : null
    });
  } catch (error) {
    if (
      (await findUserByEmail(email)) ||
      (phoneNumber && (await findUserByPhone(phoneNumber)))
    ) {
      throw new AuthError("البريد الإلكتروني أو رقم الجوال مستخدم بالفعل.", 409);
    }
    throw error;
  }
};

export const registerStudent = async (input: {
  email: string;
  password: string;
  passwordConfirmation: string;
  phoneNumber: string;
  phoneVerified?: boolean;
}) => {
  if (input.password !== input.passwordConfirmation) {
    throw new AuthError("كلمة المرور وتأكيدها غير متطابقين.");
  }

  return registerUser(input.email, input.password, input.phoneNumber, {
    phoneVerified: input.phoneVerified
  });
};

export const loginUser = async (identifierInput: string, password: string) => {
  const identifier = identifierInput.trim();
  let user;
  if (identifier.includes("@")) {
    const email = normalizeEmail(identifier);
    validateEmail(email);
    user = await findUserByEmail(email);
    if (user && !user.email_verified_at) user = null;
  } else {
    try {
      user = await findVerifiedUserByPhone(normalizePhoneNumber(identifier));
    } catch {
      throw new AuthError("البريد الإلكتروني أو رقم الجوال أو كلمة المرور غير صحيحة.", 401);
    }
  }

  if (!user) {
    throw new AuthError("البريد الإلكتروني أو رقم الجوال أو كلمة المرور غير صحيحة.", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AuthError("البريد الإلكتروني أو رقم الجوال أو كلمة المرور غير صحيحة.", 401);
  }

  return user;
};

export type VerifiedGoogleIdentity = {
  email: string;
  subject: string;
};

const googleClient = new OAuth2Client();

export const verifyGoogleCredential = async (
  credential: string
): Promise<VerifiedGoogleIdentity> => {
  if (!env.googleClientId) {
    throw new AuthError("تسجيل الدخول عبر Google غير مهيأ حالياً.", 503);
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      audience: env.googleClientId,
      idToken: credential
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new Error("Unverified Google identity.");
    }
    return {
      email: normalizeEmail(payload.email),
      subject: payload.sub
    };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("تعذر التحقق من حساب Google.", 401);
  }
};

export const loginWithGoogle = async (
  credential: string,
  verify: (credential: string) => Promise<VerifiedGoogleIdentity> =
    verifyGoogleCredential
) => {
  if (!credential.trim()) {
    throw new AuthError("بيانات تسجيل الدخول عبر Google مطلوبة.");
  }
  const identity = await verify(credential);
  validateEmail(identity.email);

  const existingIdentity = await findExternalIdentity("google", identity.subject);
  if (existingIdentity) {
    const user = await findUserById(existingIdentity.user_id);
    if (!user) throw new AuthError("تعذر العثور على حساب Google المرتبط.", 401);
    return user;
  }

  let user = await findUserByEmail(identity.email);
  if (user) {
    throw new AuthError(
      "هذا البريد مرتبط بحساب عبقور. أدخل كلمة مرور الحساب لربط Google بأمان.",
      409,
      "GOOGLE_LINK_REQUIRED"
    );
  } else {
    const inaccessiblePassword = randomBytes(48).toString("base64url");
    user = await createUser(
      identity.email,
      await bcrypt.hash(inaccessiblePassword, 12),
      null
    );
  }

  try {
    await createExternalIdentity({
      email: identity.email,
      provider: "google",
      providerSubject: identity.subject,
      userId: user.id
    });
  } catch {
    throw new AuthError("حساب Google مرتبط بهوية أخرى.", 409);
  }
  return user;
};

export const linkGoogleIdentity = async (
  credential: string,
  password: string,
  verify: (credential: string) => Promise<VerifiedGoogleIdentity> =
    verifyGoogleCredential
) => {
  const identity = await verify(credential);
  const user = await findUserByEmail(identity.email);
  if (!user || !user.email_verified_at) {
    throw new AuthError("تعذر ربط حساب Google.", 401);
  }
  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AuthError("تعذر ربط حساب Google.", 401);
  }
  const existingIdentity = await findExternalIdentity("google", identity.subject);
  if (existingIdentity) {
    if (existingIdentity.user_id !== user.id) {
      throw new AuthError("حساب Google مرتبط بحساب آخر.", 409);
    }
    return user;
  }
  try {
    await createExternalIdentity({
      email: identity.email,
      provider: "google",
      providerSubject: identity.subject,
      userId: user.id
    });
  } catch {
    throw new AuthError("تعذر ربط حساب Google.", 409);
  }
  return user;
};

export const addPhoneNumber = async (
  userId: string,
  phoneNumberInput: string
) => {
  const user = await findUserById(userId);
  if (!user) throw new AuthError("تسجيل الدخول مطلوب.", 401);

  const phoneNumber = normalizePhoneNumber(phoneNumberInput);
  if (user.phone_number === phoneNumber && user.phone_verified_at) return user;

  const existingUser = await findUserByPhone(phoneNumber);
  if (existingUser && existingUser.id !== user.id) {
    throw new AuthError("رقم الجوال مستخدم بالفعل.", 409);
  }
  try {
    return await updateUserPhoneNumber(user.id, phoneNumber);
  } catch (error) {
    const conflictingUser = await findUserByPhone(phoneNumber);
    if (conflictingUser && conflictingUser.id !== user.id) {
      throw new AuthError("رقم الجوال مستخدم بالفعل.", 409);
    }
    throw error;
  }
};

export const createSessionToken = async (payload: Omit<AuthTokenPayload, "jti" | "authTime">) => {
  const now = Date.now();
  const expiresAt = new Date(
    now + env.sessionAbsoluteTtlMinutes * 60 * 1000
  ).toISOString();
  const session = await createAuthSession(payload.sub, expiresAt);
  return jwt.sign(
    {
      ...payload,
      authTime: Math.floor(now / 1000),
      jti: session.id
    } satisfies AuthTokenPayload,
    env.jwtSecret,
    {
      algorithm: "HS256",
      audience: env.jwtAudience,
      expiresIn: `${env.sessionAbsoluteTtlMinutes}m`,
      issuer: env.jwtIssuer
    }
  );
};

export const verifySessionToken = (token: string) => {
  return jwt.verify(token, env.jwtSecret, {
    algorithms: ["HS256"],
    audience: env.jwtAudience,
    issuer: env.jwtIssuer
  }) as AuthTokenPayload;
};

export const getUserFromToken = async (token: string) => {
  const payload = verifySessionToken(token);
  if (!payload.jti || !Number.isInteger(payload.authTime)) return null;
  const session = await findAuthSession(payload.jti);
  const now = Date.now();
  if (
    !session ||
    session.revoked_at ||
    new Date(session.expires_at).getTime() <= now ||
    new Date(session.last_seen_at).getTime() + env.sessionIdleTtlMinutes * 60 * 1000 <= now
  ) {
    return null;
  }
  const user = await findUserById(payload.sub);
  if (!user || (payload.ver ?? 0) !== user.session_version) return null;
  if (new Date(session.last_seen_at).getTime() + 5 * 60 * 1000 <= now) {
    await touchAuthSession(session.id, new Date(now).toISOString());
  }
  return { authTime: payload.authTime, sessionId: session.id, user };
};

export { revokeAuthSession, revokeUserAuthSessions };

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
    return false;
  }

  const user = await findUserByEmail(email);
  if (
    !user ||
    !user.email_verified_at ||
    !user.phone_verified_at ||
    user.phone_number !== phoneNumber
  ) return false;

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(
    Date.now() + env.passwordResetTokenTtlMinutes * 60 * 1000
  ).toISOString();
  await createPasswordResetToken({ expiresAt, tokenHash, userId: user.id });

  const baseUrl = env.passwordResetUrlBase;
  if (!baseUrl) {
    await deletePasswordResetToken(tokenHash);
    return false;
  }

  const delivered = await deliver({
    email: user.email,
    resetUrl: `${baseUrl}/reset-password#token=${encodeURIComponent(token)}`
  }).catch(() => false);
  if (!delivered) await deletePasswordResetToken(tokenHash);
  return delivered;
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
