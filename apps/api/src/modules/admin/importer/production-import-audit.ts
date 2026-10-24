import type { PoolClient, QueryResultRow } from "pg";

const targetCounts = {
  created: 31,
  failed: 0,
  replaced: 2,
  skipped: 0
} as const;

type AuditQueryClient = Pick<PoolClient, "query">;

type ImportJobRow = QueryResultRow & {
  id: string;
  status: string;
  import_type: "general" | "aqsam";
  bank_id: string | null;
  excel_filename: string;
  media_filename: string;
  total_questions: number | string;
  success_count: number | string;
  failure_count: number | string;
  new_count: number | string;
  duplicate_count: number | string;
  created_count: number | string;
  replaced_count: number | string;
  skipped_count: number | string;
  processed_count: number | string;
  error_count: number | string;
  completed_at: string | null;
};

type CountRow = QueryResultRow & { count: number | string };
type OutcomeRow = QueryResultRow & { outcome: string; count: number | string };

export type ProductionImportAuditOptions = {
  jobId?: string;
};

export type ProductionImportAuditReport = {
  mode: "dry-run-read-only";
  targetCounts: typeof targetCounts;
  selection: {
    status: "selected" | "ambiguous" | "not-found";
    reason: "exact-count-match" | "explicit-job-id" | "multiple-exact-matches" | "no-exact-match";
    selectedJobId: string | null;
    candidates: Array<Record<string, unknown>>;
  };
  transaction: {
    isolation: "repeatable read";
    readOnly: true;
    rolledBack: boolean;
  };
  reconciliation?: Record<string, unknown>;
};

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

const toSafeJob = (job: ImportJobRow) => ({
  id: job.id,
  status: job.status,
  importType: job.import_type,
  bankId: job.bank_id,
  excelFilename: job.excel_filename,
  mediaFilename: job.media_filename,
  totalQuestions: toNumber(job.total_questions),
  successCount: toNumber(job.success_count),
  failureCount: toNumber(job.failure_count),
  newCount: toNumber(job.new_count),
  duplicateCount: toNumber(job.duplicate_count),
  createdCount: toNumber(job.created_count),
  replacedCount: toNumber(job.replaced_count),
  skippedCount: toNumber(job.skipped_count),
  processedCount: toNumber(job.processed_count),
  errorCount: toNumber(job.error_count),
  completedAt: job.completed_at
});

const jobColumns = `
  id, status, import_type, bank_id, excel_filename, media_filename,
  total_questions, success_count, failure_count, new_count, duplicate_count,
  created_count, replaced_count, skipped_count, processed_count, error_count,
  completed_at
`;

const findCandidateJobs = async (client: AuditQueryClient) => {
  const exact = await client.query<ImportJobRow>(`
    SELECT ${jobColumns}
    FROM import_jobs
    WHERE status = 'completed'
      AND created_count = $1
      AND replaced_count = $2
      AND skipped_count = $3
      AND failure_count = $4
      AND error_count = 0
    ORDER BY completed_at DESC NULLS LAST, created_at DESC
  `, [targetCounts.created, targetCounts.replaced, targetCounts.skipped, targetCounts.failed]);

  if (exact.rows.length > 0) return exact.rows;

  const recent = await client.query<ImportJobRow>(`
    SELECT ${jobColumns}
    FROM import_jobs
    WHERE status = 'completed'
    ORDER BY completed_at DESC NULLS LAST, created_at DESC
    LIMIT 20
  `);
  return recent.rows;
};

const selectJob = async (
  client: AuditQueryClient,
  candidates: ImportJobRow[],
  explicitJobId?: string
) => {
  if (explicitJobId) {
    const result = await client.query<ImportJobRow>(`
      SELECT ${jobColumns}
      FROM import_jobs
      WHERE id = $1 AND status = 'completed'
    `, [explicitJobId]);
    return result.rows[0] ?? null;
  }

  const exact = candidates.filter((job) =>
    toNumber(job.created_count) === targetCounts.created &&
    toNumber(job.replaced_count) === targetCounts.replaced &&
    toNumber(job.skipped_count) === targetCounts.skipped &&
    toNumber(job.failure_count) === targetCounts.failed &&
    toNumber(job.error_count) === 0
  );
  return exact.length === 1 ? exact[0] : null;
};

