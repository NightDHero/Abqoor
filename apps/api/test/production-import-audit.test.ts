import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runProductionImportAudit } from "../src/modules/admin/importer/production-import-audit.js";

const job = {
  id: "job-target",
  status: "completed",
  import_type: "general" as const,
  bank_id: null,
  excel_filename: "questions.xlsx",
  media_filename: "questions.pdf",
  total_questions: 33,
  success_count: 33,
  failure_count: 0,
  new_count: 31,
  duplicate_count: 2,
  created_count: 31,
  replaced_count: 2,
  skipped_count: 0,
  processed_count: 33,
  error_count: 0,
  completed_at: "2026-10-20T10:00:00.000Z"
};

const normalized = (sql: string) => sql.replace(/\s+/g, " ").trim();

const createFakeClient = (candidateRows = [job]) => {
  const statements: string[] = [];
  const query = async (sql: string) => {
    const text = normalized(sql);
    statements.push(text);

    if (text.includes("FROM import_jobs") && text.includes("created_count = $1")) {
      return { rows: candidateRows };
    }
    if (text.includes("FROM import_jobs") && text.includes("WHERE id = $1")) {
      return { rows: candidateRows.filter((candidate) => candidate.id === job.id) };
    }
    if (text === "SELECT COUNT(*) AS count FROM import_job_items WHERE import_job_id = $1") {
      return { rows: [{ count: 33 }] };
    }
    if (text === "SELECT COUNT(*) AS count FROM questions WHERE import_job_id = $1") {
      return { rows: [{ count: 33 }] };
    }
    if (text.includes("SELECT outcome, COUNT(*) AS count")) {
      return { rows: [{ outcome: "created", count: 31 }, { outcome: "replaced", count: 2 }] };
    }
    if (text.includes("FROM question_banks")) return { rows: [] };
    if (text.includes("q.import_job_id AS current_import_job_id")) return { rows: [] };
    if (text.includes("LEFT JOIN import_job_items i") && text.includes("i.question_id IS NULL")) {
      return { rows: [] };
    }
    if (text.includes("LEFT JOIN questions q") && text.includes("q.id IS NULL")) {
      return { rows: [] };
    }
    if (text.includes("GROUP BY import_job_id, question_number")) return { rows: [] };
    if (text.includes("ARRAY_AGG(question_number")) return { rows: [] };
    if (text.includes("ARRAY_REMOVE(ARRAY[")) return { rows: [] };
    if (text.includes("i.question_text") && text.includes("i.question_number = 25")) {
      return {
        rows: [{
          source_question_number: 25,
          question_id: "source-question-alpha",
          question_text: "سؤال ٢٥",
          item_correct_answer: "B",
          item_section: "quantitative",
          item_topic: "الحساب",
          item_subtopic: "العمليات الأساسية",
          stored_correct_answer: "B",
          stored_section: "quantitative",
          stored_topic: "الحساب",
          stored_subtopic: "العمليات الأساسية"
        }]
      };
    }
    if (text.includes("authoritative_question_number")) {
      return {
        rows: [{
          id: "source-question-alpha",
          bank_question_number: null,
          imported_question_number: 25,
          authoritative_question_number: 25
        }]
      };
    }
    if (text.includes("sourceNumber25AcrossCompletedImports") || text.includes("j.status = 'completed' AND i.question_number = 25")) {
      return { rows: [] };
    }

    throw new Error(`Unexpected audit query: ${text}`);
  };

  return { client: { query } as never, statements };
};

test("reconciles the uniquely matching import using read-only SELECT queries", async () => {
  const { client, statements } = createFakeClient();
  const report = await runProductionImportAudit(client);

  assert.equal(report.selection.status, "selected");
  assert.equal(report.selection.selectedJobId, "job-target");
  assert.deepEqual(report.reconciliation?.counts, {
    expected: {
      importItems: 33,
      linkedQuestions: 33,
      outcomes: { created: 31, failed: 0, replaced: 2, skipped: 0 }
    },
    actual: {
      importItems: 33,
      linkedQuestions: 33,
      outcomes: { created: 31, replaced: 2 }
    },
    matches: { importItems: true, linkedQuestions: true, outcomes: true },
    verifiedImportedQuestions: 33
  });
  assert.equal(
    (report.reconciliation?.retrievalVerification as { foundAllTargetQuestion25Rows: boolean })
      .foundAllTargetQuestion25Rows,
    true
  );
  assert.ok(statements.every((statement) => statement.startsWith("SELECT")));
  assert.ok(!statements.some((statement) => /\b(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE)\b/i.test(statement)));
});

test("reports ambiguous matching jobs without reconciling either candidate", async () => {
  const second = { ...job, id: "job-target-2" };
  const { client, statements } = createFakeClient([job, second]);
  const report = await runProductionImportAudit(client);

  assert.equal(report.selection.status, "ambiguous");
  assert.equal(report.selection.selectedJobId, null);
  assert.equal(report.selection.candidates.length, 2);
  assert.equal(report.reconciliation, undefined);
  assert.equal(statements.length, 1);
});

test("CLI enforces a read-only transaction, local timeouts, and rollback", async () => {
  const source = await readFile(
    new URL("../scripts/audit-production-import.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /--dry-run/);
  assert.match(source, /BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY/);
  assert.match(source, /current_setting\('transaction_read_only'\)/);
  assert.match(source, /SET LOCAL statement_timeout/);
  assert.match(source, /SET LOCAL lock_timeout/);
  assert.match(source, /ROLLBACK/);
  assert.doesNotMatch(source, /database\/client/);
});

