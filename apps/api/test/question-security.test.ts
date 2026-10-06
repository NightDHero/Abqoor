import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { issueTestPhoneVerificationCode, issueTestRegistrationCode } from "./helpers/auth.js";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-question-security-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "";
process.env.JWT_SECRET = "question-security-test-secret";
process.env.NODE_ENV = "test";
process.env.STORAGE_DRIVER = "local";

const { createApp } = await import("../src/app.js");
const { closeDatabase } = await import("../src/database/client.js");
const { saveQuestion } = await import(
  "../src/modules/questions/question.service.js"
);

const app = await createApp();
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

const questionId = "Q-SECURITY-001";
await saveQuestion({
  correctAnswer: "C",
  difficulty: 3,
  difficultyScore: 3,
  id: questionId,
  imageStorageKey: `questions/${questionId}/question.webp`,
  questionImageUrl: `/question-images/${questionId}.webp`,
  source: "manual",
  sourcePage: 7,
  subject: "quantitative",
  subjectId: "math",
  topic: "الحساب",
  topicId: "arithmetic",
  version: 1
});

const password = "correct horse battery";
const registerAndCompleteProfile = async () => {
  const verificationCode = await issueTestRegistrationCode("question-student@example.com");
  const phoneVerificationCode = await issueTestPhoneVerificationCode("+966500000081");
  const registration = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      email: "question-student@example.com",
      password,
      passwordConfirmation: password,
      phoneNumber: "+966500000081",
      phoneVerificationCode,
      verificationCode
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(registration.status, 201);
  const cookie = registration.headers.get("set-cookie")?.split(";")[0] ?? "";
  const profile = await fetch(`${baseUrl}/profile`, {
    body: JSON.stringify({
      hasExamDate: false,
      hasTakenQudurat: false,
      isAdmin: true,
      quantitativeStudyDays: [0, 2, 4],
      role: "admin",
      studyPlanBankCount: 10,
      studyPlanStartDate: "2026-10-01",
      targetScore: 90,
      userId: "attacker-selected-id",
      username: "q_security_student",
      verbalStudyDays: [1, 3],
      weakerSection: "both",
      weeklyRestDay: 5,
      weeklyReviewDay: 6
    }),
    headers: { cookie, "content-type": "application/json" },
    method: "PUT"
  });
  assert.equal(profile.status, 200);
  return cookie;
};

const cookie = await registerAndCompleteProfile();

const collectKeys = (value: unknown, keys = new Set<string>()) => {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
};

const assertLearnerSafe = (value: unknown) => {
  const keys = collectKeys(value);
  for (const privateKey of [
    "correctAnswer",
    "correct_answer",
    "answerKey",
    "imageStorageKey",
    "importJobId",
    "sourcePdfId",
    "sourcePage"
  ]) {
    assert.equal(keys.has(privateKey), false, `Unexpected private key: ${privateKey}`);
  }
};

test("student question and review DTOs do not expose grading or storage metadata", async () => {
  const listResponse = await fetch(`${baseUrl}/questions`, {
    headers: { cookie }
  });
  assert.equal(listResponse.status, 200);
  const listPayload = await listResponse.json();
  assertLearnerSafe(listPayload);

  const detailResponse = await fetch(`${baseUrl}/questions/${questionId}`, {
    headers: { cookie }
  });
  assert.equal(detailResponse.status, 200);
  const detailPayload = await detailResponse.json() as {
    question: { questionImageUrl: string };
  };
  assertLearnerSafe(detailPayload);
  assert.match(detailPayload.question.questionImageUrl, /[?&]signature=/);

  const saveResponse = await fetch(`${baseUrl}/review`, {
    body: JSON.stringify({ questionId, source: "manual" }),
    headers: { cookie, "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(saveResponse.status, 201);
  assertLearnerSafe(await saveResponse.json());

  const reviewResponse = await fetch(`${baseUrl}/review`, {
    headers: { cookie }
  });
  assert.equal(reviewResponse.status, 200);
  assertLearnerSafe(await reviewResponse.json());
});

test("server evaluates answers without exposing the answer before submission", async () => {
  const response = await fetch(`${baseUrl}/questions/${questionId}/answer`, {
    body: JSON.stringify({ answer: "A", correctAnswer: "A", score: 100 }),
    headers: { cookie, "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    correctAnswer: "C",
    isCorrect: false
  });

  const me = await fetch(`${baseUrl}/auth/me`, { headers: { cookie } });
  assert.equal(me.status, 200);
  const mePayload = await me.json() as { user: { isAdmin: boolean } };
  assert.equal(mePayload.user.isAdmin, false);
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  await closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
