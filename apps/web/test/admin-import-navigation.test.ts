import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { getNavigationItems } from "../src/components/layout/AppNavigation.js";
import {
  adminImportExcelLimitBytes,
  adminImportPdfLimitBytes,
  adminImportWorkflowSteps
} from "../src/features/admin/importLimits.js";

const workspaceRoot = resolve(import.meta.dirname, "../../..");

test("keeps the question upload workflow vertical and ordered", () => {
  assert.deepEqual(adminImportWorkflowSteps, [
    "نوع الرفع والبنك",
    "ملف Excel",
    "النطاق ومصدر الصور",
    "مراجعة الإعدادات",
    "المعاينة والتحقق",
    "تأكيد الرفع",
    "النتيجة النهائية"
  ]);
  assert.equal(adminImportExcelLimitBytes, 100 * 1024 * 1024);
  assert.equal(adminImportPdfLimitBytes, 1024 * 1024 * 1024);

  const source = readFileSync(
    resolve(workspaceRoot, "apps/web/src/features/admin/AdminImportPage.tsx"),
    "utf8"
  );
  const stepPositions = ["1", "2", "3", "4"].map((step) =>
    source.indexOf(`data-step="${step}"`)
  );
  assert.equal(stepPositions.every((position) => position >= 0), true);
  assert.deepEqual([...stepPositions].sort((left, right) => left - right), stepPositions);
});

test("renders backend workbook diagnostics in a contained expandable preview", () => {
  const source = readFileSync(
    resolve(workspaceRoot, "apps/web/src/features/admin/AdminImportPage.tsx"),
    "utf8"
  );
  const css = readFileSync(
    resolve(workspaceRoot, "apps/web/src/features/admin/admin-question-management.css"),
    "utf8"
  );

  assert.match(source, /بيانات Excel المستخرجة/);
  assert.match(source, /JSON\.stringify\(detail\.diagnostics, null, 2\)/);
  assert.match(source, /sheet\.columnMappings/);
  assert.match(source, /row\.rawValues/);
  assert.match(source, /row\.sourceIdentifiers/);
  assert.match(source, /row\.comparisonA/);
  assert.match(source, /row\.additionalCategory/);
  assert.match(source, /row\.mediaMatchStatus/);
  assert.match(css, /\.admin-diagnostic-rows-wrap\s*\{[\s\S]*?max-height:\s*520px;[\s\S]*?overflow:\s*auto;/);
});

test("places the website destination last for regular users and administrators", () => {
  for (const isAdmin of [false, true]) {
    const items = getNavigationItems(isAdmin);
    assert.equal(items.at(-1)?.route, "/");
    assert.equal(items.filter((item) => item.route === "/").length, 1);
  }
});

test("keeps the unfinished-plan backlog internally scrollable", () => {
  const css = readFileSync(
    resolve(workspaceRoot, "apps/web/src/features/career/hub.css"),
    "utf8"
  );
  const rule = css.match(/\.study-progress-past-plans-list\s*\{[\s\S]*?\}/)?.[0] ?? "";
  assert.match(rule, /max-height:\s*clamp\(/);
  assert.match(rule, /overflow-y:\s*auto/);
  assert.match(rule, /-webkit-overflow-scrolling:\s*touch/);
});
