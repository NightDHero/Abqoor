import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import bcrypt from "bcryptjs";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-admin-accounts-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "";
process.env.JWT_SECRET = "admin-accounts-test-secret";
process.env.NODE_ENV = "test";

const { createApp } = await import("../src/app.js");
const { db } = await import("../src/database/client.js");
const { ensureSeedAdminAccount } = await import(
  "../src/modules/admin/admin.service.js"
);

const app = createApp();
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

const password = "12345678";

const readJson = async <T>(response: Response) => {
  return (await response.json()) as T;
};

const cookieFrom = (response: Response) =>
  response.headers.get("set-cookie")?.split(";")[0] ?? "";

const login = async (email: string, inputPassword = password) => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    body: JSON.stringify({ email, password: inputPassword }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  return { cookie: cookieFrom(response), response };
};

const register = async (email: string) => {
  const response = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({ email, password }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  return { cookie: cookieFrom(response), response };
};

test("manages administrator accounts without exposing password data", async () => {
  await ensureSeedAdminAccount({
    email: "owner@example.com",
    password
  });

  const ownerLogin = await login("owner@example.com");
  assert.equal(ownerLogin.response.status, 200);
  const ownerPayload = await readJson<{
    user: {
      id: string;
      isAdmin: boolean;
      profileCompleted: boolean;
      username: string | null;
    };
  }>(ownerLogin.response);
  assert.equal(ownerPayload.user.isAdmin, true);
  assert.equal(ownerPayload.user.profileCompleted, true);
  assert.equal(ownerPayload.user.username, "owner");
  assert.equal(JSON.stringify(ownerPayload).includes("password"), false);

  const normalUser = await register("student@example.com");
  assert.equal(normalUser.response.status, 201);
  const rejected = await fetch(`${baseUrl}/admin/accounts`, {
    headers: { cookie: normalUser.cookie }
  });
  assert.equal(rejected.status, 403);

  const initialList = await fetch(`${baseUrl}/admin/accounts`, {
    headers: { cookie: ownerLogin.cookie }
  });
  assert.equal(initialList.status, 200);
  const initialPayload = await readJson<{
    admins: Array<{ canRemove: boolean; email: string }>;
  }>(initialList);
  assert.deepEqual(
    initialPayload.admins.map((admin) => admin.email),
    ["owner@example.com"]
  );
  assert.equal(initialPayload.admins[0]?.canRemove, false);

  const createResponse = await fetch(`${baseUrl}/admin/accounts`, {
    body: JSON.stringify({
      email: "second-admin@example.com",
      password,
      passwordConfirmation: password
    }),
    headers: {
      cookie: ownerLogin.cookie,
      "content-type": "application/json"
    },
    method: "POST"
  });
  assert.equal(createResponse.status, 201);
  const createdPayload = await readJson<{
    admin: { email: string; userId: string };
  }>(createResponse);
  assert.equal(createdPayload.admin.email, "second-admin@example.com");
  assert.equal(JSON.stringify(createdPayload).includes("password"), false);

  const duplicateResponse = await fetch(`${baseUrl}/admin/accounts`, {
    body: JSON.stringify({
      email: "second-admin@example.com",
      password,
      passwordConfirmation: password
    }),
    headers: {
      cookie: ownerLogin.cookie,
      "content-type": "application/json"
    },
    method: "POST"
  });
  assert.equal(duplicateResponse.status, 409);

  const stored = db
    .prepare("SELECT password_hash FROM users WHERE email = ?")
    .get("second-admin@example.com") as { password_hash: string } | undefined;
  assert.ok(stored);
  assert.notEqual(stored.password_hash, password);
  assert.equal(await bcrypt.compare(password, stored.password_hash), true);

  const secondLogin = await login("second-admin@example.com");
  assert.equal(secondLogin.response.status, 200);
  const secondLoginPayload = await readJson<{ user: { isAdmin: boolean } }>(
    secondLogin.response
  );
  assert.equal(secondLoginPayload.user.isAdmin, true);

  const removeResponse = await fetch(
    `${baseUrl}/admin/accounts/${createdPayload.admin.userId}`,
    {
      headers: { cookie: ownerLogin.cookie },
      method: "DELETE"
    }
  );
  assert.equal(removeResponse.status, 200);
  const removePayload = await readJson<{
    admins: Array<{ email: string; canRemove: boolean }>;
  }>(removeResponse);
  assert.deepEqual(
    removePayload.admins.map((admin) => admin.email),
    ["owner@example.com"]
  );
  assert.equal(removePayload.admins[0]?.canRemove, false);

  const removedAdminLogin = await login("second-admin@example.com");
  assert.equal(removedAdminLogin.response.status, 200);
  const removedAdminPayload = await readJson<{ user: { isAdmin: boolean } }>(
    removedAdminLogin.response
  );
  assert.equal(removedAdminPayload.user.isAdmin, false);

  const finalRemovalResponse = await fetch(
    `${baseUrl}/admin/accounts/${ownerPayload.user.id}`,
    {
      headers: { cookie: ownerLogin.cookie },
      method: "DELETE"
    }
  );
  assert.equal(finalRemovalResponse.status, 409);
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  db.close();
  rmSync(testDirectory, { force: true, recursive: true });
});
