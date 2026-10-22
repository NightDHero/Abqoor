import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearQueryCache,
  invalidateQueries,
  loadQuery,
  readQueryCache
} from "../src/services/queryCache.js";

test("deduplicates concurrent loads and reuses fresh navigation data", async () => {
  clearQueryCache();
  let requestCount = 0;
  const loader = async () => {
    requestCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { value: requestCount };
  };

  const [first, second] = await Promise.all([
    loadQuery({ key: "review:bank", loader, maxAgeMs: 60_000 }),
    loadQuery({ key: "review:bank", loader, maxAgeMs: 60_000 })
  ]);
  const revisit = await loadQuery({
    key: "review:bank",
    loader,
    maxAgeMs: 60_000
  });

  assert.equal(requestCount, 1);
  assert.deepEqual(first, second);
  assert.deepEqual(revisit, first);
});

test("invalidates matching data after mutations without clearing unrelated queries", async () => {
  clearQueryCache();
  let reviewRequests = 0;
  let questionRequests = 0;
  const loadReview = () => loadQuery({
    key: "review:bank",
    loader: async () => ({ value: ++reviewRequests }),
    maxAgeMs: 60_000
  });
  const loadQuestions = () => loadQuery({
    key: "questions:?topicId=geometry",
    loader: async () => ({ value: ++questionRequests }),
    maxAgeMs: 60_000
  });

  await loadReview();
  await loadQuestions();
  invalidateQueries("review:");
  await loadReview();
  await loadQuestions();

  assert.equal(reviewRequests, 2);
  assert.equal(questionRequests, 1);
  assert.equal(readQueryCache("review:bank", 60_000)?.isStale, false);
});
