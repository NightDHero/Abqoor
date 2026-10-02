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
      phoneNumber: email.startsWith("invalid") ? "+966500000012" : "+966500000011"
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
  assert.equal(saved.profile.studyPlanBankCount, 14);
  assert.equal(saved.profile.studyPlanStudyDays, 14);
  assert.equal(saved.profile.studyPlanCalendarDays, 18);
  assert.equal(saved.profile.studyPlanCompletionDate, "2026-10-14");
  assert.equal(saved.profile.weeklyRestDay, 5);
  assert.equal(saved.profile.weeklyReviewDay, 6);

  const stored = await db.prepare<
    string,
    { study_plan_bank_count: number; weekly_rest_day: number; weekly_review_day: number }
  >("SELECT study_plan_bank_count, weekly_rest_day, weekly_review_day FROM student_profiles WHERE username = ?").get("plan_student");
  assert.equal(stored?.study_plan_bank_count, 14);
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

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
