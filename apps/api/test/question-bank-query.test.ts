import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminQuestionTopicCountQuery } from "../src/modules/admin/importer/question-bank-query.js";

test("omits the optional bank parameter when listing all question counts", () => {
  const query = buildAdminQuestionTopicCountQuery({
    questionScope: "general"
  });

  assert.deepEqual(query.params, { questionScope: "general" });
  assert.doesNotMatch(query.sql, /@bankId/);
  assert.match(query.sql, /archived_at IS NULL/);
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

test("builds explicit archived and all-status question count queries", () => {
  const archived = buildAdminQuestionTopicCountQuery({
    questionScope: "general",
    status: "archived"
  });
  const all = buildAdminQuestionTopicCountQuery({
    questionScope: "general",
    status: "all"
  });

  assert.match(archived.sql, /archived_at IS NOT NULL/);
  assert.doesNotMatch(all.sql, /archived_at IS (?:NOT )?NULL/);
});
