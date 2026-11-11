import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { issueTestRegistrationCode } from "./helpers/auth.js";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-question-archive-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "archive-admin@example.com";
process.env.FRONTEND_ORIGIN = "http://localhost:5173";
process.env.JWT_SECRET = "question-archive-test-secret";
process.env.NODE_ENV = "test";
process.env.STORAGE_DRIVER = "local";

const { createApp } = await import("../src/app.js");
const { closeDatabase, db } = await import("../src/database/client.js");
const { importConfiguredAdminEmails } = await import(
  "../src/modules/admin/admin.service.js"
);
const { findQuestionById } = await import(
  "../src/modules/questions/question.repository.js"
);
const { getQuestions, saveQuestion } = await import(
  "../src/modules/questions/question.service.js"
);

const app = await createApp();
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;
const password = "correct horse battery";

const register = async (email: string) => {
  const verificationCode = await issueTestRegistrationCode(email);
  const response = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      email,
      password,
      passwordConfirmation: password,
      verificationCode
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(response.status, 201);
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
};

const login = async (email: string) => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    body: JSON.stringify({ email, password }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
};

const questionId = "Q-ARCHIVE-001";
const questionInput = {
  correctAnswer: "B" as const,
  difficulty: 4,
  difficultyScore: 4,
  id: questionId,
  imageStorageKey: `questions/${questionId}/question.webp`,
  questionImageUrl: `/question-images/${questionId}.webp`,
  questionScope: "general" as const,
  source: "excel" as const,
  subject: "quantitative" as const,
  subjectId: "math" as const,
  subtopic: "العمليات الأساسية",
  subtopicId: "basic-operations",
  topic: "الحساب",
  topicId: "arithmetic",
  version: 1
};

test("question archive is authorized, reversible, and preserves historical records", async () => {
  await register("archive-admin@example.com");
  const studentCookie = await register("archive-student@example.com");
  await importConfiguredAdminEmails();
  const adminCookie = await login("archive-admin@example.com");
  await saveQuestion(questionInput);

  const student = await db.prepare<string, { id: string }>(
    "SELECT id FROM users WHERE email = ?"
  ).get("archive-student@example.com");
  assert.ok(student);
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO sessions (
      session_id, user_id, question_order, created_at, updated_at, status
    ) VALUES (
      @sessionId, @userId, @questionOrder, @createdAt, @updatedAt, @status
    )
  `).run({
    createdAt: now,
    questionOrder: JSON.stringify([questionId]),
    sessionId: "session-archive-history",
    status: "completed",
    updatedAt: now,
    userId: student.id
  });
  await db.prepare(`
    INSERT INTO session_answers (
      session_id, question_id, user_answer, is_correct, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run("session-archive-history", questionId, "B", 1, now);
  await db.prepare(`
    INSERT INTO official_exams (
      id, user_id, status, current_section, started_at, completed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run("exam-archive-history", student.id, "completed", 5, now, now, now, now);
  await db.prepare(`
    INSERT INTO official_exam_questions (
      exam_id, section_number, position_in_section, global_position,
      category, question_id, user_answer, flagged, answered_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "exam-archive-history",
    1,
    1,
    1,
    "math",
    questionId,
    "B",
    0,
    now,
    now
  );

  const filteredList = await fetch(
    `${baseUrl}/admin/import/questions?mode=general&page=1&pageSize=10&subject=quantitative&topic=${encodeURIComponent("الحساب")}&subtopic=${encodeURIComponent("العمليات الأساسية")}&difficulty=4&source=excel`,
    { headers: { cookie: adminCookie } }
  );
  assert.equal(filteredList.status, 200);
  const filteredPayload = await filteredList.json() as {
    questions: Array<{ id: string }>;
    summary: { quantitative: number; total: number };
  };
  assert.deepEqual(filteredPayload.questions.map((question) => question.id), [questionId]);
  assert.equal(filteredPayload.summary.total, 1);
  assert.equal(filteredPayload.summary.quantitative, 1);

  const detailResponse = await fetch(
    `${baseUrl}/admin/import/questions/${encodeURIComponent(questionId)}`,
    { headers: { cookie: adminCookie } }
  );
  assert.equal(detailResponse.status, 200);
  const detailPayload = await detailResponse.json() as {
    question: { correctAnswer: string; id: string; status: string };
  };
  assert.deepEqual(detailPayload.question, {
    ...detailPayload.question,
    correctAnswer: "B",
    id: questionId,
    status: "active"
  });

  const forbiddenArchive = await fetch(
    `${baseUrl}/admin/import/questions/${encodeURIComponent(questionId)}`,
    { headers: { cookie: studentCookie }, method: "DELETE" }
  );
  assert.equal(forbiddenArchive.status, 403);

  const archiveResponse = await fetch(
    `${baseUrl}/admin/import/questions/${encodeURIComponent(questionId)}`,
    { headers: { cookie: adminCookie }, method: "DELETE" }
  );
  assert.equal(archiveResponse.status, 200);

  const archived = await findQuestionById(questionId);
  assert.ok(archived?.archived_at);
  assert.equal(archived?.archived_by.length > 0, true);
  assert.equal(archived?.image_storage_key, questionInput.imageStorageKey);

  const activeQuestions = await getQuestions({ subjectId: "math" });
  assert.equal(activeQuestions.some((question) => question.id === questionId), false);

  const listAfterArchive = await fetch(
    `${baseUrl}/admin/import/questions?mode=general&page=1&pageSize=10&query=${encodeURIComponent(questionId)}`,
    { headers: { cookie: adminCookie } }
  );
  assert.equal(listAfterArchive.status, 200);
  assert.deepEqual(
    (await listAfterArchive.json() as { questions: unknown[] }).questions,
    []
  );

  const detailAfterArchive = await fetch(
    `${baseUrl}/admin/import/questions/${encodeURIComponent(questionId)}`,
    { headers: { cookie: adminCookie } }
  );
  assert.equal(detailAfterArchive.status, 404);

  const sessionReference = await db.prepare<string, { count: number }>(`
    SELECT CAST(COUNT(*) AS INTEGER) AS count
    FROM session_answers
    WHERE question_id = ?
  `).get(questionId);
  const examReference = await db.prepare<string, { count: number }>(`
    SELECT CAST(COUNT(*) AS INTEGER) AS count
    FROM official_exam_questions
    WHERE question_id = ?
  `).get(questionId);
  assert.equal(sessionReference?.count, 1);
  assert.equal(examReference?.count, 1);

  await saveQuestion({ ...questionInput, version: 2 });
  assert.ok((await findQuestionById(questionId))?.archived_at);
  assert.equal((await getQuestions({})).some((question) => question.id === questionId), false);

  const repeatedArchive = await fetch(
    `${baseUrl}/admin/import/questions/${encodeURIComponent(questionId)}`,
    { headers: { cookie: adminCookie }, method: "DELETE" }
  );
  assert.equal(repeatedArchive.status, 200);
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())
  );
  await closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
