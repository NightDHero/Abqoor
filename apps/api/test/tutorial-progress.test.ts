import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { issueTestRegistrationCode } from "./helpers/auth.js";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-tutorial-progress-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "";
process.env.JWT_SECRET = "tutorial-progress-test-secret";
process.env.NODE_ENV = "test";

const { createApp } = await import("../src/app.js");
const { closeDatabase, db } = await import("../src/database/client.js");
const app = await createApp();
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

const register = async (email: string) => {
  const password = "correct horse battery";
  const verificationCode = await issueTestRegistrationCode(email);
  const response = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      email,
      password,
      passwordConfirmation: password,
      verificationCode
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(response.status, 201);
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
};

test("stores tutorial progress per authenticated user", async () => {
  const firstCookie = await register("tour-first@example.com");
  const initialResponse = await fetch(`${baseUrl}/profile/tutorial`, {
    headers: { cookie: firstCookie }
  });
  assert.equal(initialResponse.status, 200);
  assert.deepEqual(await initialResponse.json(), {
    tutorial: {
      completedAt: null,
      currentStep: 0,
      dismissedAt: null,
      status: "not_started",
      updatedAt: null
    }
  });

  const updateResponse = await fetch(`${baseUrl}/profile/tutorial`, {
    body: JSON.stringify({ currentStep: 3, status: "in_progress" }),
    headers: { cookie: firstCookie, "content-type": "application/json" },
    method: "PUT"
  });
  assert.equal(updateResponse.status, 200);

  const persistedResponse = await fetch(`${baseUrl}/profile/tutorial`, {
    headers: { cookie: firstCookie }
  });
  const persisted = (await persistedResponse.json()) as {
    tutorial: { currentStep: number; status: string; updatedAt: string };
  };
  assert.equal(persisted.tutorial.status, "in_progress");
  assert.equal(persisted.tutorial.currentStep, 3);
  assert.ok(persisted.tutorial.updatedAt);

  const secondCookie = await register("tour-second@example.com");
  const secondResponse = await fetch(`${baseUrl}/profile/tutorial`, {
    headers: { cookie: secondCookie }
  });
  const second = (await secondResponse.json()) as {
    tutorial: { currentStep: number; status: string };
  };
  assert.equal(second.tutorial.status, "not_started");
  assert.equal(second.tutorial.currentStep, 0);
});

test("validates tutorial updates and requires authentication", async () => {
  const unauthorized = await fetch(`${baseUrl}/profile/tutorial`);
  assert.equal(unauthorized.status, 401);

  const cookie = await register("tour-validation@example.com");
  const invalid = await fetch(`${baseUrl}/profile/tutorial`, {
    body: JSON.stringify({ currentStep: 99, status: "completed" }),
    headers: { cookie, "content-type": "application/json" },
    method: "PUT"
  });
  assert.equal(invalid.status, 400);

  const completed = await fetch(`${baseUrl}/profile/tutorial`, {
    body: JSON.stringify({ currentStep: 5, status: "completed" }),
    headers: { cookie, "content-type": "application/json" },
    method: "PUT"
  });
  assert.equal(completed.status, 200);

  const stored = await db.prepare<
    { status: string },
    { completed_at: string | null; status: string }
  >("SELECT status, completed_at FROM user_tutorial_progress WHERE status = @status").get({
    status: "completed"
  });
  assert.equal(stored?.status, "completed");
  assert.ok(stored?.completed_at);
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
