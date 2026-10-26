import assert from "node:assert/strict";
import { test } from "node:test";
import { runPreloadQueue } from "../src/utils/preloadQueue.js";

test("bounds speculative preload concurrency", async () => {
  let active = 0;
  let maximumActive = 0;

  await runPreloadQueue([1, 2, 3, 4, 5], async () => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
  }, { concurrency: 2 });

  assert.equal(maximumActive, 2);
});

test("continues after a failed preload and honors cancellation", async () => {
  const visited: number[] = [];
  let keepGoing = true;

  await runPreloadQueue([1, 2, 3, 4], async (item) => {
    visited.push(item);
    if (item === 1) throw new Error("optional preload failed");
    if (item === 2) keepGoing = false;
  }, {
    concurrency: 1,
    shouldContinue: () => keepGoing
  });

  assert.deepEqual(visited, [1, 2]);
});
