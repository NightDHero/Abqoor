import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getQuestionBankPageCount,
  shouldShowQuestionBankEmptyState
} from "../src/features/admin/adminQuestionBankState.js";

test("shows the question-bank empty state only after a successful empty request", () => {
  assert.equal(shouldShowQuestionBankEmptyState({
    error: "",
    isLoading: false,
    questionCount: 0
  }), true);
  assert.equal(shouldShowQuestionBankEmptyState({
    error: "تعذر تحميل بنك الأسئلة.",
    isLoading: false,
    questionCount: 0
  }), false);
  assert.equal(shouldShowQuestionBankEmptyState({
    error: "",
    isLoading: true,
    questionCount: 0
  }), false);
  assert.equal(shouldShowQuestionBankEmptyState({
    error: "",
    isLoading: false,
    questionCount: 1
  }), false);
});

test("calculates question-bank pagination without requesting every record", () => {
  assert.equal(getQuestionBankPageCount(0, 50), 1);
  assert.equal(getQuestionBankPageCount(50, 50), 1);
  assert.equal(getQuestionBankPageCount(51, 50), 2);
  assert.equal(getQuestionBankPageCount(133, 25), 6);
});
