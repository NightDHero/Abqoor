import { env } from "../../config/env.js";
import { findUserByPhone } from "./auth.repository.js";
import { AuthError, normalizePhoneNumber } from "./auth.service.js";
import {
  findLatestPhoneVerificationRequest,
  recordPhoneVerificationRequest,
  type PhoneVerificationPurpose
} from "./phone-verification.repository.js";

type TwilioVerificationStart = (phoneNumber: string) => Promise<boolean>;
type TwilioVerificationCheck = (
  phoneNumber: string,
  code: string
) => Promise<boolean>;

const getTwilioConfiguration = () => {
  const { accountSid, authToken, verifyServiceSid } = env.twilio;
  if (!accountSid || !authToken || !verifyServiceSid) {
    throw new AuthError("التحقق من رقم الجوال غير مهيأ حالياً.", 503);
  }
  return { accountSid, authToken, verifyServiceSid };
};

const twilioRequest = async (path: string, body: URLSearchParams) => {
  const { accountSid, authToken, verifyServiceSid } = getTwilioConfiguration();
  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifyServiceSid)}/${path}`,
    {
      body,
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      method: "POST"
    }
  );
  if (!response.ok) return null;
  return await response.json() as { status?: string };
};

export const startTwilioPhoneVerification: TwilioVerificationStart = async (
  phoneNumber
) => {
  const result = await twilioRequest(
    "Verifications",
    new URLSearchParams({ Channel: "sms", To: phoneNumber })
  );
  return result?.status === "pending";
};

export const checkTwilioPhoneVerification: TwilioVerificationCheck = async (
  phoneNumber,
  code
) => {
  const result = await twilioRequest(
    "VerificationCheck",
    new URLSearchParams({ Code: code, To: phoneNumber })
  );
  return result?.status === "approved";
};

const testPhoneCodes = new Map<string, string>();

export const registerTestPhoneVerificationCode = (
  phoneNumberInput: string,
  code: string
) => {
  if (env.nodeEnv !== "test") {
    throw new Error("Test phone verification codes are unavailable outside tests.");
  }
  testPhoneCodes.set(normalizePhoneNumber(phoneNumberInput), code);
};

const checkConfiguredPhoneVerification: TwilioVerificationCheck = async (
  phoneNumber,
  code
) => {
  if (env.nodeEnv === "test") {
    const expected = testPhoneCodes.get(phoneNumber);
    if (expected !== code) return false;
    testPhoneCodes.delete(phoneNumber);
    return true;
  }
  return checkTwilioPhoneVerification(phoneNumber, code);
};

export const requestPhoneVerification = async (input: {
  phoneNumber: string;
  purpose: PhoneVerificationPurpose;
  userId?: string | null;
}, start: TwilioVerificationStart = startTwilioPhoneVerification) => {
  const phoneNumber = normalizePhoneNumber(input.phoneNumber);
  const existingUser = await findUserByPhone(phoneNumber);
  if (
    existingUser &&
    (input.purpose === "registration" || existingUser.id !== input.userId)
  ) {
    return { delivered: false as const, phoneNumber, reason: "existing" as const };
  }

  const mostRecent = await findLatestPhoneVerificationRequest(
    phoneNumber,
    input.purpose
  );
  if (
    mostRecent &&
    new Date(mostRecent.created_at).getTime() +
      env.phoneVerificationResendCooldownSeconds * 1000 > Date.now()
  ) {
    return { delivered: false as const, phoneNumber, reason: "cooldown" as const };
  }

  const delivered = await start(phoneNumber).catch(() => false);
  if (!delivered) {
    throw new AuthError("تعذر إرسال رمز التحقق إلى رقم الجوال.", 503);
  }
  await recordPhoneVerificationRequest({
    phoneNumber,
    purpose: input.purpose,
    userId: input.userId
  });
  return { delivered: true as const, phoneNumber, reason: "sent" as const };
};

export const verifyPhoneCode = async (
  phoneNumberInput: string,
  codeInput: string,
  check: TwilioVerificationCheck = checkConfiguredPhoneVerification
) => {
  const phoneNumber = normalizePhoneNumber(phoneNumberInput);
  const code = codeInput.trim();
  if (!/^\d{4,10}$/.test(code)) {
    throw new AuthError("رمز تحقق الجوال غير صالح.");
  }
  if (!(await check(phoneNumber, code).catch(() => false))) {
    throw new AuthError("رمز تحقق الجوال غير صحيح أو منتهي.");
  }
  return phoneNumber;
};
