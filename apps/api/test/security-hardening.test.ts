import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-security-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "";
process.env.JWT_SECRET = "security-hardening-test-secret";
process.env.NODE_ENV = "test";
process.env.STORAGE_DRIVER = "local";

const { createApp } = await import("../src/app.js");
const { db } = await import("../src/database/client.js");

const app = createApp();
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

test("sets baseline security headers without blocking API responses", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("x-powered-by"), null);
});

test("rate limits repeated authentication attempts by client and email", async () => {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < 31; attempt += 1) {
    lastResponse = await fetch(`${baseUrl}/auth/login`, {
      body: JSON.stringify({
        email: "rate-limited@example.com",
        password: "wrong-password"
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
  }

  assert.equal(lastResponse?.status, 429);
  assert.ok(Number(lastResponse?.headers.get("retry-after")) > 0);
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  db.close();
  rmSync(testDirectory, { force: true, recursive: true });
});
