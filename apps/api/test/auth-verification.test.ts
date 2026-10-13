import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { after, test } from "node:test";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-auth-verification-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "";
process.env.JWT_SECRET = "auth-verification-test-secret";
process.env.NODE_ENV = "test";

const { closeDatabase, db } = await import("../src/database/client.js");
const { AuthError } = await import("../src/modules/auth/auth.service.js");
const { findUserByEmail } = await import("../src/modules/auth/auth.repository.js");
const {
  requestRegistrationCode,
  verifyRegistrationCode
} = await import("../src/modules/auth/email-verification.service.js");

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

test("email verification resend cooldown suppresses duplicate delivery", async () => {
  let emailDeliveries = 0;
  const email = "cooldown@example.com";
  const deliver = async () => {
    emailDeliveries += 1;
    return true;
  };
  assert.equal((await requestRegistrationCode(email, deliver)).reason, "sent");
  assert.equal((await requestRegistrationCode(email, deliver)).reason, "cooldown");
  assert.equal(emailDeliveries, 1);
});

test("production environment validation does not require Twilio", () => {
  const childEnvironment = {
    ...process.env,
    DATABASE_DRIVER: "postgres",
    DATABASE_URL: "postgresql://example:example@localhost:5432/abqoor",
    FRONTEND_ORIGIN: "https://abqoor-web.vercel.app",
    GOOGLE_CLIENT_ID: "test.apps.googleusercontent.com",
    JWT_SECRET: "production-test-secret-that-is-long-enough",
    NODE_ENV: "production",
    PASSWORD_RESET_URL_BASE: "https://abqoor-web.vercel.app",
    RESEND_API_KEY: "re_test",
    SESSION_COOKIE_SAMESITE: "none",
    STORAGE_DRIVER: "local",
    TRANSACTIONAL_EMAIL_FROM: "Abqoor <noreply@example.com>"
  };
  delete childEnvironment.TWILIO_ACCOUNT_SID;
  delete childEnvironment.TWILIO_AUTH_TOKEN;
  delete childEnvironment.TWILIO_VERIFY_SERVICE_SID;

  const configUrl = new URL("../src/config/env.ts", import.meta.url).href;
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--eval", `import(${JSON.stringify(configUrl)})`],
    { encoding: "utf8", env: childEnvironment }
  );

  assert.equal(result.status, 0, result.stderr);
});

test("production password reset links require HTTPS", () => {
  const childEnvironment = {
    ...process.env,
    DATABASE_DRIVER: "postgres",
    DATABASE_URL: "postgresql://example:example@localhost:5432/abqoor",
    FRONTEND_ORIGIN: "https://abqoor-web.vercel.app",
    GOOGLE_CLIENT_ID: "test.apps.googleusercontent.com",
    JWT_SECRET: "production-test-secret-that-is-long-enough",
    NODE_ENV: "production",
    PASSWORD_RESET_URL_BASE: "http://abqoor-web.vercel.app",
    RESEND_API_KEY: "re_test",
    SESSION_COOKIE_SAMESITE: "none",
    STORAGE_DRIVER: "local",
    TRANSACTIONAL_EMAIL_FROM: "Abqoor <noreply@example.com>"
  };
  const configUrl = new URL("../src/config/env.ts", import.meta.url).href;
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--eval", `import(${JSON.stringify(configUrl)})`],
    { encoding: "utf8", env: childEnvironment }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must use HTTPS/);
});

after(async () => {
  await closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
