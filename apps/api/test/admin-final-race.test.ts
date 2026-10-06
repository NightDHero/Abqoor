import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { issueTestPhoneVerificationCode, issueTestRegistrationCode } from "./helpers/auth.js";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-admin-race-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "";
process.env.JWT_SECRET = "admin-final-race-test-secret";
process.env.NODE_ENV = "test";

const { createApp } = await import("../src/app.js");
const { closeDatabase, db } = await import("../src/database/client.js");
const { ensureSeedAdminAccount } = await import(
  "../src/modules/admin/admin.service.js"
);

const app = await createApp();
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;
const password = "correct horse battery";
const cookieFrom = (response: Response) =>
  response.headers.get("set-cookie")?.split(";")[0] ?? "";

const login = async (email: string) => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    body: JSON.stringify({ email, password }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(response.status, 200);
  return cookieFrom(response);
};

test("concurrent removal requests cannot remove the final administrator", async () => {
  const first = await ensureSeedAdminAccount({
    email: "race-first@example.com",
    password
  });
  const firstCookie = await login(first.email);
  const verificationCode = await issueTestRegistrationCode("race-second@example.com");
  const phoneVerificationCode = await issueTestPhoneVerificationCode("+966500000092");

  const registration = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      email: "race-second@example.com",
      password,
      passwordConfirmation: password,
      phoneNumber: "+966500000092",
      phoneVerificationCode,
      verificationCode
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(registration.status, 201);
  const registrationPayload = await registration.json() as {
    user: { id: string };
  };

  const promotion = await fetch(`${baseUrl}/admin/accounts`, {
    body: JSON.stringify({ email: "race-second@example.com" }),
    headers: { cookie: firstCookie, "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(promotion.status, 201);
  const secondCookie = await login("race-second@example.com");

  const [removeSecond, removeFirst] = await Promise.all([
    fetch(`${baseUrl}/admin/accounts/${registrationPayload.user.id}`, {
      headers: { cookie: firstCookie },
      method: "DELETE"
    }),
    fetch(`${baseUrl}/admin/accounts/${first.id}`, {
      headers: { cookie: secondCookie },
      method: "DELETE"
    })
  ]);

  assert.equal(
    [removeSecond.status, removeFirst.status].filter((status) => status === 200).length,
    1
  );
  const count = await db.prepare<[], { count: number }>(
    "SELECT COUNT(*) AS count FROM admin_accounts"
  ).get();
  assert.equal(count?.count, 1);
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  await closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
