import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearStudyProgressCache,
  loadStudyProgressCache,
  readStudyProgressCache,
  studyProgressMaximumEntriesPerUser,
  writeStudyProgressCache
} from "../src/features/career/studyProgressCache.js";
import type { StudyProgressResponse } from "../src/types/session.js";

const progress = {} as StudyProgressResponse;

test("bounds cached progress months per account with least-recently-used eviction", () => {
  clearStudyProgressCache();
  for (let index = 0; index < studyProgressMaximumEntriesPerUser; index += 1) {
    writeStudyProgressCache("user-1", `month-${index}`, progress, index + 1);
  }

  readStudyProgressCache("user-1", "month-0", 100);
  writeStudyProgressCache("user-1", "month-new", progress, 101);

  assert.ok(readStudyProgressCache("user-1", "month-0", 102));
  assert.equal(readStudyProgressCache("user-1", "month-1", 102), null);
  assert.ok(readStudyProgressCache("user-1", "month-new", 102));
  clearStudyProgressCache();
});

test("a synchronous progress loader failure does not poison later requests", async () => {
  clearStudyProgressCache();
  let requests = 0;
  const load = () => loadStudyProgressCache("user-1", "current", () => {
    requests += 1;
    if (requests === 1) throw new Error("progress failed before returning a promise");
    return Promise.resolve(progress);
  });

  await assert.rejects(load(), /progress failed/);
  assert.equal(await load(), progress);
  assert.equal(requests, 2);
  clearStudyProgressCache();
});
