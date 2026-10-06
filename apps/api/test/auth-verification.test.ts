import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-auth-verification-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "";
process.env.JWT_SECRET = "auth-verification-test-secret";
process.env.NODE_ENV = "test";
process.env.TWILIO_ACCOUNT_SID = "test-account";
process.env.TWILIO_AUTH_TOKEN = "test-token";
process.env.TWILIO_VERIFY_SERVICE_SID = "test-service";

const { closeDatabase, db } = await import("../src/database/client.js");
const {
  AuthError,
  loginUser,
  normalizePhoneNumber,
  registerUser
} = await import("../src/modules/auth/auth.service.js");
const { findUserByEmail } = await import("../src/modules/auth/auth.repository.js");
const {
  requestRegistrationCode,
  verifyRegistrationCode
} = await import("../src/modules/auth/email-verification.service.js");
const {
  checkTwilioPhoneVerification,
  requestPhoneVerification,
  startTwilioPhoneVerification,
  verifyPhoneCode
} = await import("../src/modules/auth/phone-verification.service.js");

const issueEmailCode = async (email: string) => {
  let code = "";
  const result = await requestRegistrationCode(email, async (message) => {
    code = message.text.match(/\b(\d{6})\b/)?.[1] ?? "";
    return true;
  });
  assert.equal(result.delivered, true);
  assert.match(code, /^\d{6}$/);
  return code;
};

test("email verification codes are hashed, single-use, and do not create accounts", async () => {
  const email = "verification@example.com";
  const code = await issueEmailCode(email);
  assert.equal(await findUserByEmail(email), null);
  const record = await db.prepare<string, { code_hash: string; used_at: string | null }>(
    "SELECT code_hash, used_at FROM email_verification_codes WHERE email = ?"
  ).get(email);
  assert.ok(record);
  assert.match(record.code_hash, /^[a-f0-9]{64}$/);
  assert.equal(record.code_hash.includes(code), false);

  await verifyRegistrationCode(email, code);
  await assert.rejects(verifyRegistrationCode(email, code), /غير صالح|مستخدم/);
});

test("email verification rejects expired codes and excessive attempts", async () => {
  const expiredEmail = "expired-verification@example.com";
  const expiredCode = await issueEmailCode(expiredEmail);
  await db.prepare("UPDATE email_verification_codes SET expires_at = ? WHERE email = ?")
    .run(new Date(Date.now() - 60_000).toISOString(), expiredEmail);
  await assert.rejects(
    verifyRegistrationCode(expiredEmail, expiredCode),
    /غير صالح أو منتهي/
  );

  const attemptsEmail = "attempts-verification@example.com";
  const validCode = await issueEmailCode(attemptsEmail);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await assert.rejects(verifyRegistrationCode(attemptsEmail, "000000"), AuthError);
  }
  await assert.rejects(
    verifyRegistrationCode(attemptsEmail, validCode),
    /غير صالح أو منتهي/
  );
});

test("email and phone verification resend cooldowns suppress duplicate delivery", async () => {
  let emailDeliveries = 0;
  const email = "cooldown@example.com";
  const deliver = async () => {
    emailDeliveries += 1;
    return true;
  };
  assert.equal((await requestRegistrationCode(email, deliver)).reason, "sent");
  assert.equal((await requestRegistrationCode(email, deliver)).reason, "cooldown");
  assert.equal(emailDeliveries, 1);

  let smsDeliveries = 0;
  const phoneNumber = "+966500000041";
  const start = async () => {
    smsDeliveries += 1;
    return true;
  };
  assert.equal((await requestPhoneVerification({ phoneNumber, purpose: "registration" }, start)).reason, "sent");
  assert.equal((await requestPhoneVerification({ phoneNumber, purpose: "registration" }, start)).reason, "cooldown");
  assert.equal(smsDeliveries, 1);
});

test("Saudi phone formats normalize to one identity and only verified phones authenticate", async () => {
  assert.equal(normalizePhoneNumber("050 000 0042"), "+966500000042");
  assert.equal(normalizePhoneNumber("+966500000042"), "+966500000042");
  assert.equal(normalizePhoneNumber("00966500000042"), "+966500000042");
  assert.throws(() => normalizePhoneNumber("123"), /غير صالح/);

  const password = "verified phone password";
  await registerUser("unverified-phone@example.com", password, "+966500000043");
  await assert.rejects(loginUser("0500000043", password), /غير صحيحة/);

  const verified = await registerUser(
    "verified-phone@example.com",
    password,
    "+966500000044",
    { phoneVerified: true }
  );
  assert.equal((await loginUser("0500000044", password)).id, verified.id);
  await assert.rejects(
    registerUser("duplicate-phone@example.com", password, "00966500000044", {
      phoneVerified: true
    }),
    /مستخدم بالفعل/
  );
});

test("Twilio Verify requests send and check codes without local plaintext persistence", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ body: string; url: string }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ body: String(init?.body ?? ""), url });
    return new Response(JSON.stringify({ status: url.endsWith("VerificationCheck") ? "approved" : "pending" }), {
      headers: { "content-type": "application/json" },
      status: 200
    });
  }) as typeof fetch;

  try {
    assert.equal(await startTwilioPhoneVerification("+966500000045"), true);
    assert.equal(await checkTwilioPhoneVerification("+966500000045", "246810"), true);
    assert.equal(calls.length, 2);
    assert.match(calls[0]?.url ?? "", /\/Verifications$/);
    assert.match(calls[1]?.url ?? "", /\/VerificationCheck$/);
    assert.match(calls[0]?.body ?? "", /To=%2B966500000045/);
    assert.match(calls[1]?.body ?? "", /Code=246810/);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(
    await verifyPhoneCode("0500000046", "246810", async (phone, code) =>
      phone === "+966500000046" && code === "246810"
    ),
    "+966500000046"
  );
  await assert.rejects(
    verifyPhoneCode("0500000046", "111111", async () => false),
    /غير صحيح أو منتهي/
  );
});

after(async () => {
  await closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
