import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { strToU8, zipSync } from "fflate";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-admin-import-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "admin@example.com";
process.env.JWT_SECRET = "admin-import-test-secret";
process.env.NODE_ENV = "test";

const excelAdapter = await import(
  "../src/modules/admin/importer/adapters/excel.adapter.js"
);
const imageAdapter = await import(
  "../src/modules/admin/importer/adapters/image.adapter.js"
);
const pdfAdapter = await import(
  "../src/modules/admin/importer/adapters/pdf.adapter.js"
);
const importRepository = await import(
  "../src/modules/admin/importer/import-job.repository.js"
);
const importService = await import(
  "../src/modules/admin/importer/admin-import.service.js"
);
const mediaService = await import("../src/modules/media/media.service.js");
const questionRepository = await import(
  "../src/modules/questions/question.repository.js"
);
const questionService = await import(
  "../src/modules/questions/question.service.js"
);
const { createApp } = await import("../src/app.js");
const { db } = await import("../src/database/client.js");

const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00
]);
const replacementPng = Buffer.concat([png, Buffer.from([0x01])]);

const standardHeader = [
  "رقم السؤال",
  "السؤال",
  "أ",
  "ب",
  "ج",
  "د",
  "الاجابة"
];
const sentenceHeader = [
  "رقم السؤال",
  "السؤال",
  "الإجابة نص",
  "أ",
  "ب",
  "ج",
  "د",
  "الاجابة"
];

const validSheets = () => [
  {
    sheet: "بنك التناظر عام",
    data: [standardHeader, [500, "سؤال 500", "أ1", "ب1", "ج1", "د1", "أ"]]
  },
  {
    sheet: "اكمال الجمل عام",
    data: [sentenceHeader, [501, "سؤال 501", "نص مساعد", "أ2", "ب2", "ج2", "د2", "ب"]]
  },
  {
    sheet: "الخطأ السياقي عام",
    data: [standardHeader, [502, "سؤال 502", "أ3", "ب3", "ج3", "د3", "C"]]
  },
  {
    sheet: "المفردة الشاذة عام",
    data: [standardHeader, [503, "سؤال 503", "أ4", "ب4", "ج4", "د4", "د"]]
  },
  { sheet: "استعياب المقروء عام", data: [] }
];

const escapeXml = (value: unknown) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const columnName = (index: number) => {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
};

const sheetXml = (rows: unknown[][]) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>` +
  rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">` +
        row
          .map((value, columnIndex) => {
            const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
            return typeof value === "number"
              ? `<c r="${reference}"><v>${value}</v></c>`
              : `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
          })
          .join("") +
        `</row>`
    )
    .join("") +
  `</sheetData></worksheet>`;

const createWorkbookBuffer = () => {
  const sheets = validSheets();
  const contentTypes = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`,
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
    ...sheets.map(
      (_sheet, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    ),
    `</Types>`
  ].join("");
  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
    sheets
      .map(
        (sheet, index) =>
          `<sheet name="${escapeXml(sheet.sheet)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
      )
      .join("") +
    `</sheets></workbook>`;
  const workbookRelationships =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheets
      .map(
        (_sheet, index) =>
          `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
      )
      .join("") +
    `</Relationships>`;
  const rootRelationships =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rootRelationships),
    "xl/workbook.xml": strToU8(workbook),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRelationships)
  };
  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(sheetXml(sheet.data));
  });
  return Buffer.from(zipSync(files));
};

const makeItem = (
  jobId: string,
  questionNumber: number,
  options: { duplicate?: boolean } = {}
) => {
  const now = new Date().toISOString();
  return {
    importJobId: jobId,
    questionNumber,
    questionId: `Q-${String(questionNumber).padStart(3, "0")}`,
    sheetName: "بنك التناظر عام",
    excelRowNumber: 2,
    questionText: `سؤال ${questionNumber}`,
    options: ["أ", "ب", "ج", "د"] as [string, string, string, string],
    correctAnswer: "A" as const,
    subject: "verbal" as const,
    topic: "التناظر اللفظي",
    topicId: "verbal-analogy",
    difficulty: 1,
    pageNumber: 1,
    sourceImageName: "page-1.png",
    imageStatus: "matched" as const,
    validationStatus: "valid" as const,
    errors: [],
    isDuplicate: options.duplicate ?? false,
    duplicateAction: null,
    outcome: "pending" as const,
    previousQuestion: null,
    appliedQuestion: null,
    previousImageExisted: false,
    createdAt: now,
    updatedAt: now
  };
};

