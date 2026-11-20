import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getCareerDayTheme } from "../src/features/career/careerDayTheme.js";

const careerStyles = readFileSync(
  new URL("../src/features/career/hub.css", import.meta.url),
  "utf8"
);

test("career day theme follows authoritative study-plan data", () => {
  assert.equal(getCareerDayTheme({ planKind: "rest", planSubjectId: null }), "rest");
  assert.equal(getCareerDayTheme({ planKind: "study", planSubjectId: "math" }), "math");
  assert.equal(getCareerDayTheme({ planKind: "study", planSubjectId: "arabic" }), "verbal");
  assert.equal(getCareerDayTheme({ planKind: "review", planSubjectId: null }), "neutral");
});

test("rest-day atmosphere is edge-scoped, non-interactive, and motion-aware", () => {
  assert.match(careerStyles, /\.hub-day-atmosphere\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(careerStyles, /data-today-theme="rest"/);
  assert.match(careerStyles, /hub-rest-orbit-drift/);
  assert.match(
    careerStyles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.hub-day-edge,[\s\S]*\.hub-day-star,/
  );
});

test("math and verbal days expose distinct accent treatments", () => {
  assert.match(careerStyles, /data-today-theme="math"/);
  assert.match(careerStyles, /rgb\(255 145 54 \/ 24%\)/);
  assert.match(careerStyles, /data-today-theme="verbal"/);
  assert.match(careerStyles, /rgb\(39 203 231 \/ 24%\)/);
});
