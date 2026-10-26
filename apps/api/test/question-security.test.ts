import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { issueTestRegistrationCode } from "./helpers/auth.js";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-question-security-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "";
process.env.JWT_SECRET = "question-security-test-secret";
process.env.NODE_ENV = "test";
process.env.STORAGE_DRIVER = "local";

const { createApp } = await import("../src/app.js");
const { closeDatabase, db } = await import("../src/database/client.js");
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
  const registration = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      email: "question-student@example.com",
      password,
      passwordConfirmation: password,
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

const assertNoPrivateMetadata = (value: unknown) => {
  const keys = collectKeys(value);
  for (const privateKey of [
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

const assertNoAnswerKey = (value: unknown) => {
  const keys = collectKeys(value);
  assert.equal(keys.has("correctAnswer"), false);
  assert.equal(keys.has("correct_answer"), false);
};

test("ordinary practice exposes its answer key without storage metadata", async () => {
  const listResponse = await fetch(`${baseUrl}/questions`, {
    headers: { cookie }
  });
  assert.equal(listResponse.status, 200);
  const listPayload = await listResponse.json() as {
    questions: Array<{ correctAnswer?: string }>;
  };
  assertNoPrivateMetadata(listPayload);
  assert.equal(listPayload.questions[0]?.correctAnswer, "C");

  const detailResponse = await fetch(`${baseUrl}/questions/${questionId}`, {
    headers: { cookie }
  });
  assert.equal(detailResponse.status, 200);
  const detailPayload = await detailResponse.json() as {
    question: { correctAnswer?: string; questionImageUrl: string };
  };
  assertNoPrivateMetadata(detailPayload);
  assert.equal(detailPayload.question.correctAnswer, "C");
  assert.match(detailPayload.question.questionImageUrl, /[?&]signature=/);

  const saveResponse = await fetch(`${baseUrl}/review`, {
    body: JSON.stringify({ questionId, source: "manual" }),
    headers: { cookie, "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(saveResponse.status, 201);
  assertNoPrivateMetadata(await saveResponse.json());

  const reviewResponse = await fetch(`${baseUrl}/review`, {
    headers: { cookie }
  });
  assert.equal(reviewResponse.status, 200);
  const reviewPayload = await reviewResponse.json();
  assertNoPrivateMetadata(reviewPayload);
  assertNoAnswerKey(reviewPayload);
});

test("server still validates submitted practice answers authoritatively", async () => {
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

test("active official exam questions never expose answer keys through practice", async () => {
  const user = await db.prepare<string, { id: string }>(
    "SELECT id FROM users WHERE email = ?"
  ).get("question-student@example.com");
  assert.ok(user);
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO official_exams (
      id, user_id, status, current_section, started_at, created_at, updated_at
    ) VALUES (
      @id, @userId, 'active', 1, @now, @now, @now
    )
  `).run({ id: "question-security-exam", now, userId: user.id });
  await db.prepare(`
    INSERT INTO official_exam_questions (
      exam_id, section_number, position_in_section, global_position,
      category, question_id, flagged, updated_at
    ) VALUES (
      'question-security-exam', 1, 1, 1,
      'math', @questionId, 0, @now
    )
  `).run({ now, questionId });

  const listResponse = await fetch(`${baseUrl}/questions`, {
    headers: { cookie }
  });
  assert.equal(listResponse.status, 200);
  assertNoAnswerKey(await listResponse.json());

  const detailResponse = await fetch(`${baseUrl}/questions/${questionId}`, {
    headers: { cookie }
  });
  assert.equal(detailResponse.status, 200);
  assertNoAnswerKey(await detailResponse.json());

  const answerResponse = await fetch(`${baseUrl}/questions/${questionId}/answer`, {
    body: JSON.stringify({ answer: "A" }),
    headers: { cookie, "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(answerResponse.status, 409);
});

test("homepage preview exposes Q-001 without opening other question images", async () => {
  const previewResponse = await fetch(`${baseUrl}/question-images/Q-001.png`);
  assert.equal(previewResponse.status, 200);
  assert.equal(previewResponse.headers.get("cache-control"), "public, max-age=300");

  const protectedResponse = await fetch(`${baseUrl}/question-images/Q-002.png`);
  assert.equal(protectedResponse.status, 401);
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  await closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