const createReadyJob = (
  questionNumbers: number[],
  duplicateQuestionNumbers = new Set<number>()
) => {
  const job = importRepository.createImportJob({
    createdBy: "admin@example.com",
    excelFilename: "questions.xlsx",
    mediaFilename: "questions.pdf",
    sourceType: "pdf",
    startQuestionNumber: questionNumbers[0] ?? null,
    status: "ready"
  });
  importRepository.insertImportItems(
    questionNumbers.map((number) =>
      makeItem(job.id, number, {
        duplicate: duplicateQuestionNumbers.has(number)
      })
    )
  );
  return job;
};

const seedExistingQuestion = (questionNumber: number) => {
  const questionId = `Q-${questionNumber}`;
  questionService.saveQuestion({
    id: questionId,
    questionImageUrl: mediaService.getQuestionImageUrl(questionId),
    correctAnswer: "D",
    subject: "verbal",
    subjectId: "arabic",
    topic: "قديم",
    topicId: "legacy",
    difficulty: 3,
    difficultyScore: 3,
    source: "manual",
    version: 4,
    importJobId: null
  });
  mediaService.writeQuestionImage(questionId, png, { overwriteExisting: true });
};

const waitForTerminalJob = async (jobId: string) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const detail = importService.getImportJobDetail(jobId);
    if (["completed", "failed"].includes(detail.job.status)) {
      return detail;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Import job did not reach a terminal state.");
};

test("validates the exact workbook contract and sentence-completion columns", () => {
  const analysis = excelAdapter.analyzeWorkbookSheets(validSheets());

  assert.equal(analysis.issues.length, 0);
  assert.equal(analysis.questions.length, 4);
  assert.deepEqual(
    analysis.questions.map((question) => question.questionNumber),
    [500, 501, 502, 503]
  );
  assert.equal(analysis.questions[1]?.options[0], "أ2");
  assert.equal(analysis.questions[1]?.correctAnswer, "B");
  assert.equal(analysis.sheetSummary[4]?.questionCount, 0);
});

test("parses an actual five-sheet XLSX binary", async () => {
  const analysis = await excelAdapter.readAdminWorkbook(createWorkbookBuffer());

  assert.equal(analysis.issues.length, 0);
  assert.equal(analysis.questions.length, 4);
  assert.equal(analysis.questions[1]?.correctAnswer, "B");
});

test("rejects invalid answers, duplicate numbers, and populated reading rows", () => {
  const sheets = validSheets();
  sheets[0]?.data.push([503, "مكرر", "أ", "ب", "ج", "د", "X"]);
  sheets[4]?.data.push([], [504, "غير مدعوم"]);
  const analysis = excelAdapter.analyzeWorkbookSheets(sheets);
  const codes = new Set(analysis.issues.map((issue) => issue.code));

  assert.ok(codes.has("duplicate_workbook_question"));
  assert.ok(codes.has("unsupported_reading_rows"));
});

test("maps PDF pages deterministically from a starting question number", () => {
  const pages = pdfAdapter.selectPdfPages(201, 500);

  assert.equal(pages.length, 201);
  assert.deepEqual(pages[0], { pageIndex: 1, questionNumber: 500 });
  assert.deepEqual(pages.at(-1), { pageIndex: 201, questionNumber: 700 });
});

test("accepts only deterministic PNG question filenames", () => {
  const result = imageAdapter.matchUploadedImages([
    { buffer: png, originalname: "500.png", mimetype: "image/png", size: png.length },
    { buffer: png, originalname: "Q-501.png", mimetype: "image/png", size: png.length },
    { buffer: png, originalname: "question.png", mimetype: "image/png", size: png.length }
  ]);

  assert.deepEqual([...result.byQuestionNumber.keys()], [500, 501]);
  assert.equal(result.issues[0]?.code, "ambiguous_image_filename");
});

test("requires duplicate decisions and supports apply-all", () => {
  const items = [
    makeItem("job", 800001, { duplicate: true }),
    makeItem("job", 800002, { duplicate: true })
  ];

  assert.throws(
    () => importService.planDuplicateActions(items, {}),
    /800001/
  );
  const decisions = importService.planDuplicateActions(items, {
    applyToAllDuplicates: true,
    defaultDuplicateAction: "replace"
  });
  assert.equal(decisions.get(800001), "replace");
  assert.equal(decisions.get(800002), "replace");
});

test("builds preview errors for missing and extra individual images", async () => {
  const detail = await importService.analyzeQuestionImport({
    createdBy: "admin@example.com",
    excel: {
      buffer: createWorkbookBuffer(),
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      originalname: "questions.xlsx"
    },
    images: [
      { buffer: png, mimetype: "image/png", originalname: "500.png" },
      { buffer: png, mimetype: "image/png", originalname: "999.png" }
    ]
  });
  const codes = new Set(detail.job.issues.map((issue) => issue.code));

  assert.equal(detail.job.totalQuestions, 4);
  assert.equal(detail.job.mediaSummary.matched, 1);
  assert.equal(detail.job.mediaSummary.missing, 3);
  assert.equal(detail.job.mediaSummary.extra, 1);
  assert.ok(codes.has("missing_image"));
  assert.ok(codes.has("extra_media"));
  importService.cancelQuestionImport(detail.job.id);
});

