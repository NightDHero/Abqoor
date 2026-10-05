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
const { getStudyScheduleWeek, normalizeStoredStudySchedule } = await import("../src/modules/banks/bank-config.js");
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
        : email.startsWith("schedule-overlap")
          ? "+966500000015"
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
      quantitativeStudyDays: [0, 2, 4],
      studyPlanBankCount: 10,
      studyPlanStartDate: "2026-09-27",
      targetScore: 90,
      username: "plan_student",
      weakerSection: "both",
      weeklyRestDay: 5,
      weeklyReviewDay: 6,
      verbalStudyDays: [1, 3]
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
      quantitativeStudyDays: number[];
      weeklyRestDay: number;
      weeklyReviewDay: number;
      verbalStudyDays: number[];
    };
  };
  assert.equal(saved.profile.studyPlanBankCount, 10);
  assert.equal(saved.profile.studyPlanStudyDays, 10);
  assert.equal(saved.profile.studyPlanCalendarDays, 12);
  assert.equal(saved.profile.studyPlanCompletionDate, "2026-10-08");
  assert.equal(saved.profile.weeklyRestDay, 5);
  assert.equal(saved.profile.weeklyReviewDay, 6);
  assert.deepEqual(saved.profile.quantitativeStudyDays, [0, 2, 4]);
  assert.deepEqual(saved.profile.verbalStudyDays, [1, 3]);

  const stored = await db.prepare<
    string,
    { quantitative_study_days_json: string; study_plan_bank_count: number; verbal_study_days_json: string; weekly_rest_day: number; weekly_review_day: number }
  >("SELECT quantitative_study_days_json, study_plan_bank_count, verbal_study_days_json, weekly_rest_day, weekly_review_day FROM student_profiles WHERE username = ?").get("plan_student");
  assert.equal(stored?.study_plan_bank_count, 10);
  assert.equal(stored?.weekly_rest_day, 5);
  assert.equal(stored?.weekly_review_day, 6);
  assert.equal(stored?.quantitative_study_days_json, "[0,2,4]");
  assert.equal(stored?.verbal_study_days_json, "[1,3]");

  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    body: JSON.stringify({ email: "plan@example.com", password: "correct horse battery" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  assert.equal(loginResponse.status, 200);
  const persistedProfileResponse = await fetch(`${baseUrl}/profile`, {
    headers: { cookie: loginResponse.headers.get("set-cookie")?.split(";")[0] ?? "" }
  });
  assert.equal(persistedProfileResponse.status, 200);
  const persisted = (await persistedProfileResponse.json()) as {
    profile: { quantitativeStudyDays: number[]; verbalStudyDays: number[] };
  };
  assert.deepEqual(persisted.profile.quantitativeStudyDays, [0, 2, 4]);
  assert.deepEqual(persisted.profile.verbalStudyDays, [1, 3]);
});

test("rejects using the same day for rest and review", async () => {
  const cookie = await register("invalid-plan@example.com");
  const response = await fetch(`${baseUrl}/profile`, {
    body: JSON.stringify({
      hasExamDate: false,
      hasTakenQudurat: false,
      quantitativeStudyDays: [0, 2, 4],
      studyPlanStartDate: "2026-09-27",
      targetScore: 90,
      username: "plan_student",
      weakerSection: "both",
      weeklyRestDay: 5,
      weeklyReviewDay: 5,
      verbalStudyDays: [1, 3]
    }),
    headers: { cookie, "content-type": "application/json" },
    method: "PUT"
  });
  assert.equal(response.status, 400);
});

test("accepts both valid 2/3 subject distributions", async () => {
  const cookie = await register("schedule-day-validation@example.com");
  const schedules = [
    { quantitativeStudyDays: [2, 6], verbalStudyDays: [0, 3, 4], weeklyRestDay: 5, weeklyReviewDay: 1 },
    { quantitativeStudyDays: [0, 2, 5], verbalStudyDays: [1, 4], weeklyRestDay: 3, weeklyReviewDay: 6 }
  ];
  for (const schedule of schedules) {
    const validResponse = await fetch(`${baseUrl}/profile/schedule-preview`, {
      body: JSON.stringify({
        studyPlanBankCount: 14,
        studyPlanStartDate: "2026-09-27",
        ...schedule
      }),
      headers: { cookie, "content-type": "application/json" },
      method: "POST"
    });
    assert.equal(validResponse.status, 200);
  }

});

