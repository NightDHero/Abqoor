import assert from "node:assert/strict";
import { test } from "node:test";
import type { StudyProgressResponse } from "../../web/src/types/session.js";
import {
  clearStudyProgressCache,
  getStudyProgressCacheKey,
  invalidateStudyProgressCache,
  loadStudyProgressCache,
  readStudyProgressCache,
  studyProgressFreshnessMs,
  writeStudyProgressCache
} from "../../web/src/features/career/studyProgressCache.js";

const progressFixture = {
  month: { startDate: "2026-10-01" }
} as StudyProgressResponse;

test("isolates cached progress by user and marks it stale without discarding data", () => {
  clearStudyProgressCache();
  const cacheKey = getStudyProgressCacheKey("Asia/Riyadh");
  const cachedAt = 1_000;

  writeStudyProgressCache("user-a", cacheKey, progressFixture, cachedAt);
  assert.equal(readStudyProgressCache("user-a", cacheKey, cachedAt)?.data, progressFixture);
  assert.equal(readStudyProgressCache("user-a", cacheKey, cachedAt)?.isStale, false);
  assert.equal(readStudyProgressCache("user-b", cacheKey, cachedAt), null);
  assert.equal(
    readStudyProgressCache("user-a", cacheKey, cachedAt + studyProgressFreshnessMs)?.isStale,
    true
  );

  invalidateStudyProgressCache("user-a");
  const invalidated = readStudyProgressCache("user-a", cacheKey, cachedAt);
  assert.equal(invalidated?.data, progressFixture);
  assert.equal(invalidated?.isStale, true);

  clearStudyProgressCache("user-a");
  assert.equal(readStudyProgressCache("user-a", cacheKey), null);
});

test("deduplicates simultaneous progress refreshes", async () => {
  clearStudyProgressCache();
  const cacheKey = getStudyProgressCacheKey("Asia/Riyadh", "2026-10");
  let calls = 0;
  const loader = async () => {
    calls += 1;
    await Promise.resolve();
    return progressFixture;
  };

  const [first, second] = await Promise.all([
    loadStudyProgressCache("user-a", cacheKey, loader),
    loadStudyProgressCache("user-a", cacheKey, loader)
  ]);

  assert.equal(calls, 1);
  assert.equal(first, progressFixture);
  assert.equal(second, progressFixture);
  assert.equal(readStudyProgressCache("user-a", cacheKey)?.isStale, false);
});

test("does not repopulate a cleared cache from an older in-flight request", async () => {
  clearStudyProgressCache();
  const cacheKey = getStudyProgressCacheKey("Asia/Riyadh");
  let resolveRequest: ((value: StudyProgressResponse) => void) | undefined;
  const pending = loadStudyProgressCache(
    "user-a",
    cacheKey,
    () => new Promise<StudyProgressResponse>((resolve) => {
      resolveRequest = resolve;
    })
  );

  clearStudyProgressCache("user-a");
  resolveRequest?.(progressFixture);
  await pending;

  assert.equal(readStudyProgressCache("user-a", cacheKey), null);
});
