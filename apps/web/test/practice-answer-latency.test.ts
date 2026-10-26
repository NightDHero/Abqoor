import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { evaluatePracticeAnswer } from "../src/features/browser/practiceAnswer.js";
import { createImmediateStudyAnswer } from "../src/features/study/studyAnswer.js";
import type { Question } from "../src/types/question.js";

const question = {
  correctAnswer: "B",
  difficulty: 3,
  id: "latency-question",
  questionImageUrl: "/question.png",
  subject: "quantitative",
  topic: "الحساب"
} satisfies Question;

test("authorized practice feedback is synchronous under simulated network delay", () => {
  let remoteCalls = 0;
  const startedAt = performance.now();
  const evaluation = evaluatePracticeAnswer(question, "A", async () => {
    remoteCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { correctAnswer: "B", isCorrect: false };
  });
  const elapsedMs = performance.now() - startedAt;

  assert.equal(evaluation instanceof Promise, false);
  assert.deepEqual(evaluation, { correctAnswer: "B", isCorrect: false });
  assert.equal(remoteCalls, 0);
  assert.ok(elapsedMs < 20, `Immediate grading took ${elapsedMs.toFixed(2)} ms`);
});

test("protected questions retain the server-authoritative fallback", async () => {
  let settled = false;
  const evaluation = evaluatePracticeAnswer(
    { ...question, correctAnswer: undefined },
    "A",
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      settled = true;
      return { correctAnswer: "B", isCorrect: false };
    }
  );

  assert.ok(evaluation instanceof Promise);
  assert.equal(settled, false);
  assert.deepEqual(await evaluation, { correctAnswer: "B", isCorrect: false });
  assert.equal(settled, true);
});

test("study feedback can render while persistence is still pending", async () => {
  let persisted = false;
  const persistence = new Promise<void>((resolve) => {
    setTimeout(() => {
      persisted = true;
      resolve();
    }, 450);
  });
  const feedback = createImmediateStudyAnswer({
    activeDurationSeconds: 12,
    answer: "A",
    answeredAt: "2026-10-26T00:00:00.000Z",
    question: {
      correctAnswer: "B",
      difficulty: 3,
      id: "study-latency-question",
      questionImageUrl: "/question.png",
      subject: "quantitative",
      topic: "الحساب"
    },
    sessionId: "study-session"
  });

  assert.equal(persisted, false);
  assert.deepEqual(feedback, {
    activeDurationSeconds: 12,
    answeredAt: "2026-10-26T00:00:00.000Z",
    correctAnswer: "B",
    isCorrect: false,
    questionId: "study-latency-question",
    sessionId: "study-session",
    userAnswer: "A"
  });
  await persistence;
  assert.equal(persisted, true);
});
