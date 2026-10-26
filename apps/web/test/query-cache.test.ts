import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearQueryCache,
  invalidateQueries,
  loadQuery,
  readQueryCache,
  setQueryCacheScope,
  writeQueryCache
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

test("keeps authenticated cache entries isolated across account and role scopes", async () => {
  setQueryCacheScope("user:one:admin:0");
  await loadQuery({
    key: "profile:current",
    loader: async () => ({ username: "first" }),
    maxAgeMs: 60_000
  });

  setQueryCacheScope("user:two:admin:0");
  assert.equal(readQueryCache("profile:current", 60_000), null);

  await loadQuery({
    key: "admin:accounts",
    loader: async () => ({ admins: ["second"] }),
    maxAgeMs: 60_000
  });
  setQueryCacheScope("user:two:admin:1");
  assert.equal(readQueryCache("admin:accounts", 60_000), null);

  setQueryCacheScope("anonymous");
  clearQueryCache();
});

test("does not repopulate an invalidated key from an older in-flight response", async () => {
  clearQueryCache();
  let resolveRequest!: (value: { value: string }) => void;
  const pending = loadQuery({
    key: "admin:questions:page=1",
    loader: () => new Promise<{ value: string }>((resolve) => {
      resolveRequest = resolve;
    }),
    maxAgeMs: 60_000
  });

  invalidateQueries("admin:questions:");
  resolveRequest({ value: "stale" });
  assert.deepEqual(await pending, { value: "stale" });
  assert.equal(readQueryCache("admin:questions:page=1", 60_000), null);
});

test("does not let an older in-flight response overwrite a mutation result", async () => {
  clearQueryCache();
  let resolveRequest!: (value: { value: string }) => void;
  const pending = loadQuery({
    key: "profile:current",
    loader: () => new Promise<{ value: string }>((resolve) => {
      resolveRequest = resolve;
    }),
    maxAgeMs: 60_000
  });

  writeQueryCache("profile:current", { value: "fresh mutation" });
  resolveRequest({ value: "stale request" });
  assert.deepEqual(await pending, { value: "stale request" });
  assert.deepEqual(
    readQueryCache<{ value: string }>("profile:current", 60_000)?.data,
    { value: "fresh mutation" }
  );
});

test("refreshes an expired cache entry while retaining query-specific keys", async () => {
  clearQueryCache();
  writeQueryCache("admin:questions:page=1&sort=asc", { value: "old" }, 1_000);
  writeQueryCache("admin:questions:page=1&sort=desc", { value: "descending" }, 2_000);

  assert.equal(
    readQueryCache<{ value: string }>(
      "admin:questions:page=1&sort=asc",
      100,
      1_101
    )?.isStale,
    true
  );

  let requests = 0;
  const refreshed = await loadQuery({
    key: "admin:questions:page=1&sort=asc",
    loader: async () => ({ value: `fresh-${++requests}` }),
    maxAgeMs: 100
  });

  assert.deepEqual(refreshed, { value: "fresh-1" });
  assert.deepEqual(
    readQueryCache<{ value: string }>(
      "admin:questions:page=1&sort=desc",
      60_000
    )?.data,
    { value: "descending" }
  );
});

test("removes failed in-flight requests so a later intent can retry", async () => {
  clearQueryCache();
  let requests = 0;
  const load = () => loadQuery({
    key: "profile:retry",
    loader: async () => {
      requests += 1;
      if (requests === 1) throw new Error("temporary failure");
      return { ready: true };
    },
    maxAgeMs: 60_000
  });

  await assert.rejects(load(), /temporary failure/);
  assert.deepEqual(await load(), { ready: true });
  assert.equal(requests, 2);
});
