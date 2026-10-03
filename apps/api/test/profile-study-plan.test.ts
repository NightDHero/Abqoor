import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-profile-plan-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "";
process.env.JWT_SECRET = "profile-plan-test-secret";
process.env.NODE_ENV = "test";

const { createApp } = await import("../src/app.js");
const { closeDatabase, db } = await import("../src/database/client.js");
const { normalizeStoredStudyDays } = await import("../src/modules/banks/bank-config.js");
const app = await createApp();
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

const register = async (email: string) => {
  const password = "correct horse battery";
  const response = await fetch(`${baseUrl}/auth/register`, {
    body: JSON.stringify({
      email,
      password,
      passwordConfirmation: password,
      phoneNumber: email.startsWith("invalid")
        ? "+966500000012"
        : email.startsWith("schedule-day")
          ? "+966500000014"
        : email.startsWith("schedule")
          ? "+966500000013"
          : "+966500000011"
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
};

test("persists one rest day and one distinct review day", async () => {
  const cookie = await register("plan@example.com");
  const configResponse = await fetch(`${baseUrl}/banks/config`, { headers: { cookie } });
  assert.equal(configResponse.status, 200);
  const config = (await configResponse.json()) as {
    config: { availableBankCount: number; mathQuestionsPerBank: number; verbalQuestionsPerBank: number };
  };
  assert.deepEqual(config.config, {
    availableBankCount: 14,
    mathQuestionsPerBank: 55,
    studyPaceBanksPerDay: 1,
    verbalQuestionsPerBank: 65
  });

  const saveResponse = await fetch(`${baseUrl}/profile`, {
    body: JSON.stringify({
      attemptCount: null,
      examDate: null,
      hasExamDate: false,
      hasTakenQudurat: false,
      latestScore: null,
      studyPlanBankCount: 10,
      studyPlanStartDate: "2026-09-27",
      targetScore: 90,
      username: "plan_student",
      weakerSection: "both",
      weeklyRestDay: 5,
      weeklyReviewDay: 6
    }),
    headers: { cookie, "content-type": "application/json" },
    method: "PUT"
  });
  assert.equal(saveResponse.status, 200);
  const saved = (await saveResponse.json()) as {
    profile: {
      studyPlanBankCount: number;
      studyPlanCalendarDays: number;
      studyPlanCompletionDate: string;
      studyPlanStudyDays: number;
      weeklyRestDay: number;
      weeklyReviewDay: number;
    };
  };
  assert.equal(saved.profile.studyPlanBankCount, 10);
  assert.equal(saved.profile.studyPlanStudyDays, 10);
  assert.equal(saved.profile.studyPlanCalendarDays, 12);
  assert.equal(saved.profile.studyPlanCompletionDate, "2026-10-08");
  assert.equal(saved.profile.weeklyRestDay, 5);
  assert.equal(saved.profile.weeklyReviewDay, 6);

  const stored = await db.prepare<
    string,
    { study_plan_bank_count: number; weekly_rest_day: number; weekly_review_day: number }
  >("SELECT study_plan_bank_count, weekly_rest_day, weekly_review_day FROM student_profiles WHERE username = ?").get("plan_student");
  assert.equal(stored?.study_plan_bank_count, 10);
  assert.equal(stored?.weekly_rest_day, 5);
  assert.equal(stored?.weekly_review_day, 6);
});

test("rejects using the same day for rest and review", async () => {
  const cookie = await register("invalid-plan@example.com");
  const response = await fetch(`${baseUrl}/profile`, {
    body: JSON.stringify({
      hasExamDate: false,
      hasTakenQudurat: false,
      studyPlanStartDate: "2026-09-27",
      targetScore: 90,
      username: "plan_student",
      weakerSection: "both",
      weeklyRestDay: 5,
      weeklyReviewDay: 5
    }),
    headers: { cookie, "content-type": "application/json" },
    method: "PUT"
  });
  assert.equal(response.status, 400);
});

test("accepts each valid single-day value and rejects out-of-range schedule days", async () => {
  const cookie = await register("schedule-day-validation@example.com");
  for (let weeklyRestDay = 0; weeklyRestDay <= 6; weeklyRestDay += 1) {
    const validResponse = await fetch(`${baseUrl}/profile/schedule-preview`, {
      body: JSON.stringify({
        studyPlanBankCount: 14,
        studyPlanStartDate: "2026-09-27",
        weeklyRestDay: String(weeklyRestDay),
        weeklyReviewDay: String((weeklyRestDay + 1) % 7)
      }),
      headers: { cookie, "content-type": "application/json" },
      method: "POST"
    });
    assert.equal(validResponse.status, 200);
  }

  for (const weeklyRestDay of [-1, 7, [5]]) {
    const invalidResponse = await fetch(`${baseUrl}/profile/schedule-preview`, {
      body: JSON.stringify({
        studyPlanBankCount: 14,
        studyPlanStartDate: "2026-09-27",
        weeklyRestDay,
        weeklyReviewDay: 6
      }),
      headers: { cookie, "content-type": "application/json" },
      method: "POST"
    });
    assert.equal(invalidResponse.status, 400);
  }
});

test("normalizes an invalid legacy schedule without changing new-input validation", () => {
  assert.deepEqual(
    normalizeStoredStudyDays({ restDay: 5, reviewDay: 5 }),
    { restDay: 5, reviewDay: 6 }
  );
});

test("derives a five-day alternating week from rest and review selections", async () => {
  const cookie = await register("schedule-preview@example.com");
  const response = await fetch(`${baseUrl}/profile/schedule-preview`, {
    body: JSON.stringify({
      studyPlanStartDate: "2026-09-27",
      weeklyRestDay: 5,
      weeklyReviewDay: 6
    }),
    headers: { cookie, "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(response.status, 200);

  const payload = (await response.json()) as {
    plan: {
      schedule: Array<{
        kind: "study" | "review" | "rest";
        questionTarget: number | null;
        subjectId: "math" | "arabic" | null;
      }>;
      weeklyReviewDays: number;
      weeklyRestDays: number;
      weeklyStudyDays: number;
    };
  };
  assert.equal(payload.plan.weeklyStudyDays, 5);
  assert.equal(payload.plan.weeklyReviewDays, 1);
  assert.equal(payload.plan.weeklyRestDays, 1);
  assert.deepEqual(
    payload.plan.schedule.map((day) => day.kind),
    ["study", "study", "study", "study", "study", "rest", "review"]
  );
  assert.deepEqual(
    payload.plan.schedule.map((day) => day.subjectId),
    ["math", "arabic", "math", "arabic", "math", null, null]
  );
  assert.deepEqual(
    payload.plan.schedule.map((day) => day.questionTarget),
    [55, 65, 55, 65, 55, null, null]
  );
  assert.equal(
    payload.plan.schedule.some((day) => day.questionTarget === 120),
    false
  );
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
