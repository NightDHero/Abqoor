import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldShowBankConfigLoading } from "../src/pages/ProfilePage.js";

test("bank settings loader only appears while its request is pending", () => {
  assert.equal(shouldShowBankConfigLoading(true, null), true);
  assert.equal(shouldShowBankConfigLoading(false, null), false);
});