test("normalizes a legacy schedule deterministically without random assignments", () => {
  assert.deepEqual(
    normalizeStoredStudySchedule({
      quantitativeStudyDays: "[]",
      restDay: 5,
      reviewDay: 5,
      verbalStudyDays: "[]"
    }),
    {
      quantitativeStudyDays: [0, 2, 4],
      restDay: 5,
      reviewDay: 6,
      verbalStudyDays: [1, 3]
    }
  );
});

test("derives the week from saved weekday assignments instead of alternating dates", async () => {
  const cookie = await register("schedule-preview@example.com");
  const response = await fetch(`${baseUrl}/profile/schedule-preview`, {
    body: JSON.stringify({
      studyPlanStartDate: "2026-09-27",
      quantitativeStudyDays: [0, 1, 3],
      weeklyRestDay: 5,
      weeklyReviewDay: 6,
      verbalStudyDays: [2, 4]
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
    ["math", "math", "arabic", "math", "arabic", null, null]
  );
  assert.deepEqual(
    payload.plan.schedule.map((day) => day.questionTarget),
    [55, 55, 65, 55, 65, null, null]
  );
  assert.equal(
    payload.plan.schedule.some((day) => day.questionTarget === 120),
    false
  );

  const nextWeek = getStudyScheduleWeek({
    quantitativeStudyDays: [0, 1, 3],
    restDay: 5,
    reviewDay: 6,
    startDate: "2026-09-27",
    verbalStudyDays: [2, 4],
    weekDate: "2026-10-04"
  });
  assert.deepEqual(
    nextWeek.map((day) => day.subjectId),
    ["arabic", "arabic", "math", "arabic", "math", null, null]
  );
});

test("rejects invalid role counts, missing standalone days, and duplicate assignments", async () => {
  const cookie = await register("schedule-overlap@example.com");
  for (const body of [
    {
      quantitativeStudyDays: [0, 2, 4],
      verbalStudyDays: [0, 1],
      weeklyRestDay: 5,
      weeklyReviewDay: 6
    },
    {
      quantitativeStudyDays: [0, 2, 4, 5],
      verbalStudyDays: [1, 3],
      weeklyRestDay: 5,
      weeklyReviewDay: 6
    },
    {
      quantitativeStudyDays: [0, 2],
      verbalStudyDays: [1, 3, 4, 6],
      weeklyRestDay: 5,
      weeklyReviewDay: 6
    },
    {
      quantitativeStudyDays: [0, 2],
      verbalStudyDays: [1, 3],
      weeklyRestDay: 5,
      weeklyReviewDay: 6
    },
    {
      quantitativeStudyDays: [0, 2, 4],
      verbalStudyDays: [1, 3],
      weeklyRestDay: 5
    },
    {
      quantitativeStudyDays: [0, 2, 4],
      verbalStudyDays: [1, 3],
      weeklyReviewDay: 6
    },
    {
      quantitativeStudyDays: [0, 2, 4],
      verbalStudyDays: [1, 3],
      weeklyRestDay: [5, 6],
      weeklyReviewDay: 6
    },
    {
      quantitativeStudyDays: [0, 2, 4],
      verbalStudyDays: [1, 3],
      weeklyRestDay: 5,
      weeklyReviewDay: [5, 6]
    },
    {
      quantitativeStudyDays: [0, 2, 4],
      verbalStudyDays: [1, 3],
      weeklyRestDay: 5,
      weeklyReviewDay: 5
    }
  ]) {
    const response = await fetch(`${baseUrl}/profile/schedule-preview`, {
      body: JSON.stringify({
        ...body,
        studyPlanStartDate: "2026-09-27"
      }),
      headers: { cookie, "content-type": "application/json" },
      method: "POST"
    });
    assert.equal(response.status, 400);
  }
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
