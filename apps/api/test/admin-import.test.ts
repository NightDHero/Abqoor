import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { strToU8, zipSync } from "fflate";
import { issueTestPhoneVerificationCode, issueTestRegistrationCode } from "./helpers/auth.js";

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
const { closeDatabase, db } = await import("../src/database/client.js");
const { importConfiguredAdminEmails } = await import(
  "../src/modules/admin/admin.service.js"
);

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADklEQVQImWP4DwUMMAYAj4IP8cvlVgcAAAAASUVORK5CYII=",
  "base64"
);
const replacementPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEElEQVQImWNgYGD4D8UQBgAd9AP9JAD7OgAAAABJRU5ErkJggg==",
  "base64"
);

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

const validQuantitativeSheets = () => [{
  sheet: "الورقة1",
  data: [
    ["رقم السؤال", "السؤال", "أ", "ب", "ج", "د", "الصورة", "الإجابة"],
    [1, "سؤال كمي", "1", "2", "3", "4", "", "ب"]
  ]
}];

const selectedVerbalSheets = (questionNumbers: number[]) => {
  const sheets = validSheets();
  sheets[0] = {
    sheet: "بنك التناظر عام",
    data: [
      standardHeader,
      ...questionNumbers.map((questionNumber) => [
        questionNumber,
        `سؤال ${questionNumber}`,
        "أ",
        "ب",
        "ج",
        "د",
        "أ"
      ])
    ]
  };
  return sheets;
};

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

