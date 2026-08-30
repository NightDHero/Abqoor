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

test("seed administrator setup is idempotent and keeps login usable", async () => {
  await ensureSeedAdminAccount({
    email: "boot-admin@example.com",
    password: "oldpass123"
  });

  const firstStored = db
    .prepare(
      `
        SELECT
          users.id,
          users.password_hash,
          users.updated_at AS user_updated_at,
          admin_accounts.updated_at AS admin_updated_at
        FROM users
        INNER JOIN admin_accounts ON admin_accounts.user_id = users.id
        WHERE users.email = ?
      `
    )
    .get("boot-admin@example.com") as
    | {
        id: string;
        password_hash: string;
        user_updated_at: string;
        admin_updated_at: string;
      }
    | undefined;
  assert.ok(firstStored);

  await ensureSeedAdminAccount({
    email: "boot-admin@example.com",
    password: "oldpass123"
  });

  const secondStored = db
    .prepare(
      `
        SELECT
          users.id,
          users.password_hash,
          users.updated_at AS user_updated_at,
          admin_accounts.updated_at AS admin_updated_at,
          COUNT(admin_accounts.user_id) AS admin_count
        FROM users
        INNER JOIN admin_accounts ON admin_accounts.user_id = users.id
        WHERE users.email = ?
      `
    )
    .get("boot-admin@example.com") as {
    admin_count: number;
    admin_updated_at: string;
    id: string;
    password_hash: string;
    user_updated_at: string;
  };
  assert.equal(secondStored.id, firstStored.id);
  assert.equal(secondStored.password_hash, firstStored.password_hash);
  assert.equal(secondStored.user_updated_at, firstStored.user_updated_at);
  assert.equal(secondStored.admin_updated_at, firstStored.admin_updated_at);
  assert.equal(secondStored.admin_count, 1);

  await ensureSeedAdminAccount({
    email: "boot-admin@example.com",
    password: "newpass123"
  });

  const updatedStored = db
    .prepare("SELECT password_hash FROM users WHERE email = ?")
    .get("boot-admin@example.com") as { password_hash: string };
  assert.notEqual(updatedStored.password_hash, firstStored.password_hash);
  assert.equal(await bcrypt.compare("newpass123", updatedStored.password_hash), true);

  const oldLogin = await login("boot-admin@example.com", "oldpass123");
  assert.equal(oldLogin.response.status, 401);

  const newLogin = await login("boot-admin@example.com", "newpass123");
  assert.equal(newLogin.response.status, 200);
  const loginPayload = await readJson<{ user: { isAdmin: boolean } }>(
    newLogin.response
  );
  assert.equal(loginPayload.user.isAdmin, true);
  assert.equal(JSON.stringify(loginPayload).includes("password"), false);
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  db.close();
  rmSync(testDirectory, { force: true, recursive: true });
});