test("rejects malformed Excel and PDF files before creating an import", async () => {
  await assert.rejects(
    importService.analyzeQuestionImport({
      createdBy: "admin@example.com",
      excel: {
        buffer: Buffer.from("not a workbook"),
        mimetype: "application/octet-stream",
        originalname: "questions.xlsx"
      },
      images: [{ buffer: png, mimetype: "image/png", originalname: "500.png" }]
    }),
    /Excel/
  );
  await assert.rejects(
    importService.analyzeQuestionImport({
      createdBy: "admin@example.com",
      excel: {
        buffer: createWorkbookBuffer(),
        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        originalname: "questions.xlsx"
      },
      pdf: {
        buffer: Buffer.from("not a PDF"),
        mimetype: "application/pdf",
        originalname: "questions.pdf"
      },
      startQuestionNumber: 500
    }),
    /PDF/
  );
});

test("commits a valid import and rolls it back without leaving a question", async () => {
  const questionNumber = 800101;
  const questionId = `Q-${questionNumber}`;
  const job = createReadyJob([questionNumber]);
  mediaService.stageQuestionImage(job.id, questionId, png);

  importService.confirmQuestionImport(job.id, {});
  const completed = await waitForTerminalJob(job.id);
  assert.equal(completed.job.status, "completed");
  assert.equal(completed.job.createdCount, 1);
  assert.equal(questionRepository.findQuestionById(questionId)?.import_job_id, job.id);

  const rolledBack = importService.rollbackQuestionImport(job.id);
  assert.equal(rolledBack.job.status, "rolled_back");
  assert.equal(questionRepository.findQuestionById(questionId), null);
  assert.equal(mediaService.questionImageExists(questionId), false);
  mediaService.removeImportMedia(job.id);
});

test("restores a replaced question and image during rollback", async () => {
  const questionNumber = 800102;
  const questionId = `Q-${questionNumber}`;
  questionService.saveQuestion({
    id: questionId,
    questionImageUrl: mediaService.getQuestionImageUrl(questionId),
    correctAnswer: "D",
    subject: "verbal",
    subjectId: "arabic",
    topic: "قديم",
    topicId: "legacy",
    difficulty: 3,
    difficultyScore: 3,
    source: "manual",
    version: 4,
    importJobId: null
  });
  mediaService.writeQuestionImage(questionId, png, { overwriteExisting: true });

  const job = createReadyJob([questionNumber], new Set([questionNumber]));
  mediaService.stageQuestionImage(job.id, questionId, replacementPng);
  importService.confirmQuestionImport(job.id, {
    duplicateDecisions: [{ action: "replace", questionNumber }]
  });
  const completed = await waitForTerminalJob(job.id);
  assert.equal(completed.job.replacedCount, 1);
  assert.equal(questionRepository.findQuestionById(questionId)?.correct_answer, "A");

  importService.rollbackQuestionImport(job.id);
  const restored = questionRepository.findQuestionById(questionId);
  assert.equal(restored?.correct_answer, "D");
  assert.equal(restored?.topic, "قديم");
  assert.equal(restored?.version, 4);
  assert.equal(restored?.import_job_id, null);
  assert.deepEqual(readFileSync(mediaService.getQuestionImagePath(questionId)), png);

  questionRepository.deleteQuestion(questionId);
  mediaService.removeQuestionImage(questionId);
  mediaService.removeImportMedia(job.id);
});

