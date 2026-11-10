import assert from "node:assert/strict";
import { test } from "node:test";
import { authService } from "../src/services/authService.js";

test("deduplicates concurrent authentication bootstrap requests", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  let resolveResponse: (() => void) | null = null;
  const responseReady = new Promise<void>((resolve) => {
    resolveResponse = resolve;
  });
  globalThis.fetch = async () => {
    requestCount += 1;
    await responseReady;
    return new Response(JSON.stringify({
      user: {
        createdAt: "2026-01-01T00:00:00.000Z",
        email: "student@example.com",
        emailVerified: true,
        id: "student",
        isAdmin: false,
        mustChangePassword: false,
        profileCompleted: true,
        username: "طالب"
      }
    }), { headers: { "Content-Type": "application/json" } });
  };

  try {
    const first = authService.getCurrentUser();
    const second = authService.getCurrentUser();
    resolveResponse?.();
    const [left, right] = await Promise.all([first, second]);
    assert.equal(requestCount, 1);
    assert.deepEqual(left, right);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
