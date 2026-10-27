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

test("study progress loading state occupies the full content region at every width", () => {
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
    /@container[^}]+\{[\s\S]*\.study-progress-overview-grid-loading\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);[^}]*grid-template-areas:\s*"progress";/
  );
  assert.match(
    hubStyles,
    /\.study-progress-journey-loading\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;[^}]*width:\s*100%;/s
  );
});
