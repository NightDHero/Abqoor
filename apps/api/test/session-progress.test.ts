import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-session-progress-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "";
process.env.JWT_SECRET = "session-progress-test-secret";
process.env.NODE_ENV = "test";

const { createApp } = await import("../src/app.js");
const { db } = await import("../src/database/client.js");
const { registerUser } = await import("../src/modules/auth/auth.service.js");
const { upsertStudentProfile } = await import(
  "../src/modules/profile/profile.repository.js"
);

const app = createApp();
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

const password = "12345678";

const cookieFrom = (response: Response) =>
  response.headers.get("set-cookie")?.split(";")[0] ?? "";

const login = async (email: string) => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    body: JSON.stringify({ email, password }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  return { cookie: cookieFrom(response), response };
};

const insertQuestion = (input: {
  id: string;
  estimatedTimeSeconds: number | null;
}) => {
  const now = new Date().toISOString();
  db.prepare(
    `
      INSERT INTO questions (
        id,
        question_image_url,
        correct_answer,
        subject,
        subject_id,
        topic,
        topic_id,
        subtopic,
        subtopic_id,
        difficulty,
        difficulty_score,
        estimated_time_seconds,
        source,
        version,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @questionImageUrl,
        'A',
        'quantitative',
        'math',
        'النسب',
        'ratios',
        NULL,
        NULL,
        4,
        4,
        @estimatedTimeSeconds,
        'manual',
        1,
        @now,
        @now
      )
    `
  ).run({
    estimatedTimeSeconds: input.estimatedTimeSeconds,
    id: input.id,
    now,
    questionImageUrl: `/media/questions/${input.id}.png`
  });
};

const insertAnsweredQuestion = (input: {
  activeDurationSeconds: number | null;
  answeredAt: string;
  isCorrect: 0 | 1;
  questionId: string;
  sessionId: string;
  userId: string;
}) => {
  db.prepare(
    `
      INSERT INTO sessions (
        session_id,
        user_id,
        question_order,
        created_at,
        updated_at,
        status
      )
      VALUES (@sessionId, @userId, @questionOrder, @answeredAt, @answeredAt, 'active')
      ON CONFLICT(session_id) DO NOTHING
    `
  ).run({
    answeredAt: input.answeredAt,
    questionOrder: JSON.stringify([input.questionId]),
    sessionId: input.sessionId,
    userId: input.userId
  });

  db.prepare(
    `
      INSERT INTO session_answers (
        session_id,
        question_id,
        user_answer,
        is_correct,
        active_duration_seconds,
        created_at
      )
      VALUES (
        @sessionId,
        @questionId,
        'A',
        @isCorrect,
        @activeDurationSeconds,
        @answeredAt
      )
    `
  ).run(input);
};

const getCurrentUtcMonthDayCount = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)
  ).getUTCDate();
};

const getMonthDayCount = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

const getCurrentUtcYearDayCount = () => {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 1);
  const end = Date.UTC(now.getUTCFullYear(), 11, 31);
  return Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
};

