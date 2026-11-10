import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getQuestionBrowserStateKey,
  getRestoredQuestionIndex
} from "../src/features/browser/questionBrowserState.js";
import type { Question } from "../src/types/question.js";

const questions = [
  { id: "Q-001" },
  { id: "Q-002" },
  { id: "Q-003" }
] as Question[];

test("keeps browser state separate for every subject, topic, and subtopic", () => {
  assert.notEqual(
    getQuestionBrowserStateKey({ subject: "math", topic: "arithmetic", subtopic: "basic" }),
    getQuestionBrowserStateKey({ subject: "math", topic: "arithmetic", subtopic: "fractions" })
  );
  assert.notEqual(
    getQuestionBrowserStateKey({ subject: "math", topic: "arithmetic" }),
    getQuestionBrowserStateKey({ subject: "arabic", topic: "arithmetic" })
  );
});

test("restores a previously viewed question by authoritative question id", () => {
  assert.equal(getRestoredQuestionIndex(questions, "", "Q-002"), 1);
  assert.equal(getRestoredQuestionIndex(questions, "", "missing"), 0);
});

test("restoration respects the active search result instead of a database index", () => {
  assert.equal(getRestoredQuestionIndex(questions, "3", "Q-003"), 0);
});