test("handles replace, skip, and stop for the exact 500 through 700 batch", async () => {
  const questionNumbers = Array.from({ length: 201 }, (_, index) => 500 + index);
  const duplicateNumber = 502;
  const scenarios = [
    { action: "replace" as const, created: 200, replaced: 1, skipped: 0, hasLast: true },
    { action: "skip" as const, created: 200, replaced: 0, skipped: 1, hasLast: true },
    { action: "stop" as const, created: 2, replaced: 0, skipped: 199, hasLast: false }
  ];

  for (const scenario of scenarios) {
    seedExistingQuestion(duplicateNumber);
    const job = createReadyJob(
      questionNumbers,
      new Set([duplicateNumber])
    );
    for (const questionNumber of questionNumbers) {
      mediaService.stageQuestionImage(job.id, `Q-${questionNumber}`, replacementPng);
    }

    importService.confirmQuestionImport(job.id, {
      duplicateDecisions: [
        { action: scenario.action, questionNumber: duplicateNumber }
      ]
    });
    const completed = await waitForTerminalJob(job.id);
    assert.equal(completed.job.status, "completed");
    assert.equal(completed.job.createdCount, scenario.created);
    assert.equal(completed.job.replacedCount, scenario.replaced);
    assert.equal(completed.job.skippedCount, scenario.skipped);
    assert.equal(
      Boolean(questionRepository.findQuestionById("Q-700")),
      scenario.hasLast
    );

    const historyEntry = importService
      .getImportHistory()
      .jobs.find((candidate) => candidate.id === job.id);
    assert.equal(historyEntry?.status, "completed");

    importService.rollbackQuestionImport(job.id);
    assert.equal(questionRepository.findQuestionById("Q-500"), null);
    assert.equal(questionRepository.findQuestionById("Q-700"), null);
    assert.equal(
      questionRepository.findQuestionById("Q-502")?.correct_answer,
      "D"
    );
    assert.equal(
      importService.getImportJobDetail(job.id).job.status,
      "rolled_back"
    );

    questionRepository.deleteQuestion("Q-502");
    mediaService.removeQuestionImage("Q-502");
    mediaService.removeImportMedia(job.id);
  }
});

test("rolls back database and file changes when a commit fails", async () => {
  const first = 800103;
  const second = 800104;
  const job = createReadyJob([first, second]);
  mediaService.stageQuestionImage(job.id, `Q-${first}`, png);

  importService.confirmQuestionImport(job.id, {});
  const failed = await waitForTerminalJob(job.id);
  assert.equal(failed.job.status, "failed");
  assert.equal(questionRepository.findQuestionById(`Q-${first}`), null);
  assert.equal(questionRepository.findQuestionById(`Q-${second}`), null);
  assert.equal(mediaService.questionImageExists(`Q-${first}`), false);
  mediaService.removeImportMedia(job.id);
});

test("allows configured admins and rejects ordinary authenticated users", async () => {
  const app = createApp();
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const register = async (email: string) => {
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "12345678" })
    });
    assert.equal(response.status, 201);
    return response.headers.get("set-cookie")?.split(";")[0] ?? "";
  };

  try {
    const adminCookie = await register("admin@example.com");
    const userCookie = await register("student@example.com");
    const adminResponse = await fetch(`${baseUrl}/admin/import/jobs`, {
      headers: { cookie: adminCookie }
    });
    const userResponse = await fetch(`${baseUrl}/admin/import/jobs`, {
      headers: { cookie: userCookie }
    });

    assert.equal(adminResponse.status, 200);
    assert.equal(userResponse.status, 403);

    const form = new FormData();
    form.append(
      "excel",
      new Blob([createWorkbookBuffer()], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }),
      "questions.xlsx"
    );
    for (const number of [500, 501, 502, 503]) {
      form.append("images", new Blob([png], { type: "image/png" }), `${number}.png`);
    }
    const analyzeResponse = await fetch(`${baseUrl}/admin/import/analyze`, {
      method: "POST",
      headers: { cookie: adminCookie },
      body: form
    });
    assert.equal(analyzeResponse.status, 200);
    const analyzed = (await analyzeResponse.json()) as {
      job: { errorCount: number; id: string; status: string; totalQuestions: number };
    };
    assert.equal(analyzed.job.status, "ready");
    assert.equal(analyzed.job.errorCount, 0);
    assert.equal(analyzed.job.totalQuestions, 4);

    const confirmResponse = await fetch(
      `${baseUrl}/admin/import/jobs/${analyzed.job.id}/confirm`,
      {
        method: "POST",
        headers: { cookie: adminCookie, "content-type": "application/json" },
        body: "{}"
      }
    );
    assert.equal(confirmResponse.status, 202);

    let completedStatus = "";
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const statusResponse = await fetch(
        `${baseUrl}/admin/import/jobs/${analyzed.job.id}`,
        { headers: { cookie: adminCookie } }
      );
      const detail = (await statusResponse.json()) as { job: { status: string } };
      completedStatus = detail.job.status;
      if (completedStatus === "completed") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(completedStatus, "completed");

    const rollbackResponse = await fetch(
      `${baseUrl}/admin/import/jobs/${analyzed.job.id}/rollback`,
      { method: "POST", headers: { cookie: adminCookie } }
    );
    assert.equal(rollbackResponse.status, 200);
    const rolledBack = (await rollbackResponse.json()) as {
      job: { status: string };
    };
    assert.equal(rolledBack.job.status, "rolled_back");
    assert.equal(questionRepository.findQuestionById("Q-500"), null);
    assert.equal(
      readdirSync(mediaService.questionImportUploadDirectory, {
        withFileTypes: true
      }).filter((entry) => entry.isFile()).length,
      0
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

after(() => {
  db.close();
  rmSync(testDirectory, { force: true, recursive: true });
});
