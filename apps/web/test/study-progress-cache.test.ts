import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearStudyProgressCache,
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
