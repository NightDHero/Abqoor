import assert from "node:assert/strict";
import { test } from "node:test";
import { formatRelativeAdminDays } from "../../web/src/features/admin/adminUtils.js";

test("formats upload age from Riyadh calendar days", () => {
  const now = new Date("2026-10-05T12:00:00.000Z");

  assert.equal(formatRelativeAdminDays("2026-10-05T01:00:00.000Z", now), "اليوم");
  assert.equal(formatRelativeAdminDays("2026-10-04T01:00:00.000Z", now), "أمس");
  assert.equal(formatRelativeAdminDays("2026-10-03T01:00:00.000Z", now), "منذ يومين");
  assert.equal(formatRelativeAdminDays("2026-09-30T01:00:00.000Z", now), "منذ ٥ أيام");
  assert.equal(formatRelativeAdminDays("2026-09-21T01:00:00.000Z", now), "منذ ١٤ يوماً");
});
