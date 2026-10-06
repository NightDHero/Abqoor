import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";
import {
  consumeEmailVerificationCode,
  createEmailVerificationCode,
  deleteEmailVerificationCode,
  findLatestEmailVerificationCode,
  findMostRecentEmailVerificationCode,
  incrementEmailVerificationAttempts
} from "./email-verification.repository.js";
import { sendTransactionalEmail } from "./email-delivery.service.js";
import { AuthError, normalizeEmail, validateEmail } from "./auth.service.js";
import { findUserByEmail } from "./auth.repository.js";

const maxVerificationAttempts = 5;

const hashVerificationCode = (email: string, code: string) =>
  createHmac("sha256", env.jwtSecret)
    .update(`${email}:${code}`)
    .digest("hex");

const codeHashesMatch = (expected: string, received: string) => {
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  return expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer);
};

export const requestRegistrationCode = async (
  emailInput: string,
  deliver: (message: { subject: string; text: string; to: string }) => Promise<boolean> =
    sendTransactionalEmail
) => {
  const email = normalizeEmail(emailInput);
  validateEmail(email);
  if (await findUserByEmail(email)) {
    return { delivered: false as const, reason: "existing" as const };
  }
  const mostRecent = await findMostRecentEmailVerificationCode(email);
  if (
    mostRecent &&
    new Date(mostRecent.created_at).getTime() +
      env.emailVerificationResendCooldownSeconds * 1000 > Date.now()
  ) {
    return { delivered: false as const, reason: "cooldown" as const };
  }
  const code = String(randomInt(100_000, 1_000_000));
  const id = await createEmailVerificationCode({
    codeHash: hashVerificationCode(email, code),
    email,
    expiresAt: new Date(
      Date.now() + env.emailVerificationCodeTtlMinutes * 60 * 1000
    ).toISOString()
  });

  const delivered = await deliver({
    subject: "رمز تأكيد بريدك في عبقور",
    text: `رمز تأكيد بريدك هو: ${code}\nتنتهي صلاحيته خلال ${env.emailVerificationCodeTtlMinutes.toLocaleString("ar-SA")} دقائق.`,
    to: email
  }).catch(() => false);

  if (!delivered) {
    await deleteEmailVerificationCode(id);
    throw new AuthError("تعذر إرسال رمز التحقق. حاول مرة أخرى لاحقاً.", 503);
  }
  return { delivered: true as const, reason: "sent" as const };
};

export const verifyRegistrationCode = async (
  emailInput: string,
  codeInput: string
) => {
  const email = normalizeEmail(emailInput);
  validateEmail(email);
  const code = codeInput.trim();
  if (!/^\d{6}$/.test(code)) {
    throw new AuthError("رمز التحقق يجب أن يتكون من ٦ أرقام.");
  }

  const record = await findLatestEmailVerificationCode(email);
  if (
    !record ||
    record.attempts >= maxVerificationAttempts ||
    new Date(record.expires_at).getTime() <= Date.now()
  ) {
    throw new AuthError("رمز التحقق غير صالح أو منتهي.");
  }

  const matches = codeHashesMatch(
    record.code_hash,
    hashVerificationCode(email, code)
  );
  if (!matches) {
    await incrementEmailVerificationAttempts(record.id);
    throw new AuthError("رمز التحقق غير صحيح.");
  }

  if (!(await consumeEmailVerificationCode(record.id))) {
    throw new AuthError("رمز التحقق مستخدم أو منتهي.");
  }
};
