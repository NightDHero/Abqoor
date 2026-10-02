import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import bcrypt from "bcryptjs";

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
  const response = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      email,
      password,
      passwordConfirmation: password,
      phoneNumber
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(response.status, 201);
  return response;
};

test("registration enforces confirmation and the shared strong-password policy", async () => {
  const weakResponse = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      email: "weak@example.com",
      password: "12345678",
      passwordConfirmation: "12345678",
      phoneNumber: "+966500000032"
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
      phoneNumber: "+966500000033"
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(mismatchResponse.status, 400);

  await register();
  const stored = await db.prepare<
    string,
    { password_hash: string; phone_number: string }
  >("SELECT password_hash, phone_number FROM users WHERE email = ?").get(email);
  assert.ok(stored);
  assert.notEqual(stored.password_hash, password);
  assert.equal(await bcrypt.compare(password, stored.password_hash), true);
  assert.equal(stored.phone_number, phoneNumber);
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
  const oldToken = createSessionToken({
    email: userBefore.email,
    sub: userBefore.id,
    ver: userBefore.session_version
  });

  let resetUrl = "";
  await requestPasswordReset(email, phoneNumber, async (message) => {
    resetUrl = message.resetUrl;
    return true;
  });
  const token = new URL(resetUrl).searchParams.get("token");
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
