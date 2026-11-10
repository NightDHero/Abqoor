import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  activateQuestionAssetCache,
  cacheQuestionAsset,
  getCachedQuestionAssetSource
} from "../src/services/questionAssetCache.js";

test("an in-flight asset never becomes visible after the authenticated scope changes", async () => {
  const originalFetch = globalThis.fetch;
  let releaseResponse!: () => void;
  const responseReady = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });

  globalThis.fetch = (async () => {
    await responseReady;
    return new Response(new Blob(["image"], { type: "image/png" }), {
      headers: { "content-type": "image/png" },
      status: 200
    });
  }) as typeof fetch;

  try {
    activateQuestionAssetCache("user:one:admin:0");
    const pending = cacheQuestionAsset("https://api.example/question-images/Q-001");
    activateQuestionAssetCache("user:two:admin:0");
    releaseResponse();

    assert.equal(await pending, null);
    assert.equal(
      getCachedQuestionAssetSource("https://api.example/question-images/Q-001"),
      null
    );
  } finally {
    activateQuestionAssetCache("anonymous");
    globalThis.fetch = originalFetch;
  }
});

test("the production worker caches only public static assets", () => {
  const worker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /url\.origin !== self\.location\.origin/);
  assert.match(worker, /\/question-images\//);
  assert.doesNotMatch(worker, /credentials\s*:\s*["']include["']/);
});

test("exam question preloading is explicitly excluded from persistent assets", () => {
  const examMode = readFileSync(
    new URL("../src/features/exam/ExamMode.tsx", import.meta.url),
    "utf8"
  );
  assert.match(examMode, /\{ persist: false \}/);
});
