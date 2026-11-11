import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminQuestionTopicCountQuery } from "../src/modules/admin/importer/question-bank-query.js";

test("omits the optional bank parameter when listing all question counts", () => {
  const query = buildAdminQuestionTopicCountQuery({
    questionScope: "general"
  });

  assert.deepEqual(query.params, { questionScope: "general" });
  assert.doesNotMatch(query.sql, /@bankId/);
});

test("adds a typed bank equality only when a bank is selected", () => {
  const query = buildAdminQuestionTopicCountQuery({
    bankId: "bank-1",
    questionScope: "aqsam"
  });

  assert.deepEqual(query.params, {
    bankId: "bank-1",
    questionScope: "aqsam"
  });
  assert.match(query.sql, /AND bank_id = @bankId/);
  assert.doesNotMatch(query.sql, /@bankId\s+IS\s+NULL/i);
});
