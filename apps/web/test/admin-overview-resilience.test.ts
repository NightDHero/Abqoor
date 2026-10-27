import assert from "node:assert/strict";
import test from "node:test";
import { loadAdminOverviewSnapshot } from "../src/features/admin/AdminOverviewPage.js";

test("admin overview preserves independent metrics when one request fails", async () => {
  const snapshot = await loadAdminOverviewSnapshot({
    accounts: async () => ({ admins: [{ id: "admin-1" }] }) as never,
    bankConfig: async () => ({ config: { availableBankCount: 14 } }) as never,
    history: async () => ({ jobs: [{ id: "job-1", status: "completed" }] }) as never,
    questionBank: async () => {
      throw new Error("question bank unavailable");
    }
  });

  assert.equal(snapshot.adminCount, 1);
  assert.equal(snapshot.bankCount, 14);
  assert.equal(snapshot.jobs?.length, 1);
  assert.equal(snapshot.questionCount, undefined);
  assert.deepEqual(snapshot.failed, ["questionBank"]);
});
