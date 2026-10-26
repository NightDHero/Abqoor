import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const trackerSource = readFileSync(
  new URL("../src/features/career/StudyProgressTracker.tsx", import.meta.url),
  "utf8"
);
const hubStyles = readFileSync(
  new URL("../src/features/career/hub.css", import.meta.url),
  "utf8"
);

test("study progress loading state retains the responsive overview grid", () => {
  assert.match(
    trackerSource,
    /className="study-progress-overview-grid study-progress-overview-grid-loading"/
  );
  assert.match(
    hubStyles,
    /\.study-progress-overview-grid-loading\s*\{[^}]*grid-template-areas:\s*"progress";/s
  );
  assert.match(
    hubStyles,
    /@container[^}]+\{[\s\S]*\.study-progress-overview-grid-loading\s*\{[^}]*grid-template-areas:\s*"progress plan";/
  );
});
