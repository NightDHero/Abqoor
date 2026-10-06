import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import bcrypt from "bcryptjs";
import { issueTestPhoneVerificationCode, issueTestRegistrationCode } from "./helpers/auth.js";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-auth-recovery-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "";
process.env.FRONTEND_ORIGIN = "http://localhost:5173";
process.env.JWT_SECRET = "auth-recovery-test-secret";
process.env.NODE_ENV = "test";
process.env.PASSWORD_RESET_URL_BASE = "http://localhost:5173";

const { createApp } = await import("../src/app.js");
const { closeDatabase, db } = await import("../src/database/client.js");
const {
  AuthError,
  createSessionToken,
  getUserFromToken,
  linkGoogleIdentity,
  loginWithGoogle,
  registerUser,
  requestPasswordReset,
  resetPassword
} = await import("../src/modules/auth/auth.service.js");
const { createPasswordResetToken } = await import(
  "../src/modules/auth/password-reset.repository.js"
);

const app = await createApp();
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

const email = "recovery@example.com";
const phoneNumber = "+966500000031";
const password = "strong student password";

const register = async () => {
  const verificationCode = await issueTestRegistrationCode(email);
  const phoneVerificationCode = await issueTestPhoneVerificationCode(phoneNumber);
  const response = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      email,
      password,
      passwordConfirmation: password,
      phoneNumber,
      phoneVerificationCode,
      verificationCode
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(response.status, 201);
  return response;
};

test("registration enforces confirmation and the shared strong-password policy", async () => {
  const missingVerification = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      email: "unverified@example.com",
      password,
      passwordConfirmation: password,
      phoneNumber: "+966500000030",
      phoneVerificationCode: "000000"
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(missingVerification.status, 400);

  const weakResponse = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      email: "weak@example.com",
      password: "12345678",
      passwordConfirmation: "12345678",
      phoneNumber: "+966500000032",
      phoneVerificationCode: "000000",
      verificationCode: "000000"
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(weakResponse.status, 400);

  const mismatchResponse = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      email: "mismatch@example.com",
      password,
      passwordConfirmation: `${password}!`,
      phoneNumber: "+966500000033",
      phoneVerificationCode: "000000",
      verificationCode: "000000"
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(mismatchResponse.status, 400);

  await register();
  const stored = await db.prepare<
    string,
    { email_verified_at: string; password_hash: string; phone_number: string; phone_verified_at: string }
  >("SELECT email_verified_at, password_hash, phone_number, phone_verified_at FROM users WHERE email = ?").get(email);
  assert.ok(stored);
  assert.notEqual(stored.password_hash, password);
  assert.equal(await bcrypt.compare(password, stored.password_hash), true);
  assert.equal(stored.phone_number, phoneNumber);
  assert.ok(stored.email_verified_at);
  assert.ok(stored.phone_verified_at);
  const verification = await db.prepare<
    string,
    { code_hash: string; used_at: string | null }
  >("SELECT code_hash, used_at FROM email_verification_codes WHERE email = ?").get(email);
  assert.ok(verification);
  assert.match(verification.code_hash, /^[a-f0-9]{64}$/);
  assert.ok(verification.used_at);
});