test("summarizes real session activity into study progress windows", async () => {
  const user = await registerUser("progress@example.com", password);
  upsertStudentProfile({
    attemptCount: null,
    examDate: null,
    hasExamDate: false,
    hasTakenQudurat: false,
    latestScore: null,
    studyStrategyPreference: "balanced",
    studyStylePreference: "no_preference",
    targetScore: 90,
    userId: user.id,
    username: "progress_user",
    weakerSection: "both",
    weeklyStudyHours: "5_to_10"
  });

  insertQuestion({ estimatedTimeSeconds: 120, id: "Q-PROGRESS-001" });
  insertQuestion({ estimatedTimeSeconds: null, id: "Q-PROGRESS-002" });
  insertQuestion({ estimatedTimeSeconds: 60, id: "Q-PROGRESS-003" });
  insertQuestion({ estimatedTimeSeconds: 600, id: "Q-PROGRESS-004" });
  insertQuestion({ estimatedTimeSeconds: 60, id: "Q-PROGRESS-005" });
  insertQuestion({ estimatedTimeSeconds: 60, id: "Q-PROGRESS-006" });
  insertQuestion({ estimatedTimeSeconds: 60, id: "Q-PROGRESS-007" });

  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
  const sixDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);

  insertAnsweredQuestion({
    activeDurationSeconds: 70,
    answeredAt: today.toISOString(),
    isCorrect: 1,
    questionId: "Q-PROGRESS-001",
    sessionId: "progress-session-today",
    userId: user.id
  });
  insertAnsweredQuestion({
    activeDurationSeconds: 45,
    answeredAt: today.toISOString(),
    isCorrect: 0,
    questionId: "Q-PROGRESS-002",
    sessionId: "progress-session-today",
    userId: user.id
  });
  insertAnsweredQuestion({
    activeDurationSeconds: 40,
    answeredAt: yesterday.toISOString(),
    isCorrect: 1,
    questionId: "Q-PROGRESS-003",
    sessionId: "progress-session-yesterday",
    userId: user.id
  });
  insertAnsweredQuestion({
    activeDurationSeconds: null,
    answeredAt: today.toISOString(),
    isCorrect: 1,
    questionId: "Q-PROGRESS-004",
    sessionId: "progress-session-today",
    userId: user.id
  });
  insertAnsweredQuestion({
    activeDurationSeconds: 30,
    answeredAt: fourDaysAgo.toISOString(),
    isCorrect: 1,
    questionId: "Q-PROGRESS-005",
    sessionId: "progress-session-four-days-ago",
    userId: user.id
  });
  insertAnsweredQuestion({
    activeDurationSeconds: 30,
    answeredAt: fiveDaysAgo.toISOString(),
    isCorrect: 1,
    questionId: "Q-PROGRESS-006",
    sessionId: "progress-session-five-days-ago",
    userId: user.id
  });
  insertAnsweredQuestion({
    activeDurationSeconds: 30,
    answeredAt: sixDaysAgo.toISOString(),
    isCorrect: 1,
    questionId: "Q-PROGRESS-007",
    sessionId: "progress-session-six-days-ago",
    userId: user.id
  });

  const { cookie, response: loginResponse } = await login("progress@example.com");
  assert.equal(loginResponse.status, 200);

  const response = await fetch(`${baseUrl}/sessions/progress?timeZone=UTC`, {
    headers: { cookie }
  });
  assert.equal(response.status, 200);

  const payload = (await response.json()) as {
    activeStudyDay: number;
    streak: {
      current: number;
      highest: number;
    };
    today: {
      answeredQuestions: number;
      correctAnswers: number;
      approximateStudySeconds: number;
    };
    week: {
      activeDays: number;
      answeredQuestions: number;
      correctAnswers: number;
      approximateStudySeconds: number;
      days: unknown[];
    };
    month: { days: unknown[]; endDate: string; startDate: string };
    monthWeeks: Array<{ days: unknown[]; endDate: string; startDate: string }>;
    year: { days: unknown[] };
  };

  assert.equal(payload.activeStudyDay, 5);
  assert.equal(payload.today.answeredQuestions, 3);
  assert.equal(payload.today.correctAnswers, 2);
  assert.equal(payload.today.approximateStudySeconds, 115);
  assert.equal(payload.streak.current, 2);
  assert.equal(payload.streak.highest, 3);
  assert.equal(payload.week.activeDays, 5);
  assert.equal(payload.week.answeredQuestions, 7);
  assert.equal(payload.week.correctAnswers, 6);
  assert.equal(payload.week.approximateStudySeconds, 245);
  assert.equal(payload.week.days.length, 7);
  assert.equal(payload.month.days.length, getCurrentUtcMonthDayCount());
  assert.ok(payload.monthWeeks.length >= 4);
  assert.equal(payload.monthWeeks.every((week) => week.days.length === 7), true);
  assert.equal(payload.year.days.length, getCurrentUtcYearDayCount());
  assert.equal(JSON.stringify(payload).includes("password"), false);

  const requestedMonthResponse = await fetch(
    `${baseUrl}/sessions/progress?timeZone=UTC&month=2024-02`,
    {
      headers: { cookie }
    }
  );
  assert.equal(requestedMonthResponse.status, 200);

  const requestedMonthPayload = (await requestedMonthResponse.json()) as {
    month: { days: unknown[]; endDate: string; startDate: string };
    monthWeeks: Array<{ endDate: string; startDate: string }>;
  };
  assert.equal(requestedMonthPayload.month.startDate, "2024-02-01");
  assert.equal(requestedMonthPayload.month.endDate, "2024-02-29");
  assert.equal(requestedMonthPayload.month.days.length, getMonthDayCount("2024-02"));
  assert.equal(requestedMonthPayload.monthWeeks[0]?.startDate, "2024-01-28");
  assert.equal(requestedMonthPayload.monthWeeks.at(-1)?.endDate, "2024-03-02");

  const invalidMonthResponse = await fetch(
    `${baseUrl}/sessions/progress?timeZone=UTC&month=2024-13`,
    {
      headers: { cookie }
    }
  );
  assert.equal(invalidMonthResponse.status, 400);
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  db.close();
  rmSync(testDirectory, { force: true, recursive: true });
});
