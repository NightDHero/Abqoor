import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HttpError,
  runWithRequestDeadline
} from "../src/services/http.js";

test("a completed request resolves before its deadline", async () => {
  const result = await runWithRequestDeadline(
    async () => ({ ready: true }),
    { timeoutMs: 50 }
  );

  assert.deepEqual(result, { ready: true });
});

test("a stalled request becomes a recoverable timeout error", async () => {
  let wasAborted = false;
  const pending = runWithRequestDeadline(
    (signal) => new Promise<never>((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        wasAborted = true;
        reject(new DOMException("aborted", "AbortError"));
      }, { once: true });
    }),
    { timeoutMs: 5 }
  );

  await assert.rejects(pending, (caughtError: unknown) => {
    assert.ok(caughtError instanceof HttpError);
    assert.equal(caughtError.status, 408);
    return true;
  });
  assert.equal(wasAborted, true);
});

test("caller cancellation is not mislabeled as a timeout", async () => {
  const controller = new AbortController();
  const cancelled = new Error("navigation cancelled");
  const pending = runWithRequestDeadline(
    (signal) => new Promise<never>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(cancelled), { once: true });
    }),
    { signal: controller.signal, timeoutMs: 100 }
  );

  controller.abort(cancelled);
  await assert.rejects(pending, /navigation cancelled/);
});