const fetchCount = async (
  client: AuditQueryClient,
  sql: string,
  jobId: string
) => toNumber((await client.query<CountRow>(sql, [jobId])).rows[0]?.count);

const reconcileJob = async (client: AuditQueryClient, job: ImportJobRow) => {
  const jobId = job.id;
  const [itemCount, linkedQuestionCount, outcomeRows, bankRows] = await Promise.all([
    fetchCount(client, "SELECT COUNT(*) AS count FROM import_job_items WHERE import_job_id = $1", jobId),
    fetchCount(client, "SELECT COUNT(*) AS count FROM questions WHERE import_job_id = $1", jobId),
    client.query<OutcomeRow>(`
      SELECT outcome, COUNT(*) AS count
      FROM import_job_items
      WHERE import_job_id = $1
      GROUP BY outcome
      ORDER BY outcome
    `, [jobId]),
    client.query(`
      SELECT id, bank_type, bank_key, name, subject_id
      FROM question_banks
      WHERE id = $1
    `, [job.bank_id])
  ]);

  const [missingQuestionRows, wrongJobLinkRows, questionWithoutItemRows] = await Promise.all([
    client.query(`
      SELECT i.question_number, i.question_id, i.outcome
      FROM import_job_items i
      LEFT JOIN questions q ON q.id = i.question_id
      WHERE i.import_job_id = $1
        AND i.outcome IN ('created', 'replaced')
        AND q.id IS NULL
      ORDER BY i.question_number
    `, [jobId]),
    client.query(`
      SELECT i.question_number, i.question_id, i.outcome, q.import_job_id AS current_import_job_id
      FROM import_job_items i
      JOIN questions q ON q.id = i.question_id
      WHERE i.import_job_id = $1
        AND i.outcome IN ('created', 'replaced')
        AND q.import_job_id IS DISTINCT FROM i.import_job_id
      ORDER BY i.question_number
    `, [jobId]),
    client.query(`
      SELECT q.id
      FROM questions q
      LEFT JOIN import_job_items i
        ON i.import_job_id = q.import_job_id AND i.question_id = q.id
      WHERE q.import_job_id = $1 AND i.question_id IS NULL
      ORDER BY q.id
    `, [jobId])
  ]);

  const [duplicateItemKeys, duplicateQuestionLinks, mismatchRows] = await Promise.all([
    client.query(`
      SELECT import_job_id, question_number, COUNT(*) AS count
      FROM import_job_items
      WHERE import_job_id = $1
      GROUP BY import_job_id, question_number
      HAVING COUNT(*) > 1
      ORDER BY question_number
    `, [jobId]),
    client.query(`
      SELECT question_id, COUNT(*) AS count,
        ARRAY_AGG(question_number ORDER BY question_number) AS question_numbers
      FROM import_job_items
      WHERE import_job_id = $1
      GROUP BY question_id
      HAVING COUNT(*) > 1
      ORDER BY question_id
    `, [jobId]),
    client.query(`
      SELECT
        i.question_number,
        i.question_id,
        ARRAY_REMOVE(ARRAY[
          CASE WHEN q.correct_answer IS DISTINCT FROM i.correct_answer THEN 'correct_answer' END,
          CASE WHEN q.subject IS DISTINCT FROM i.subject THEN 'subject' END,
          CASE WHEN q.topic IS DISTINCT FROM i.topic THEN 'topic' END,
          CASE WHEN q.topic_id IS DISTINCT FROM i.topic_id THEN 'topic_id' END,
          CASE WHEN q.subtopic IS DISTINCT FROM i.subtopic THEN 'subtopic' END,
          CASE WHEN q.subtopic_id IS DISTINCT FROM i.subtopic_id THEN 'subtopic_id' END,
          CASE WHEN q.import_metadata_json IS DISTINCT FROM i.metadata_json THEN 'import_metadata' END,
          CASE WHEN q.question_scope IS DISTINCT FROM j.import_type THEN 'question_scope' END,
          CASE WHEN q.bank_id IS DISTINCT FROM j.bank_id THEN 'bank_id' END,
          CASE WHEN j.import_type = 'aqsam' AND q.bank_question_number IS DISTINCT FROM i.question_number
            THEN 'bank_question_number' END
        ], NULL) AS mismatch_fields
      FROM import_job_items i
      JOIN import_jobs j ON j.id = i.import_job_id
      JOIN questions q ON q.id = i.question_id
      WHERE i.import_job_id = $1
        AND i.outcome IN ('created', 'replaced')
        AND (
          q.correct_answer IS DISTINCT FROM i.correct_answer OR
          q.subject IS DISTINCT FROM i.subject OR
          q.topic IS DISTINCT FROM i.topic OR
          q.topic_id IS DISTINCT FROM i.topic_id OR
          q.subtopic IS DISTINCT FROM i.subtopic OR
          q.subtopic_id IS DISTINCT FROM i.subtopic_id OR
          q.import_metadata_json IS DISTINCT FROM i.metadata_json OR
          q.question_scope IS DISTINCT FROM j.import_type OR
          q.bank_id IS DISTINCT FROM j.bank_id OR
          (j.import_type = 'aqsam' AND q.bank_question_number IS DISTINCT FROM i.question_number)
        )
      ORDER BY i.question_number
    `, [jobId])
  ]);

  const source25 = await client.query(`
    SELECT
      i.question_number AS source_question_number,
      i.question_id,
      i.sheet_name,
      i.excel_row_number,
      i.question_text,
      i.correct_answer AS item_correct_answer,
      i.subject AS item_section,
      i.topic AS item_topic,
      i.topic_id AS item_topic_id,
      i.subtopic AS item_subtopic,
      i.subtopic_id AS item_subtopic_id,
      i.outcome,
      i.metadata_json,
      q.correct_answer AS stored_correct_answer,
      q.subject AS stored_section,
      q.topic AS stored_topic,
      q.topic_id AS stored_topic_id,
      q.subtopic AS stored_subtopic,
      q.subtopic_id AS stored_subtopic_id,
      q.question_scope,
      q.bank_id,
      q.bank_question_number,
      b.name AS bank_name,
      b.bank_key
    FROM import_job_items i
    LEFT JOIN questions q ON q.id = i.question_id
    LEFT JOIN question_banks b ON b.id = q.bank_id
    WHERE i.import_job_id = $1 AND i.question_number = 25
    ORDER BY i.question_id
  `, [jobId]);

  const retrieval = await client.query(`
    SELECT
      q.id,
      q.bank_question_number,
      i.question_number AS imported_question_number,
      q.question_scope,
      q.bank_id,
      COALESCE(q.bank_question_number, i.question_number) AS authoritative_question_number
    FROM questions q
    LEFT JOIN import_job_items i
      ON i.import_job_id = q.import_job_id AND i.question_id = q.id
    WHERE q.question_scope = $1
      AND ($2::text IS NULL OR q.bank_id = $2)
      AND (
        q.bank_question_number = 25 OR
        i.question_number = 25 OR
        q.id = 'Q-025'
      )
    ORDER BY
      CASE WHEN COALESCE(q.bank_question_number, i.question_number) IS NULL THEN 1 ELSE 0 END,
      COALESCE(q.bank_question_number, i.question_number),
      q.id
    LIMIT 50 OFFSET 0
  `, [job.import_type, job.bank_id]);

  const sameSourceAcrossCompletedImports = await client.query(`
    SELECT
      j.id AS import_job_id,
      j.import_type,
      j.bank_id,
      i.question_id,
      i.question_number,
      q.question_scope,
      q.bank_question_number
    FROM import_job_items i
    JOIN import_jobs j ON j.id = i.import_job_id
    LEFT JOIN questions q ON q.id = i.question_id
    WHERE j.status = 'completed' AND i.question_number = 25
    ORDER BY j.import_type, j.bank_id NULLS FIRST, j.id
  `);

  const targetQuestionIds = new Set(source25.rows.map((row) => String(row.question_id)));
  const retrievedIds = new Set(retrieval.rows.map((row) => String(row.id)));
  const outcomeCounts = Object.fromEntries(
    outcomeRows.rows.map((row) => [row.outcome, toNumber(row.count)])
  );
  const expectedImportItems = toNumber(job.total_questions);
  const expectedPersistedQuestions = toNumber(job.created_count) + toNumber(job.replaced_count);
  const integrityIssueQuestionIds = new Set([
    ...missingQuestionRows.rows,
    ...wrongJobLinkRows.rows,
    ...mismatchRows.rows
  ].map((row) => String(row.question_id)));

  return {
    job: toSafeJob(job),
    bank: bankRows.rows[0] ?? null,
    counts: {
      expected: {
        importItems: expectedImportItems,
        linkedQuestions: expectedPersistedQuestions,
        outcomes: {
          created: toNumber(job.created_count),
          failed: toNumber(job.failure_count),
          replaced: toNumber(job.replaced_count),
          skipped: toNumber(job.skipped_count)
        }
      },
      actual: {
        importItems: itemCount,
        linkedQuestions: linkedQuestionCount,
        outcomes: outcomeCounts
      },
      matches: {
        importItems: itemCount === expectedImportItems,
        linkedQuestions: linkedQuestionCount === expectedPersistedQuestions,
        outcomes:
          toNumber(outcomeCounts.created) === toNumber(job.created_count) &&
          toNumber(outcomeCounts.replaced) === toNumber(job.replaced_count) &&
          toNumber(outcomeCounts.skipped) === toNumber(job.skipped_count) &&
          toNumber(outcomeCounts.failed) === toNumber(job.failure_count)
      },
      verifiedImportedQuestions: Math.max(0, expectedPersistedQuestions - integrityIssueQuestionIds.size)
    },
    integrity: {
      missingQuestions: missingQuestionRows.rows,
      questionsLinkedToAnotherImport: wrongJobLinkRows.rows,
      linkedQuestionsWithoutItems: questionWithoutItemRows.rows,
      duplicateItemKeys: duplicateItemKeys.rows,
      duplicateQuestionLinks: duplicateQuestionLinks.rows,
      fieldMismatches: mismatchRows.rows
    },
    sourceQuestion25: source25.rows,
    retrievalVerification: {
      rows: retrieval.rows,
      foundAllTargetQuestion25Rows: [...targetQuestionIds].every((id) => retrievedIds.has(id)),
      usedAuthoritativeSourceNumber: retrieval.rows.some((row) =>
        toNumber(row.imported_question_number) === 25 ||
        toNumber(row.bank_question_number) === 25
      )
    },
    sourceNumber25AcrossCompletedImports: sameSourceAcrossCompletedImports.rows
  };
};