const createWorkbookBuffer = (sheets = validSheets()) => {
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
    subtopic: null,
    subtopicId: null,
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

const createReadyJob = async (
  questionNumbers: number[],
  duplicateQuestionNumbers = new Set<number>()
) => {
  const job = await importRepository.createImportJob({
    createdBy: "admin@example.com",
    excelFilename: "questions.xlsx",
    mediaFilename: "questions.pdf",
    sourceType: "pdf",
    startQuestionNumber: questionNumbers[0] ?? null,
    status: "ready"
  });
  await importRepository.insertImportItems(
    questionNumbers.map((number) =>
      makeItem(job.id, number, {
        duplicate: duplicateQuestionNumbers.has(number)
      })
    )
  );
  return job;
};

const seedExistingQuestion = async (questionNumber: number) => {
  const questionId = `Q-${questionNumber}`;
  await questionService.saveQuestion({
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
    const detail = await importService.getImportJobDetail(jobId);
    if (["completed", "failed"].includes(detail.job.status)) {
      return detail;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Import job did not reach a terminal state.");
};

test("selects a verbal sheet by canonical name regardless of workbook order", () => {
  const analysis = excelAdapter.analyzeWorkbookSheets(
    [...validSheets()].reverse(),
    { from: 501, to: 501 }
  );

  assert.equal(analysis.issues.length, 0);
  assert.equal(analysis.questions.length, 1);
  assert.equal(analysis.questions[0]?.options[0], "أ2");
  assert.equal(analysis.questions[0]?.correctAnswer, "B");
});

test("parses only the selected named sheet and ignores unrelated extras", async () => {
  const sheets = [
    { sheet: "تعليمات", data: [["not", "an", "import", "sheet"]] },
    ...validSheets().reverse()
  ];
  const analysis = await excelAdapter.readAdminWorkbook(
    createWorkbookBuffer(sheets),
    { from: 500, to: 500 }
  );

  assert.equal(analysis.issues.length, 0);
  assert.equal(analysis.questions.length, 1);
  assert.equal(analysis.questions[0]?.correctAnswer, "A");
});

test("selects and validates only one requested Excel question", () => {
  const sheets = validSheets();
  sheets[0]?.data.push([900, "سؤال خارج النطاق", "", "", "", "", "X"]);
  const analysis = excelAdapter.analyzeWorkbookSheets(
    sheets,
    { from: 500, to: 500 }
  );

  assert.deepEqual(analysis.questions.map((question) => question.questionNumber), [500]);
  assert.equal(analysis.issues.length, 0);
});

test("validates selected Excel ranges and ignores invalid rows outside them", () => {
  const sheets = validSheets();
  sheets[0]?.data.push([504, "سؤال 504", "", "ب", "ج", "د", "أ"]);
  sheets[0]?.data.push([900, "سؤال خارج النطاق", "", "", "", "", "X"]);
  const analysis = excelAdapter.analyzeWorkbookSheets(
    sheets,
    { from: 500, to: 504 }
  );

  assert.equal(analysis.questions.length, 5);
  assert.ok(analysis.issues.some((item) => item.code === "missing_option" && item.questionNumber === 504));
  assert.ok(!analysis.issues.some((item) => item.questionNumber === 900));
});

test("uses the repository quantitative workbook contract", () => {
  const analysis = excelAdapter.analyzeWorkbookSheets(
    validQuantitativeSheets(),
    { from: 1, to: 1 }
  );

  assert.equal(analysis.issues.length, 0);
  assert.equal(analysis.questions[0]?.topic, "الحساب");
  assert.equal(analysis.questions[0]?.topicId, "arithmetic");
  assert.equal(analysis.questions[0]?.subtopic, null);
  assert.equal(analysis.questions[0]?.subtopicId, null);
  assert.equal(analysis.questions[0]?.correctAnswer, "B");
});

test("derives the quantitative topic from the workbook without a manual type", () => {
  const analysis = excelAdapter.analyzeWorkbookSheets(
    validQuantitativeSheets(),
    { from: 1, to: 1 }
  );

  assert.equal(analysis.questions.length, 1);
  assert.equal(analysis.questions[0]?.subject, "quantitative");
  assert.equal(analysis.questions[0]?.topicId, "arithmetic");
  assert.equal(analysis.questions[0]?.subtopicId, null);
});

test("creates a quantitative import without manual classification fields", async () => {
  const input = {
    createdBy: "admin@example.com",
    questionRange: { from: 1, to: 1 },
    excel: {
      buffer: createWorkbookBuffer(validQuantitativeSheets()),
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      originalname: "quantitative.xlsx"
    },
    images: [{ buffer: png, mimetype: "image/png", originalname: "1.png" }]
  };

  const detail = await importService.analyzeQuestionImport(input);
  assert.equal(detail.items[0]?.subject, "quantitative");
  assert.equal(detail.items[0]?.topicId, "arithmetic");
  await importService.cancelQuestionImport(detail.job.id);
});

test("classifies a quantitative import from workbook metadata", async () => {
  const detail = await importService.analyzeQuestionImport({
    createdBy: "admin@example.com",
    questionRange: { from: 1, to: 1 },
    excel: {
      buffer: createWorkbookBuffer(validQuantitativeSheets()),
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      originalname: "quantitative.xlsx"
    },
    images: [{ buffer: png, mimetype: "image/png", originalname: "1.png" }]
  });

  assert.equal(detail.items[0]?.subject, "quantitative");
  assert.equal(detail.items[0]?.topic, "الحساب");
  assert.equal(detail.items[0]?.topicId, "arithmetic");
  assert.equal(detail.items[0]?.subtopic, null);
  assert.equal(detail.items[0]?.subtopicId, null);
  assert.ok(!detail.job.sheetSummary.some((item) => item.sheetName === "الكمي"));
  await importService.confirmQuestionImport(detail.job.id, {});
  const completed = await waitForTerminalJob(detail.job.id);
  assert.equal(completed.job.status, "completed");
  const saved = await questionRepository.findQuestionById("Q-001");
  assert.equal(saved?.subject_id, "math");
  assert.equal(saved?.topic_id, "arithmetic");
  assert.equal(saved?.subtopic, null);
  assert.equal(saved?.subtopic_id, null);
  await importService.rollbackQuestionImport(detail.job.id);
});

test("question counts stay within the existing quantitative taxonomy", async () => {
  const validQuestionId = "Q-910001";
  const legacyInvalidQuestionId = "Q-910002";
  const unrelatedLegacyQuestionId = "Q-910003";
  const baseQuestion = {
    questionImageUrl: mediaService.getQuestionImageUrl(validQuestionId),
    correctAnswer: "A" as const,
    subject: "quantitative" as const,
    subjectId: "math" as const,
    difficulty: 1,
    difficultyScore: 1,
    source: "manual" as const,
    version: 1,
    importJobId: null
  };

  await questionService.saveQuestion({
    ...baseQuestion,
    id: validQuestionId,
    topic: "الهندسة",
    topicId: "geometry"
  });
  await questionService.saveQuestion({
    ...baseQuestion,
    id: legacyInvalidQuestionId,
    questionImageUrl: mediaService.getQuestionImageUrl(legacyInvalidQuestionId),
    topic: "الكمي",
    topicId: "quantitative"
  });
  await questionService.saveQuestion({
    ...baseQuestion,
    id: unrelatedLegacyQuestionId,
    questionImageUrl: mediaService.getQuestionImageUrl(unrelatedLegacyQuestionId),
    subject: "verbal",
    subjectId: "arabic",
    topic: "قديم",
    topicId: "legacy"
  });

  const bank = await importService.getAdminQuestionBank({
    page: 1,
    pageSize: 10,
    sort: "asc"
  });
  const quantitative = bank.questionCounts.subjects.find(
    (subject) => subject.subjectId === "math"
  );

  assert.ok(quantitative);
  assert.equal(
    quantitative.topics.some(
      (topic) => topic.topicId === "quantitative" || topic.topicLabel === "الكمي"
    ),
    false
  );
  assert.ok(
    quantitative.topics.some(
      (topic) => topic.topicId === "geometry" && topic.count >= 1
    )
  );
  assert.ok(
    bank.questionCounts.subjects
      .find((subject) => subject.subjectId === "arabic")
      ?.topics.some((topic) => topic.topicId === "legacy")
  );

  const classifiedQuestion = await importService.getAdminQuestionBank({
    page: 1,
    pageSize: 10,
    query: validQuestionId,
    sort: "asc"
  });
  assert.equal(classifiedQuestion.questions[0]?.topic, "الهندسة");
  assert.equal(classifiedQuestion.questions[0]?.topicId, "geometry");
  assert.equal(classifiedQuestion.questions[0]?.subtopic, null);
  assert.equal(classifiedQuestion.questions[0]?.subtopicId, null);

  await questionRepository.deleteQuestion(validQuestionId);
  await questionRepository.deleteQuestion(legacyInvalidQuestionId);
  await questionRepository.deleteQuestion(unrelatedLegacyQuestionId);
});

test("validates selected rows while ignoring populated unrelated sheets", () => {
  const sheets = validSheets();
  if (sheets[0]?.data[1]) sheets[0].data[1][6] = "X";
  sheets[0]?.data.push([500, "مكرر", "أ", "ب", "ج", "د", "X"]);
  sheets[4]?.data.push([], [504, "غير مدعوم"]);
  const analysis = excelAdapter.analyzeWorkbookSheets(
    sheets,
    { from: 500, to: 500 }
  );
  const codes = new Set(analysis.issues.map((issue) => issue.code));

  assert.ok(codes.has("invalid_correct_answer"));
  assert.ok(codes.has("duplicate_workbook_question"));
  assert.ok(!codes.has("unsupported_reading_rows"));
});

test("maps PDF pages deterministically from a starting question number", () => {
  const pages = pdfAdapter.selectPdfPages(201, 500);

  assert.equal(pages.length, 201);
  assert.deepEqual(pages[0], { pageIndex: 1, questionNumber: 500 });
  assert.deepEqual(pages.at(-1), { pageIndex: 201, questionNumber: 700 });
});

test("maps a selected PDF page range deterministically", () => {
  const pages = pdfAdapter.selectPdfPages(40, 50, { from: 7, to: 9 });
  assert.deepEqual(pages, [
    { pageIndex: 7, questionNumber: 50 },
    { pageIndex: 8, questionNumber: 51 },
    { pageIndex: 9, questionNumber: 52 }
  ]);
});

test("rejects mismatched Excel question and PDF page counts", () => {
  assert.throws(
    () => pdfAdapter.selectPdfPagesForQuestionRange(
      40,
      { from: 50, to: 52 },
      { from: 7, to: 8 }
    ),
    /must match/
  );
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

test("maps uploaded images to the selected question range in upload order", () => {
  const result = imageAdapter.matchUploadedImages([
    { buffer: png, originalname: "first.png", mimetype: "image/png" },
    { buffer: png, originalname: "second.png", mimetype: "image/png" },
    { buffer: png, originalname: "third.png", mimetype: "image/png" }
  ], { from: 50, to: 52 });

  assert.deepEqual([...result.byQuestionNumber.keys()], [50, 51, 52]);
  assert.equal(result.byQuestionNumber.get(51)?.originalname, "second.png");
  assert.equal(result.issues.length, 0);
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
    questionRange: { from: 500, to: 503 },
    excel: {
      buffer: createWorkbookBuffer(selectedVerbalSheets([500, 501, 502, 503])),
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
  assert.equal(detail.job.mediaSummary.matched, 2);
  assert.equal(detail.job.mediaSummary.missing, 2);
  assert.equal(detail.job.mediaSummary.extra, 0);
  assert.ok(codes.has("missing_image"));
  assert.ok(codes.has("source_count_mismatch"));
  await importService.cancelQuestionImport(detail.job.id);
});

test("returns only the selected range in the persisted frontend preview", async () => {
  const sheets = validSheets();
  sheets[0]?.data.push([1500, "غير صالح خارج النطاق", "", "", "", "", "X"]);
  const detail = await importService.analyzeQuestionImport({
    createdBy: "admin@example.com",
    questionRange: { from: 500, to: 500 },
    excel: {
      buffer: createWorkbookBuffer(sheets),
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      originalname: "questions.xlsx"
    },
    images: [{ buffer: png, mimetype: "image/png", originalname: "first.png" }]
  });

  assert.equal(detail.job.totalQuestions, 1);
  assert.equal(detail.job.errorCount, 0);
  assert.deepEqual(detail.items.map((item) => item.questionNumber), [500]);
  assert.ok(!detail.job.issues.some((item) => item.questionNumber === 1500));
  await importService.cancelQuestionImport(detail.job.id);
});

test("rejects malformed Excel and PDF files before creating an import", async () => {
  await assert.rejects(
    importService.analyzeQuestionImport({
      createdBy: "admin@example.com",
      questionRange: { from: 500, to: 503 },
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
      questionRange: { from: 500, to: 503 },
      excel: {
        buffer: createWorkbookBuffer(selectedVerbalSheets([500, 501, 502, 503])),
        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        originalname: "questions.xlsx"
      },
      pdf: {
        buffer: Buffer.from("not a PDF"),
        mimetype: "application/pdf",
        originalname: "questions.pdf"
      },
      pdfPageRange: { from: 1, to: 4 }
    }),
    /PDF/
  );
});

test("rejects XLSX archives with unsafe decompression characteristics", () => {
  const compressedBomb = Buffer.from(zipSync({
    "xl/worksheets/sheet1.xml": strToU8("A".repeat(1024 * 1024))
  }, { level: 9 }));
  assert.throws(
    () => excelAdapter.assertSafeWorkbookArchive(compressedBomb),
    /safe unpacked resource limits/
  );
});

test("commits a valid import and rolls it back without leaving a question", async () => {
  const questionNumber = 800101;
  const questionId = `Q-${questionNumber}`;
  const job = await createReadyJob([questionNumber]);
  await mediaService.stageQuestionImageObject(job.id, questionId, png);

  await importService.confirmQuestionImport(job.id, {});
  const completed = await waitForTerminalJob(job.id);
  assert.equal(completed.job.status, "completed");
  assert.equal(completed.job.createdCount, 1);
  assert.equal((await questionRepository.findQuestionById(questionId))?.import_job_id, job.id);

  const rolledBack = await importService.rollbackQuestionImport(job.id);
  assert.equal(rolledBack.job.status, "rolled_back");
  assert.equal(await questionRepository.findQuestionById(questionId), null);
  assert.equal(mediaService.questionImageExists(questionId), false);
  mediaService.removeImportMedia(job.id);
});

test("restores a replaced question and image during rollback", async () => {
  const questionNumber = 800102;
  const questionId = `Q-${questionNumber}`;
  await questionService.saveQuestion({
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

  const job = await createReadyJob([questionNumber], new Set([questionNumber]));
  await mediaService.stageQuestionImageObject(job.id, questionId, replacementPng);
  await importService.confirmQuestionImport(job.id, {
    duplicateDecisions: [{ action: "replace", questionNumber }]
  });
  const completed = await waitForTerminalJob(job.id);
  assert.equal(completed.job.replacedCount, 1);
  assert.equal((await questionRepository.findQuestionById(questionId))?.correct_answer, "A");

  await importService.rollbackQuestionImport(job.id);
  const restored = await questionRepository.findQuestionById(questionId);
  assert.equal(restored?.correct_answer, "D");
  assert.equal(restored?.topic, "قديم");
  assert.equal(restored?.version, 4);
  assert.equal(restored?.import_job_id, null);
  assert.deepEqual(readFileSync(mediaService.getQuestionImagePath(questionId)), png);

  await questionRepository.deleteQuestion(questionId);
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
    await seedExistingQuestion(duplicateNumber);
    const job = await createReadyJob(
      questionNumbers,
      new Set([duplicateNumber])
    );
    for (const questionNumber of questionNumbers) {
      await mediaService.stageQuestionImageObject(
        job.id,
        `Q-${questionNumber}`,
        replacementPng
      );
    }

    await importService.confirmQuestionImport(job.id, {
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
      Boolean(await questionRepository.findQuestionById("Q-700")),
      scenario.hasLast
    );

    const historyEntry = (await importService.getImportHistory()).jobs.find(
      (candidate) => candidate.id === job.id
    );
    assert.equal(historyEntry?.status, "completed");
    const storedTimestamp = await db.prepare<string, { created_at: string }>(
      "SELECT created_at FROM import_jobs WHERE id = ?"
    ).get(job.id);
    assert.equal(historyEntry?.createdAt, storedTimestamp?.created_at);

    await importService.rollbackQuestionImport(job.id);
    assert.equal(await questionRepository.findQuestionById("Q-500"), null);
    assert.equal(await questionRepository.findQuestionById("Q-700"), null);
    assert.equal(
      (await questionRepository.findQuestionById("Q-502"))?.correct_answer,
      "D"
    );
    assert.equal(
      (await importService.getImportJobDetail(job.id)).job.status,
      "rolled_back"
    );

    await questionRepository.deleteQuestion("Q-502");
    mediaService.removeQuestionImage("Q-502");
    mediaService.removeImportMedia(job.id);
  }
});

test("rolls back database and file changes when a commit fails", async () => {
  const first = 800103;
  const second = 800104;
  const job = await createReadyJob([first, second]);
  await mediaService.stageQuestionImageObject(job.id, `Q-${first}`, png);

  await importService.confirmQuestionImport(job.id, {});
  const failed = await waitForTerminalJob(job.id);
  assert.equal(failed.job.status, "failed");
  assert.equal(await questionRepository.findQuestionById(`Q-${first}`), null);
  assert.equal(await questionRepository.findQuestionById(`Q-${second}`), null);
  assert.equal(mediaService.questionImageExists(`Q-${first}`), false);
  mediaService.removeImportMedia(job.id);
});

test("rejects storage upload and verification failures", async () => {
  const baseStorage = {
    copyObject: async () => {},
    deleteObject: async () => {},
    deletePrefix: async () => {},
    getObject: async () => null,
    objectExists: async () => false
  };
  const uploadFailureStorage = {
    ...baseStorage,
    getObjectBuffer: async () => null,
    uploadObject: async () => { throw new Error("simulated upload failure"); }
  };
  await assert.rejects(
    mediaService.uploadVerifiedObject(uploadFailureStorage, {
      body: png,
      key: "imports/test/staged/Q-1.webp"
    }),
    /simulated upload failure/
  );

  const verificationFailureStorage = {
    ...baseStorage,
    getObjectBuffer: async () => null,
    uploadObject: async () => {}
  };
  await assert.rejects(
    mediaService.uploadVerifiedObject(verificationFailureStorage, {
      body: png,
      key: "imports/test/staged/Q-1.webp"
    }),
    /could not be verified/
  );
});

test("rejects final image promotion when copied content is unreadable", async () => {
  const storage = {
    copyObject: async () => {},
    deleteObject: async () => {},
    deletePrefix: async () => {},
    getObject: async () => null,
    getObjectBuffer: async (key: string) => key.includes("staged") ? png : null,
    objectExists: async () => true,
    uploadObject: async () => {}
  };

  await assert.rejects(
    mediaService.copyVerifiedObject(
      storage,
      "imports/test/staged/Q-1.webp",
      "questions/Q-1/question.webp",
      "image/webp"
    ),
    /could not be verified/
  );
});

test("allows configured admins and rejects ordinary authenticated users", async () => {
  const app = await createApp();
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const register = async (email: string) => {
    const password = "correct horse battery";
    const verificationCode = await issueTestRegistrationCode(email);
    const phoneNumber = email === "admin@example.com" ? "+966500000021" : "+966500000022";
    const phoneVerificationCode = await issueTestPhoneVerificationCode(phoneNumber);
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        passwordConfirmation: password,
        phoneNumber,
        phoneVerificationCode,
        verificationCode
      })
    });
    assert.equal(response.status, 201);
    return response.headers.get("set-cookie")?.split(";")[0] ?? "";
  };

  const login = async (email: string) => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      body: JSON.stringify({ email, password: "correct horse battery" }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    assert.equal(response.status, 200);
    return response.headers.get("set-cookie")?.split(";")[0] ?? "";
  };

  try {
    await register("admin@example.com");
    const userCookie = await register("student@example.com");
    await importConfiguredAdminEmails();
    const adminCookie = await login("admin@example.com");
    const adminResponse = await fetch(`${baseUrl}/admin/import/jobs`, {
      headers: { cookie: adminCookie }
    });
    const userResponse = await fetch(`${baseUrl}/admin/import/jobs`, {
      headers: { cookie: userCookie }
    });

    assert.equal(adminResponse.status, 200);
    assert.equal(userResponse.status, 403);

    const userPdfResponse = await fetch(
      `${baseUrl}/admin/import/source-pdfs/source-pdf-test/file`,
      { headers: { cookie: userCookie } }
    );
    const adminPdfResponse = await fetch(
      `${baseUrl}/admin/import/source-pdfs/source-pdf-test/file`,
      { headers: { cookie: adminCookie } }
    );
    assert.equal(userPdfResponse.status, 403);
    assert.equal(adminPdfResponse.status, 404);

    const form = new FormData();
    form.append(
      "excel",
      new Blob([createWorkbookBuffer([selectedVerbalSheets([500, 501, 502, 503])[0]!])], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }),
      "questions.xlsx"
    );
    for (const number of [500, 501, 502, 503]) {
      form.append("images", new Blob([png], { type: "image/png" }), `${number}.png`);
    }
    form.append("questionFrom", "500");
    form.append("questionTo", "503");
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
    assert.equal(await questionRepository.findQuestionById("Q-500"), null);
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

after(async () => {
  await closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
