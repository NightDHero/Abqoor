import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import express from "express";
import { issueTestPhoneVerificationCode, issueTestRegistrationCode } from "./helpers/auth.js";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-security-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "";
process.env.JWT_SECRET = "security-hardening-test-secret";
process.env.NODE_ENV = "test";
process.env.STORAGE_DRIVER = "local";

const { createApp } = await import("../src/app.js");
const { closeDatabase, createPostgresSslConfig } = await import(
  "../src/database/client.js"
);
const { createFixedWindowRateLimit } = await import(
  "../src/modules/security/security.middleware.js"
);

const app = await createApp();
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
  assert.match(response.headers.get("x-request-id") ?? "", /^[A-Za-z0-9._-]+$/);
});

test("uses certificate verification for PostgreSQL TLS", () => {
  assert.deepEqual(createPostgresSslConfig(true, "test-ca"), {
    ca: "test-ca",
    rejectUnauthorized: true
  });
  assert.equal(createPostgresSslConfig(false, "test-ca"), undefined);
});

test("rate limiter storage is bounded and expired entries recover", async () => {
  const limiterApp = express();
  limiterApp.get(
    "/",
    createFixedWindowRateLimit({
      keyGenerator: (request) => request.get("x-test-key") ?? "missing",
      keyPrefix: "bounded-test",
      maxEntries: 2,
      maxRequests: 1,
      message: "limited",
      windowMs: 40
    }),
    (_request, response) => response.status(204).send()
  );
  const limiterServer = limiterApp.listen(0);
  await new Promise<void>((resolve) => limiterServer.once("listening", resolve));
  const limiterAddress = limiterServer.address();
  assert.ok(limiterAddress && typeof limiterAddress === "object");
  const limiterUrl = `http://127.0.0.1:${limiterAddress.port}`;
  const requestWithKey = (key: string) =>
    fetch(limiterUrl, { headers: { "x-test-key": key } });

  try {
    assert.equal((await requestWithKey("a")).status, 204);
    assert.equal((await requestWithKey("b")).status, 204);
    assert.equal((await requestWithKey("c")).status, 204);
    assert.equal((await requestWithKey("a")).status, 204);
    assert.equal((await requestWithKey("a")).status, 429);
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal((await requestWithKey("a")).status, 204);
  } finally {
    await new Promise<void>((resolve, reject) =>
      limiterServer.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("allows configured CORS preflight and blocks cross-site mutations", async () => {
  const preflight = await fetch(`${baseUrl}/auth/login`, {
    headers: {
      "access-control-request-headers": "content-type",
      "access-control-request-method": "POST",
      origin: "http://localhost:5173"
    },
    method: "OPTIONS"
  });
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "http://localhost:5173"
  );
  assert.equal(preflight.headers.get("access-control-allow-credentials"), "true");

  const blocked = await fetch(`${baseUrl}/auth/login`, {
    body: JSON.stringify({ email: "nobody@example.com", password: "invalid" }),
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    method: "POST"
  });
  assert.equal(blocked.status, 403);
});

test("returns a consistent JSON response for malformed request bodies", async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    body: "{",
    headers: { "content-type": "application/json" },
    method: "POST"
  });

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("content-type")?.includes("application/json"), true);
  assert.deepEqual(await response.json(), {
    message: "Invalid JSON request body."
  });
});

test("a successful login clears inherited failure counters", async () => {
  const credentials = {
    email: "rate-recovery@example.com",
    password: "correct horse battery"
  };
  const verificationCode = await issueTestRegistrationCode(credentials.email);
  const phoneVerificationCode = await issueTestPhoneVerificationCode("+966500000098");
  const registration = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      ...credentials,
      passwordConfirmation: credentials.password,
      phoneNumber: "+966500000098",
      phoneVerificationCode,
      verificationCode
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(registration.status, 201);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const failure = await fetch(`${baseUrl}/auth/login`, {
      body: JSON.stringify({ email: credentials.email, password: "wrong" }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    assert.equal(failure.status, 401);
  }
  const success = await fetch(`${baseUrl}/auth/login`, {
    body: JSON.stringify(credentials),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(success.status, 200);

  for (let attempt = 0; attempt < 11; attempt += 1) {
    const failure = await fetch(`${baseUrl}/auth/login`, {
      body: JSON.stringify({ email: credentials.email, password: "wrong-again" }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    assert.equal(failure.status, 401);
  }
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

test("rotating account identifiers cannot bypass the client limit", async () => {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt < 46; attempt += 1) {
    lastResponse = await fetch(`${baseUrl}/auth/login`, {
      body: JSON.stringify({
        email: `rotated-${attempt}@example.com`,
        password: "wrong-password"
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
  }
  assert.equal(lastResponse?.status, 429);
});

test("logout revokes the server-side session and sensitive responses are not cached", async () => {
  const verificationCode = await issueTestRegistrationCode("logout-security@example.com");
  const phoneVerificationCode = await issueTestPhoneVerificationCode("+966500000099");
  const registration = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      email: "logout-security@example.com",
      password: "correct horse battery",
      passwordConfirmation: "correct horse battery",
      phoneNumber: "+966500000099",
      phoneVerificationCode,
      verificationCode
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(registration.status, 201);
  const cookie = registration.headers.get("set-cookie")?.split(";")[0] ?? "";

  const beforeLogout = await fetch(`${baseUrl}/auth/me`, { headers: { cookie } });
  assert.equal(beforeLogout.status, 200);
  assert.equal(beforeLogout.headers.get("cache-control"), "no-store, private");

  const logout = await fetch(`${baseUrl}/auth/logout`, {
    headers: { cookie },
    method: "POST"
  });
  assert.equal(logout.status, 204);

  const replay = await fetch(`${baseUrl}/auth/me`, { headers: { cookie } });
  assert.equal(replay.status, 401);
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  await closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