export const runProductionImportAudit = async (
  client: AuditQueryClient,
  options: ProductionImportAuditOptions = {}
): Promise<ProductionImportAuditReport> => {
  const candidates = await findCandidateJobs(client);
  const selected = await selectJob(client, candidates, options.jobId);
  const exactCandidates = candidates.filter((job) =>
    toNumber(job.created_count) === targetCounts.created &&
    toNumber(job.replaced_count) === targetCounts.replaced &&
    toNumber(job.skipped_count) === targetCounts.skipped &&
    toNumber(job.failure_count) === targetCounts.failed &&
    toNumber(job.error_count) === 0
  );

  const report: ProductionImportAuditReport = {
    mode: "dry-run-read-only",
    targetCounts,
    selection: {
      status: selected
        ? "selected"
        : exactCandidates.length > 1
          ? "ambiguous"
          : "not-found",
      reason: options.jobId
        ? "explicit-job-id"
        : exactCandidates.length === 1
          ? "exact-count-match"
          : exactCandidates.length > 1
            ? "multiple-exact-matches"
            : "no-exact-match",
      selectedJobId: selected?.id ?? null,
      candidates: candidates.map(toSafeJob)
    },
    transaction: {
      isolation: "repeatable read",
      readOnly: true,
      rolledBack: false
    }
  };

  if (selected) {
    report.reconciliation = await reconcileJob(client, selected);
  }

  return report;
};

