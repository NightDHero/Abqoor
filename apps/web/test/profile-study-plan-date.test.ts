import assert from "node:assert/strict";
import test from "node:test";
import { getStudyPlanStartDateMinimum } from "../src/features/profile/StudyPlanFields";

test("an existing plan start date remains valid when it predates today", () => {
  assert.equal(
    getStudyPlanStartDateMinimum("2026-10-05", "2026-10-27"),
    "2026-10-05"
  );
});

test("new and future plans cannot select a date before today", () => {
  assert.equal(
    getStudyPlanStartDateMinimum("2026-10-27", "2026-10-27"),
    "2026-10-27"
  );
  assert.equal(
    getStudyPlanStartDateMinimum("2026-11-02", "2026-10-27"),
    "2026-10-27"
  );
});
