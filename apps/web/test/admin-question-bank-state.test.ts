import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  getQuestionBankPageCount,
  shouldShowQuestionBankEmptyState
} from "../src/features/admin/adminQuestionBankState.js";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const questionBankSource = readSource("../src/features/admin/AdminQuestionBankPage.tsx");
const questionBankStyles = readSource("../src/features/admin/admin-question-management.css");
const adminServiceSource = readSource("../src/services/adminService.ts");

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

test("question bank uses a compact contextual list without a permanent actions column", () => {
  assert.match(questionBankSource, /className="admin-question-list"/);
  assert.match(questionBankSource, /className="admin-question-row"/);
  assert.match(questionBankSource, /className="admin-question-actions"/);
  assert.doesNotMatch(questionBankSource, /<th>الإجراءات<\/th>/);
  assert.doesNotMatch(questionBankSource, /admin-question-active-status/);
  assert.match(
    questionBankStyles,
    /\.admin-question-row\s*\{[^}]*grid-template-columns:\s*auto minmax\(300px, 1\.5fr\)/s
  );
});

test("question bank exposes exact star difficulty filtering without rating tracks", () => {
  assert.match(questionBankSource, /function DifficultyRating/);
  assert.match(questionBankSource, /difficultyFilter/);
  assert.match(questionBankSource, /"★"\.repeat\(level\)/);
  assert.match(questionBankSource, /aria-pressed=\{difficultyFilter === level\}/);
  assert.match(adminServiceSource, /params\.set\("difficulty", String\(input\.difficulty\)\)/);
  assert.doesNotMatch(questionBankSource, /admin-question-difficulty-track/);
  assert.doesNotMatch(questionBankStyles, /\.admin-question-difficulty-track/);
  assert.doesNotMatch(questionBankSource, /الصعوبة: حتى/);
  assert.match(questionBankSource, /current === level \? null : level/);
});

test("question bank bulk selection archives only explicit active question ids", () => {
  assert.match(questionBankSource, /className="admin-question-select"/);
  assert.match(questionBankSource, /تحديد الكل/);
  assert.match(questionBankSource, /مسح التحديد/);
  assert.match(questionBankSource, /حذف المحدد/);
  assert.match(questionBankSource, /archiveQuestions\(selectedIds\)/);
  assert.match(questionBankSource, /setSelectedQuestionIds\(new Set\(\)\)/);
  assert.match(adminServiceSource, /JSON\.stringify\(\{ questionIds \}\)/);
  assert.match(adminServiceSource, /\/admin\/import\/questions\/archive/);
  assert.match(questionBankStyles, /\.admin-question-row\[data-selected="true"\]/);
});

test("question bank keeps dependent filters visible and individually clearable", () => {
  assert.match(questionBankSource, /setTopic\(""\);[\s\S]*setSubtopic\(""\);/);
  assert.match(questionBankSource, /className="admin-question-active-filters"/);
  assert.match(questionBankSource, /aria-label={`مسح فلتر \$\{chip\.label\}`}/);
  assert.match(questionBankSource, /<option value="archived">مؤرشف<\/option>/);
  assert.match(questionBankSource, /aria-live="polite" className="admin-question-result-count"/);
  assert.match(adminServiceSource, /params\.set\("status", input\.status\)/);
  assert.match(questionBankStyles, /label\[data-active="true"\]/);
});

test("RTL search icon stays inside and vertically centered in the field", () => {
  assert.match(
    questionBankStyles,
    /\.admin-question-search-control svg\s*\{[^}]*top:\s*50%;[^}]*inset-inline-start:\s*13px;[^}]*transform:\s*translateY\(-50%\);/s
  );
  assert.match(
    questionBankStyles,
    /\.admin-workspace \.admin-question-search-control input\s*\{[^}]*padding-inline:\s*42px 14px;/s
  );
});
