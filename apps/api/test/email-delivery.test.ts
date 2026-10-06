import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "email-delivery-test-secret";
process.env.RESEND_API_KEY = "test-resend-key";
process.env.TRANSACTIONAL_EMAIL_FROM = "Abqoor <accounts@example.com>";

const { sendTransactionalEmail } = await import(
  "../src/modules/auth/email-delivery.service.js"
);

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("transactional email delivery sends the expected Resend request", async () => {
  let request: { input: string | URL | Request; init?: RequestInit } | null = null;
  globalThis.fetch = async (input, init) => {
    request = { input, init };
    return new Response(JSON.stringify({ id: "email-id" }), { status: 200 });
  };

  const delivered = await sendTransactionalEmail({
    subject: "رمز التحقق",
    text: "123456",
    to: "student@example.com"
  });
  assert.equal(delivered, true);
  assert.equal(String(request?.input), "https://api.resend.com/emails");
  const body = JSON.parse(String(request?.init?.body)) as {
    from: string;
    subject: string;
    text: string;
    to: string[];
  };
  assert.deepEqual(body.to, ["student@example.com"]);
  assert.equal(body.from, "Abqoor <accounts@example.com>");
  assert.equal(body.subject, "رمز التحقق");
  assert.equal(body.text, "123456");
  assert.equal(
    (request?.init?.headers as Record<string, string>).Authorization,
    "Bearer test-resend-key"
  );
});
