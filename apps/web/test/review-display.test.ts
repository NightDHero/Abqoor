import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { ReviewBankResponse, ReviewItem } from "../src/services/reviewBankService.js";
import { buildReviewDisplayItems } from "../src/pages/reviewDisplay.js";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const reviewPageSource = readSource("../src/pages/ReviewPage.tsx");
const reviewStyles = readSource("../src/readiness-polish.css");

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

test("review information popover escapes row clipping with readable theme colors", () => {
  assert.match(reviewPageSource, /data-info-open=\{openInfoKey === itemKey\}/);
  assert.match(
    reviewStyles,
    /\.review-page \.review-section\s*\{[^}]*overflow:\s*visible;/s
  );
  assert.match(
    reviewStyles,
    /\.review-item\.review-item-interactive\s*\{[^}]*overflow:\s*visible;/s
  );
  assert.match(
    reviewStyles,
    /\.review-page \.review-date-tooltip\s*\{[^}]*background:\s*#092332;[^}]*color:\s*#f0f8fa;/s
  );
  assert.match(
    reviewStyles,
    /data-theme="light"[^}]*\.review-date-tooltip\s*\{[^}]*background:\s*#fff;[^}]*color:\s*#173449;/s
  );
});
