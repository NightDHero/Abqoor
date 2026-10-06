import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { issueTestPhoneVerificationCode, issueTestRegistrationCode } from "./helpers/auth.js";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-admin-bootstrap-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "bootstrap-admin@example.com";
process.env.JWT_SECRET = "admin-bootstrap-security-test-secret";
process.env.NODE_ENV = "test";

const { createApp } = await import("../src/app.js");
const { closeDatabase } = await import("../src/database/client.js");
const {
  importConfiguredAdminEmails,
  isUserAdministrator
} = await import("../src/modules/admin/admin.service.js");
const { removeManagedAdmin } = await import(
  "../src/modules/admin/admin.repository.js"
);
const { findUserByEmail } = await import(
  "../src/modules/auth/auth.repository.js"
);

const app = await createApp();
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;
const password = "correct horse battery";

test("configured admin email requires explicit one-time bootstrap", async () => {
  const verificationCode = await issueTestRegistrationCode("bootstrap-admin@example.com");
  const phoneVerificationCode = await issueTestPhoneVerificationCode("+966500000091");
  const registration = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      email: "bootstrap-admin@example.com",
      password,
      passwordConfirmation: password,
      phoneNumber: "+966500000091",
      phoneVerificationCode,
      verificationCode
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(registration.status, 201);
  const registrationPayload = await registration.json() as {
    user: { isAdmin: boolean };
  };
  assert.equal(registrationPayload.user.isAdmin, false);
  const registrationCookie = registration.headers.get("set-cookie")?.split(";")[0] ?? "";

  const user = await findUserByEmail("bootstrap-admin@example.com");
  assert.ok(user);
  assert.equal(await isUserAdministrator(user.id), false);

  await importConfiguredAdminEmails();
  assert.equal(await isUserAdministrator(user.id), true);

  const revokedBootstrapSession = await fetch(`${baseUrl}/auth/me`, {
    headers: { cookie: registrationCookie }
  });
  assert.equal(revokedBootstrapSession.status, 401);

  const login = await fetch(`${baseUrl}/auth/login`, {
    body: JSON.stringify({ email: user.email, password }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(login.status, 200);
  const loginPayload = await login.json() as { user: { isAdmin: boolean } };
  assert.equal(loginPayload.user.isAdmin, true);

  await removeManagedAdmin(user.id);
  assert.equal(await isUserAdministrator(user.id), false);
  await importConfiguredAdminEmails();
  assert.equal(await isUserAdministrator(user.id), false);
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  await closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
