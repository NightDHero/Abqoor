import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReviewBankResponse, ReviewItem } from "../src/services/reviewBankService.js";
import { buildReviewDisplayItems } from "../src/pages/reviewDisplay.js";

const item = (overrides: Partial<ReviewItem>): ReviewItem => ({
  addedAt: "2026-11-15T06:00:00.000Z",
  difficulty: 2,
  id: "review-1",
  priority: 0,
  questionId: "question-25",
  questionImageUrl: "/media/questions/question-25",
  source: "wrong_answer",
  sourceQuestionNumber: 25,
  subject: "quantitative",
  subjectId: "math",
  topic: "الحساب",
  topicId: "arithmetic",
  updatedAt: "2026-11-15T06:00:00.000Z",
  ...overrides
});

test("combined review display deduplicates a question while preserving both records", () => {
  const bank: ReviewBankResponse = {
    savedQuestions: [item({ id: "manual-25", source: "manual" })],
    wrongQuestions: [item({ id: "wrong-25", source: "wrong_answer" })]
  };
  const combined = buildReviewDisplayItems(bank, "all");

  assert.equal(combined.length, 1);
  assert.deepEqual(combined[0]?.reviewItemIds.sort(), ["manual-25", "wrong-25"]);
  assert.deepEqual(combined[0]?.sources.sort(), ["manual", "wrong_answer"]);
  assert.equal(buildReviewDisplayItems(bank, "wrong").length, 1);
  assert.equal(buildReviewDisplayItems(bank, "saved").length, 1);
});

test("review display keeps distinct questions and sorts priority before recency", () => {
  const bank: ReviewBankResponse = {
    savedQuestions: [item({ id: "manual-26", questionId: "question-26", priority: 4 })],
    wrongQuestions: [item({ id: "wrong-25", priority: 1 })]
  };
  const combined = buildReviewDisplayItems(bank, "all");

  assert.equal(combined.length, 2);
  assert.equal(combined[0]?.item.questionId, "question-26");
});