test("password login accepts either the verified email or the stored phone number", async () => {
  for (const identifier of [email, "0500000031"]) {
    const response = await fetch(`${baseUrl}/auth/login`, {
      body: JSON.stringify({ identifier, password }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    assert.equal(response.status, 200);
    const payload = await response.json() as { user: { email: string } };
    assert.equal(payload.user.email, email);
  }
});

test("Google identities use ordinary users and remain idempotently linked", async () => {
  const verifiedIdentity = async () => ({
    email: "google-student@example.com",
    subject: "google-subject-123"
  });
  const first = await loginWithGoogle("test-credential", verifiedIdentity);
  const second = await loginWithGoogle("test-credential", verifiedIdentity);
  assert.equal(second.id, first.id);
  const identity = await db.prepare<
    [string, string],
    { user_id: string }
  >("SELECT user_id FROM auth_external_identities WHERE provider = ? AND provider_subject = ?")
    .get("google", "google-subject-123");
  assert.equal(identity?.user_id, first.id);
  assert.notEqual(first.password_hash, "test-credential");
});

test("Google cannot silently take over a matching password account", async () => {
  const accountEmail = "google-link@example.com";
  const accountPassword = "google link password";
  const account = await registerUser(accountEmail, accountPassword);
  const verifiedIdentity = async () => ({
    email: accountEmail,
    subject: "google-link-subject"
  });

  await assert.rejects(
    loginWithGoogle("link-credential", verifiedIdentity),
    (error: unknown) => error instanceof AuthError && error.code === "GOOGLE_LINK_REQUIRED"
  );
  await assert.rejects(
    linkGoogleIdentity("link-credential", "wrong password", verifiedIdentity),
    /تعذر ربط حساب Google/
  );
  const linked = await linkGoogleIdentity(
    "link-credential",
    accountPassword,
    verifiedIdentity
  );
  assert.equal(linked.id, account.id);
  assert.equal((await loginWithGoogle("link-credential", verifiedIdentity)).id, account.id);
});

test("persists only SMS-verified phone additions across re-authentication", async () => {
  const accountEmail = "phone-persistence@example.com";
  const accountPassword = "persistent phone password";
  const initialPhone = "+966500000034";
  const changedPhone = "+966500000035";
  await registerUser(accountEmail, accountPassword);

  const login = async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      body: JSON.stringify({ email: accountEmail, password: accountPassword }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    assert.equal(response.status, 200);
    return response.headers.get("set-cookie")?.split(";")[0] ?? "";
  };

  let cookie = await login();
  for (const expectedPhone of [initialPhone, changedPhone]) {
    const code = await issueTestPhoneVerificationCode(expectedPhone);
    const response = await fetch(`${baseUrl}/auth/phone`, {
      body: JSON.stringify({
        code,
        phoneNumber: expectedPhone
      }),
      headers: { cookie, "content-type": "application/json" },
      method: "PATCH"
    });
    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      user: { phoneNumber: string; phoneVerified: boolean };
    };
    assert.equal(payload.user.phoneNumber, expectedPhone);
    assert.equal(payload.user.phoneVerified, true);
    assert.equal(JSON.stringify(payload).includes("password"), false);

    const reload = await fetch(`${baseUrl}/auth/me`, { headers: { cookie } });
    assert.equal(reload.status, 200);
    assert.equal(((await reload.json()) as { user: { phoneNumber: string } }).user.phoneNumber, expectedPhone);

    await fetch(`${baseUrl}/auth/logout`, {
      headers: { cookie },
      method: "POST"
    });
    cookie = await login();
    const reauthenticated = await fetch(`${baseUrl}/auth/me`, { headers: { cookie } });
    assert.equal(reauthenticated.status, 200);
    assert.equal(((await reauthenticated.json()) as { user: { phoneNumber: string } }).user.phoneNumber, expectedPhone);
  }

  const stored = await db.prepare<string, { password_hash: string; phone_number: string }>(
    "SELECT password_hash, phone_number FROM users WHERE email = ?"
  ).get(accountEmail);
  assert.ok(stored);
  assert.equal(stored.phone_number, changedPhone);
  assert.notEqual(stored.password_hash, accountPassword);
  assert.equal(await bcrypt.compare(accountPassword, stored.password_hash), true);
});

test("forgot-password responses are generic and requests are rate limited", async () => {
  const request = (inputEmail: string, inputPhone: string) =>
    fetch(`${baseUrl}/auth/forgot-password`, {
      body: JSON.stringify({ email: inputEmail, phoneNumber: inputPhone }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });

  const existing = await request(email, phoneNumber);
  const missing = await request("missing@example.com", "+966500000099");
  assert.equal(existing.status, 202);
  assert.equal(missing.status, 202);
  assert.deepEqual(await existing.json(), await missing.json());

  const statuses: number[] = [];
  for (let index = 0; index < 6; index += 1) {
    statuses.push(
      (await request("ratelimit@example.com", "+966500000098")).status
    );
  }
  assert.deepEqual(statuses.slice(0, 5), [202, 202, 202, 202, 202]);
  assert.equal(statuses[5], 429);
});

test("reset tokens are hashed, expiring, single-use, and invalidate old sessions", async () => {
  const userBefore = await db.prepare<
    string,
    { id: string; email: string; session_version: number }
  >("SELECT id, email, session_version FROM users WHERE email = ?").get(email);
  assert.ok(userBefore);
  const oldToken = await createSessionToken({
    email: userBefore.email,
    sub: userBefore.id,
    ver: userBefore.session_version
  });

  let resetUrl = "";
  const delivered = await requestPasswordReset(email, phoneNumber, async (message) => {
    resetUrl = message.resetUrl;
    return true;
  });
  assert.equal(delivered, true);
  const parsedResetUrl = new URL(resetUrl);
  assert.equal(parsedResetUrl.searchParams.has("token"), false);
  const token = new URLSearchParams(parsedResetUrl.hash.slice(1)).get("token");
  assert.ok(token);

  const tokenRecord = await db.prepare<
    string,
    { token_hash: string; used_at: string | null }
  >("SELECT token_hash, used_at FROM password_reset_tokens WHERE user_id = ?").get(
    userBefore.id
  );
  assert.ok(tokenRecord);
  assert.notEqual(tokenRecord.token_hash, token);
  assert.equal(tokenRecord.token_hash, createHash("sha256").update(token).digest("hex"));
  assert.equal(tokenRecord.used_at, null);

  await assert.rejects(
    resetPassword({
      password: "12345678",
      passwordConfirmation: "12345678",
      token
    }),
    AuthError
  );

  const newPassword = "new strong student password";
  await resetPassword({
    password: newPassword,
    passwordConfirmation: newPassword,
    token
  });
  await assert.rejects(
    resetPassword({
      password: "another strong password",
      passwordConfirmation: "another strong password",
      token
    }),
    /غير صالح/
  );
  assert.equal(await getUserFromToken(oldToken), null);

  const oldPasswordLogin = await fetch(`${baseUrl}/auth/login`, {
    body: JSON.stringify({ email, password }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(oldPasswordLogin.status, 401);

  const login = await fetch(`${baseUrl}/auth/login`, {
    body: JSON.stringify({ email, password: newPassword }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(login.status, 200);
  assert.equal(JSON.stringify(await login.json()).includes("password"), false);
});

test("expired reset tokens cannot change a password", async () => {
  const user = await db.prepare<string, { id: string }>(
    "SELECT id FROM users WHERE email = ?"
  ).get(email);
  assert.ok(user);
  const token = "expired-reset-token";
  await createPasswordResetToken({
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
    tokenHash: createHash("sha256").update(token).digest("hex"),
    userId: user.id
  });

  await assert.rejects(
    resetPassword({
      password: "expired token password",
      passwordConfirmation: "expired token password",
      token
    }),
    /غير صالح/
  );
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  await closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
