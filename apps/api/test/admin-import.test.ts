import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { after, test } from "node:test";
import { strToU8, zipSync } from "fflate";
import { issueTestRegistrationCode } from "./helpers/auth.js";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-admin-import-test-"));
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const productionFrontendOrigin = "https://abqoor-web.vercel.app";
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "admin@example.com";
process.env.FRONTEND_ORIGIN = `http://localhost:5173,${productionFrontendOrigin}`;
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
const toArabicDigits = (value: number) => String(value).replace(
  /\d/g,
  (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)] ?? digit
);
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

const quantitativeWideHeader = [
  "المقارنة ١",
  "المقارنة ٢",
  "أ",
  "ب",
  "ج",
  "د",
  "السؤال",
  "رقم السؤال",
  "النموذج",
  "الصورة",
  "هل صعوبة الدقة في السؤال",
  "فئة إضافية",
  "الإجابة",
  "صورة مقارنة ١",
  "صورة مقارنة ٢",
  "صورة مقارنة ٣",
  "الوزن",
  "الفصل"
];

const quantitativeWideRow = (questionNumber: number) => [
  `القيمة الأولى ${questionNumber}`,
  `القيمة الثانية ${questionNumber}`,
  "١",
  "٢",
  "٣",
  "٤",
  `سؤال كمي ${questionNumber}`,
  questionNumber,
  "نموذج تجريبي",
  "لا",
  3,
  "الحساب",
  "ج",
  "",
  "",
  "",
  2,
  "العمليات الأساسية"
];

const validWideQuantitativeSheets = (questionNumbers: number[]) => [{
  sheet: "كمي نموذج تجريبي",
  data: [
    quantitativeWideHeader,
    ...questionNumbers.map(quantitativeWideRow)
  ]
}];

const authoritativeArHeader = [
  null,
  null,
  null,
  "السؤال",
  "المقارنة أ",
  "المقارنة ب",
  "أ",
  "ب",
  "ج",
  "د",
  "الصورة",
  null,
  "صعوبة",
  "فئة السؤال",
  "فئة إضافية",
  "الإجابة",
  "صورة مقارنة أ",
  "صورة مقارنة ب"
];

const authoritativeArRow = (questionNumber: number) => [
  questionNumber,
  "GROUP-7",
  `CODE-${questionNumber}`,
  `سؤال هندسي ${questionNumber}`,
  `القيمة أ ${questionNumber}`,
  `القيمة ب ${questionNumber}`,
  "الأولى أكبر",
  "الثانية أكبر",
  "متساويتان",
  "المعطيات غير كافية",
  "نعم",
  "",
  4,
  "الزوايا",
  "تدريب تأسيسي",
  "ب",
  `cmp-a-${questionNumber}`,
  `cmp-b-${questionNumber}`
];

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

const sheetXml = (rows: unknown[][], hasDrawing = false) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData>` +
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
  `</sheetData>${hasDrawing ? '<drawing r:id="rIdDrawing"/>' : ""}</worksheet>`;

type TestEmbeddedImage = {
  buffer: Buffer;
  columnIndex: number;
  filename: string;
  rowIndex: number;
};

const createWorkbookBuffer = (
  sheets = validSheets(),
  commentsBySheet: Record<number, Record<string, string>> = {},
  embeddedImagesBySheet: Record<number, TestEmbeddedImage[]> = {}
) => {
  const contentTypes = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`,
    `<Default Extension="png" ContentType="image/png"/>`,
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
    const sheetNumber = index + 1;
    const embeddedImages = embeddedImagesBySheet[sheetNumber] ?? [];
    files[`xl/worksheets/sheet${sheetNumber}.xml`] = strToU8(
      sheetXml(sheet.data, embeddedImages.length > 0)
    );
    const comments = commentsBySheet[index + 1];
    if (comments || embeddedImages.length > 0) {
      const relationships = [
        ...(comments ? [
          `<Relationship Id="rIdComments" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="../comments${sheetNumber}.xml"/>`
        ] : []),
        ...(embeddedImages.length > 0 ? [
          `<Relationship Id="rIdDrawing" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${sheetNumber}.xml"/>`
        ] : [])
      ].join("");
      files[`xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`] = strToU8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        relationships +
        `</Relationships>`
      );
    }
    if (comments) {
      files[`xl/comments${index + 1}.xml`] = strToU8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<comments xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<authors><author>Abqoor</author></authors><commentList>` +
        Object.entries(comments).map(([reference, value]) =>
          `<comment ref="${escapeXml(reference)}" authorId="0"><text><t>${escapeXml(value)}</t></text></comment>`
        ).join("") +
        `</commentList></comments>`
      );
    }
    if (embeddedImages.length > 0) {
      files[`xl/drawings/drawing${sheetNumber}.xml`] = strToU8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        embeddedImages.map((image, imageIndex) =>
          `<xdr:oneCellAnchor><xdr:from><xdr:col>${image.columnIndex}</xdr:col><xdr:row>${image.rowIndex}</xdr:row></xdr:from>` +
          `<xdr:ext cx="895350" cy="962025"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${imageIndex + 1}" name="${escapeXml(image.filename)}"/></xdr:nvPicPr>` +
          `<xdr:blipFill><a:blip r:embed="rId${imageIndex + 1}"/></xdr:blipFill></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`
        ).join("") +
        `</xdr:wsDr>`
      );
      files[`xl/drawings/_rels/drawing${sheetNumber}.xml.rels`] = strToU8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        embeddedImages.map((image, imageIndex) =>
          `<Relationship Id="rId${imageIndex + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${escapeXml(image.filename)}"/>`
        ).join("") +
        `</Relationships>`
      );
      embeddedImages.forEach((image) => {
        files[`xl/media/${image.filename}`] = new Uint8Array(image.buffer);
      });
    }
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

test("maps each supported verbal workbook format without shifting columns", () => {
  const cases = [
    {
      expectedAnswerText: undefined,
      expectedPassage: undefined,
      expectedQuestion: "ليل : نهار",
      expectedOptions: ["برد : حر", "نور : قمر", "صيف : شتاء", "كتاب : قلم"],
      range: { from: 101, to: 101 },
      sheet: {
        sheet: "بنك التناظر عام",
        data: [standardHeader, [101, "ليل : نهار", "برد : حر", "نور : قمر", "صيف : شتاء", "كتاب : قلم", "أ"]]
      }
    },
    {
      expectedAnswerText: "مجتهد",
      expectedPassage: undefined,
      expectedQuestion: "الطالب ____ في دراسته",
      expectedOptions: ["مجتهد", "بعيد", "سريع", "قليل"],
      range: { from: 1, to: 1 },
      sheet: {
        sheet: "إكمال الجمل عام",
        data: [["السؤال", "الإجابة نص", "أ", "ب", "ج", "د", "الإجابة"], ["الطالب ____ في دراسته", "مجتهد", "مجتهد", "بعيد", "سريع", "قليل", "أ"]]
      }
    },
    {
      expectedAnswerText: "ينام",
      expectedPassage: undefined,
      expectedQuestion: "يستيقظ المجتهد مبكراً ثم ينام إلى عمله",
      expectedOptions: ["يستيقظ", "المجتهد", "ينام", "عمله"],
      range: { from: 1, to: 1 },
      sheet: {
        sheet: "الخطأ السياقي عام",
        data: [["السؤال", "الإجابة نص", "أ", "ب", "ج", "د", "الإجابة"], ["يستيقظ المجتهد مبكراً ثم ينام إلى عمله", "ينام", "يستيقظ", "المجتهد", "ينام", "عمله", "ج"]]
      }
    },
    {
      expectedAnswerText: "سيارة",
      expectedPassage: undefined,
      expectedQuestion: "أدوات الكتابة",
      expectedOptions: ["قلم", "دفتر", "ممحاة", "سيارة"],
      range: { from: 104, to: 104 },
      sheet: {
        sheet: "المفردة الشاذة عام",
        data: [["رقم السؤال", "أ", "ب", "ج", "د", "الإجابة", "الإجابة نص", "السؤال"], [104, "قلم", "دفتر", "ممحاة", "سيارة", "د", "سيارة", "أدوات الكتابة"]]
      }
    },
    {
      expectedAnswerText: undefined,
      expectedPassage: "هذا نص قصير مشترك.",
      expectedQuestion: "ما الفكرة الرئيسة؟",
      expectedOptions: ["الأولى", "الثانية", "الثالثة", "الرابعة"],
      range: { from: 105, to: 105 },
      sheet: {
        sheet: "استيعاب المقروء عام",
        data: [["رقم السؤال", "النص", "السؤال", "أ", "ب", "ج", "د", "الإجابة"], [105, "هذا نص قصير مشترك.", "ما الفكرة الرئيسة؟", "الأولى", "الثانية", "الثالثة", "الرابعة", "ب"]]
      }
    }
  ] as const;

  for (const item of cases) {
    const analysis = excelAdapter.analyzeWorkbookSheets([item.sheet], item.range);
    assert.equal(analysis.issues.length, 0, item.sheet.sheet);
    assert.equal(analysis.questions.length, 1, item.sheet.sheet);
    assert.equal(analysis.questions[0]?.questionText, item.expectedQuestion);
    assert.equal(analysis.questions[0]?.subject, "verbal");
    assert.deepEqual(analysis.questions[0]?.options, item.expectedOptions);
    assert.equal(analysis.questions[0]?.metadata.answerText, item.expectedAnswerText);
    assert.equal(analysis.questions[0]?.metadata.passage, item.expectedPassage);
  }
});

test("supports the numbered seven-column sentence-completion workbook", () => {
  const analysis = excelAdapter.analyzeWorkbookSheets([{
    sheet: "إكمال الجمل عام",
    data: [
      ["رقم السؤال", "الإجابة نص", "أ", "ب", "ج", "د", "الإجابة"],
      [106, "الطالب ____ في دراسته", "مجتهد", "بعيد", "سريع", "قليل", "أ"]
    ]
  }], { from: 106, to: 106 }, "general");

  assert.equal(analysis.issues.length, 0);
  assert.equal(analysis.questions[0]?.subject, "verbal");
  assert.equal(analysis.questions[0]?.topicId, "sentence-completion");
  assert.equal(analysis.questions[0]?.questionText, "الطالب ____ في دراسته");
  assert.equal(analysis.questions[0]?.metadata.answerText, "الطالب ____ في دراسته");
});

test("gives repeated reading passages a stable relationship identifier", () => {
  const header = ["رقم السؤال", "النص", "السؤال", "أ", "ب", "ج", "د", "الإجابة"];
  const analysis = excelAdapter.analyzeWorkbookSheets([{
    sheet: "استيعاب المقروء عام",
    data: [
      header,
      [201, "نص مشترك", "السؤال الأول", "أ1", "ب1", "ج1", "د1", "أ"],
      [202, "نص مشترك", "السؤال الثاني", "أ2", "ب2", "ج2", "د2", "ب"]
    ]
  }], { from: 201, to: 202 });

  assert.equal(analysis.issues.length, 0);
  assert.ok(analysis.questions[0]?.metadata.passageId);
  assert.equal(
    analysis.questions[0]?.metadata.passageId,
    analysis.questions[1]?.metadata.passageId
  );
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

test("maps the documented A-R quantitative workbook and cell-note fallback", () => {
  const sheets = validWideQuantitativeSheets([10, 11]);
  if (sheets[0]?.data[1]) sheets[0].data[1][6] = "";
  sheets[0].comments = new Map([["G2", "سؤال من ملاحظة الخلية"]]);

  const analysis = excelAdapter.analyzeWorkbookSheets(
    sheets,
    { from: 10, to: 10 }
  );

  assert.equal(analysis.issues.length, 0);
  assert.equal(analysis.questions.length, 1);
  assert.equal(analysis.questions[0]?.questionText, "سؤال من ملاحظة الخلية");
  assert.equal(analysis.questions[0]?.correctAnswer, "C");
  assert.equal(analysis.questions[0]?.topic, "الحساب");
  assert.equal(analysis.questions[0]?.subtopic, "العمليات الأساسية");
  assert.equal(analysis.questions[0]?.difficulty, 3);
  assert.equal(analysis.questions[0]?.metadata.additionalCategory, "الحساب");
  assert.equal(analysis.questions[0]?.metadata.chapter, "العمليات الأساسية");
  assert.deepEqual(analysis.questions[0]?.metadata.comparisonImages, []);
  assert.deepEqual(
    analysis.questions[0]?.metadata.comparisonOperands,
    ["القيمة الأولى 10", "القيمة الثانية 10"]
  );
  assert.equal(analysis.questions[0]?.metadata.imageIndicator, "لا");
  assert.equal(analysis.questions[0]?.metadata.model, "نموذج تجريبي");
  assert.equal(analysis.questions[0]?.metadata.precisionDifficulty, "3");
  assert.equal(analysis.questions[0]?.metadata.weight, "2");
});

test("maps the extended A-Y quantitative workbook without using the bank id as the question id", () => {
  const header = [
    "رقم البنك", "معرف داخلي ١", "معرف داخلي ٢", "السؤال", "المقارنة أ",
    "أ", "ب", "ج", "مرجع", "د", "الصورة", "نعم / لا", "صعوبة",
    "فئة السؤال", "فئة إضافية", "الإجابة", "صورة مقارنة ١", "صورة مقارنة ٢",
    "تقني S", "تقني T", "تقني U", "تقني V", "معرف السؤال", "تقني X", "تقني Y"
  ];
  const row = [
    7, "SRC-1", "REF-2", "قارن بين القيمتين", "القيمة الأولى",
    "الأولى أكبر", "الثانية أكبر", "متساويتان", "محجوز", "لا تكفي البيانات",
    "نعم", "نعم", 4, "الحساب", "العمليات الأساسية", "ب", "cmp-1", "cmp-2",
    "s", "t", "u", "v", 321, "x", "y"
  ];
  const analysis = excelAdapter.analyzeWorkbookSheets(
    [{ sheet: "كمي بنك ٧", data: [header, row] }],
    { from: 321, to: 321 }
  );

  assert.equal(analysis.issues.length, 0);
  assert.equal(analysis.questions[0]?.questionNumber, 321);
  assert.equal(analysis.questions[0]?.metadata.bankGroupIdentifier, "7");
  assert.equal(analysis.questions[0]?.topicId, "arithmetic");
  assert.equal(analysis.questions[0]?.subtopic, "العمليات الأساسية");
  assert.equal(analysis.questions[0]?.difficulty, 4);
  assert.deepEqual(analysis.questions[0]?.metadata.comparisonImages, ["cmp-1", "cmp-2"]);
});

test("maps the labeled bank-first quantitative workbook using its local question column", () => {
  const header = [
    "البنك", "رقم السؤال", "معرف داخلي", "السؤال", "المقارنة أ", "المقارنة ب",
    "أ", "ب", "ج", "د", "الصورة", "هل يحتاج صوره؟", "صعوبة السؤال",
    "فئة السؤال", "فئة اضافية", "الإجابة", "صورة مقارنة أ", "صورة مقارنة ب",
    "تقني S", "تقني T", "تقني U", "تقني V", "0"
  ];
  const row = (bankGroup: number, questionNumber: number, globalNumber: number) => [
    bankGroup, questionNumber, globalNumber + 1, `سؤال ${questionNumber}`, "", "",
    "١", "٢", "٣", "٤", "", "لا", 3, "الحساب", "", "أ",
    "", "", "", "", "", "", globalNumber
  ];
  const analysis = excelAdapter.analyzeWorkbookSheets([{
    sheet: "بنك هندسة",
    data: [
      header,
      ...Array.from({ length: 48 }, (_, index) => row(1, index + 1, index + 1)),
      ...Array.from({ length: 48 }, (_, index) => row(2, index + 1, index + 49))
    ]
  }], { from: 1, to: 48 }, "general");

  assert.equal(analysis.questions.length, 48);
  assert.equal(analysis.issues.length, 0);
  assert.equal(analysis.questions[0]?.topicId, "geometry");
  assert.equal(analysis.questions[0]?.subtopic, "الحساب");
  assert.deepEqual(
    analysis.questions.map((question) => question.questionNumber),
    Array.from({ length: 48 }, (_, index) => index + 1)
  );
  assert.equal(
    analysis.diagnostics.sheets[0]?.rows.filter((row) => row.status === "skipped").length,
    48
  );
});

test("parses Arabic question numbers when a standard general sheet identifies its topic", () => {
  const analysis = excelAdapter.analyzeWorkbookSheets([{
    sheet: "الحساب",
    data: [
      standardHeader,
      ...Array.from({ length: 48 }, (_, index) => [
        toArabicDigits(index + 1),
        `سؤال ${index + 1}`,
        "أول",
        "ثان",
        "ثالث",
        "رابع",
        "أ"
      ])
    ]
  }], { from: 1, to: 48 }, "general");

  assert.equal(analysis.structuralFailure, false);
  assert.equal(analysis.questions.length, 48);
  assert.equal(analysis.issues.length, 0);
  assert.equal(analysis.questions[0]?.topicId, "arithmetic");
  assert.equal(analysis.questions[47]?.questionNumber, 48);
  assert.equal(analysis.diagnostics.sheets[0]?.selected, true);
  assert.equal(analysis.diagnostics.sheets[0]?.detectedHeaders[0], "رقم السؤال");
});

test("does not guess a section or main topic for an ambiguous seven-column sheet", () => {
  const analysis = excelAdapter.analyzeWorkbookSheets([{
    sheet: "أسئلة عامة",
    data: [standardHeader, [1, "سؤال", "أ", "ب", "ج", "د", "أ"]]
  }], { from: 1, to: 1 }, "general");

  assert.equal(analysis.structuralFailure, true);
  assert.deepEqual(analysis.issues.map((entry) => entry.code), ["ambiguous_workbook_structure"]);
});

test("maps the authoritative A-R quantitative format without shifting the empty L column", () => {
  const analysis = excelAdapter.analyzeWorkbookSheets([{
    sheet: "بنك الهندسة",
    data: [authoritativeArHeader, authoritativeArRow(701)]
  }], { from: 701, to: 701 }, "general");

  assert.equal(analysis.issues.length, 0);
  assert.equal(analysis.questions[0]?.subject, "quantitative");
  assert.equal(analysis.questions[0]?.topic, "الهندسة");
  assert.equal(analysis.questions[0]?.topicId, "geometry");
  assert.equal(analysis.questions[0]?.subtopic, "الزوايا");
  assert.equal(analysis.questions[0]?.subtopicId, "angles");
  assert.equal(analysis.questions[0]?.correctAnswer, "B");
  assert.deepEqual(analysis.questions[0]?.options, [
    "الأولى أكبر", "الثانية أكبر", "متساويتان", "المعطيات غير كافية"
  ]);
  assert.deepEqual(analysis.questions[0]?.metadata.sourceIdentifiers, {
    code: "CODE-701",
    primary: "701",
    secondary: "GROUP-7"
  });
  assert.deepEqual(analysis.questions[0]?.metadata.comparisonOperands, [
    "القيمة أ 701", "القيمة ب 701"
  ]);
  assert.equal(analysis.questions[0]?.metadata.imageIndicator, "نعم");
  assert.equal(analysis.questions[0]?.metadata.additionalCategory, "تدريب تأسيسي");
  assert.deepEqual(analysis.questions[0]?.metadata.comparisonImages, [
    "cmp-a-701", "cmp-b-701"
  ]);
});

test("reports a missing main topic without defaulting an A-R sheet to arithmetic", () => {
  const analysis = excelAdapter.analyzeWorkbookSheets([{
    sheet: "بيانات كمية",
    data: [authoritativeArHeader, authoritativeArRow(702)]
  }], { from: 702, to: 702 }, "general");

  assert.equal(analysis.questions[0]?.subject, "quantitative");
  assert.equal(analysis.questions[0]?.topic, "");
  assert.equal(analysis.questions[0]?.topicId, "");
  assert.deepEqual(analysis.issues.map((entry) => entry.code), ["missing_main_topic"]);
});

test("reports one structural error without cascading range errors", () => {
  const analysis = excelAdapter.analyzeWorkbookSheets([{
    sheet: "ورقة غير مدعومة",
    data: [["عمود غريب"], ["قيمة"]]
  }], { from: 1, to: 48 }, "general");

  assert.equal(analysis.structuralFailure, true);
  assert.deepEqual(analysis.issues.map((entry) => entry.code), ["unsupported_workbook_structure"]);
  assert.equal(analysis.diagnostics.sheets[0]?.recognized, false);
  assert.equal(analysis.diagnostics.sheets[0]?.rows[0]?.status, "skipped");
});

test("rejects a selected A-Y range that would merge separate bank groups", () => {
  const header = [
    "رقم البنك", "معرف داخلي ١", "معرف داخلي ٢", "السؤال", "المقارنة أ",
    "أ", "ب", "ج", "مرجع", "د", "الصورة", "نعم / لا", "صعوبة",
    "فئة السؤال", "فئة إضافية", "الإجابة", "صورة مقارنة ١", "صورة مقارنة ٢",
    "تقني S", "تقني T", "تقني U", "تقني V", "معرف السؤال", "تقني X", "تقني Y"
  ];
  const row = (bankGroup: number, questionNumber: number) => [
    bankGroup, "SRC", "REF", `سؤال ${questionNumber}`, "قيمة",
    "١", "٢", "٣", "محجوز", "٤", "", "لا", 2, "الحساب", "", "أ",
    "", "", "", "", "", "", questionNumber, "", ""
  ];
  const analysis = excelAdapter.analyzeWorkbookSheets([{
    sheet: "كمي متعدد الأقسام",
    data: [header, row(1, 401), row(2, 402)]
  }], { from: 401, to: 402 });

  assert.ok(analysis.issues.some((item) => item.code === "multiple_bank_groups"));
});

test("maps embedded workbook images by their OOXML row and column anchors", async () => {
  const workbook = createWorkbookBuffer(validQuantitativeSheets(), {}, {
    1: [{ buffer: png, columnIndex: 6, filename: "question-1.png", rowIndex: 1 }]
  });
  const analysis = await excelAdapter.readAdminWorkbook(workbook, { from: 1, to: 1 });

  assert.equal(analysis.issues.length, 0);
  assert.equal(analysis.questions[0]?.embeddedImages.length, 1);
  assert.equal(analysis.questions[0]?.embeddedImages[0]?.columnIndex, 6);
  assert.deepEqual(analysis.questions[0]?.metadata.embeddedImages, [{
    column: "G",
    filename: "question-1.png",
    mediaType: "image/png",
    rowNumber: 2
  }]);
});

test("reuses one workbook media buffer across repeated drawing anchors", async () => {
  const repeatedImages = Array.from({ length: 40 }, (_, index) => ({
    buffer: png,
    columnIndex: 6,
    filename: "shared-question-image.png",
    rowIndex: index % 2 === 0 ? 1 : 2
  }));
  const sheets = validQuantitativeSheets();
  sheets[0]?.data.push([2, "سؤال 2", "أ", "ب", "ج", "د", "نعم", "ب"]);
  const workbook = createWorkbookBuffer(sheets, {}, { 1: repeatedImages });
  const imagesBySheet = excelAdapter.extractWorkbookEmbeddedImages(workbook);
  const images = [...(imagesBySheet.get("الورقة1")?.values() ?? [])].flat();

  assert.equal(images.length, repeatedImages.length);
  assert.ok(images.every((image) => image.buffer === images[0]?.buffer));
});

test("extracts question text from an OOXML legacy cell note", async () => {
  const sheets = validWideQuantitativeSheets([12]);
  if (sheets[0]?.data[1]) sheets[0].data[1][6] = "";
  const workbook = createWorkbookBuffer(sheets, {
    1: { G2: "نص السؤال من ملاحظة Excel" }
  });

  const comments = excelAdapter.extractWorkbookComments(workbook);
  assert.equal(comments.get("كمي نموذج تجريبي")?.get("G2"), "نص السؤال من ملاحظة Excel");

  const analysis = await excelAdapter.readAdminWorkbook(workbook, { from: 12, to: 12 });
  assert.equal(analysis.issues.length, 0);
  assert.equal(analysis.questions[0]?.questionText, "نص السؤال من ملاحظة Excel");
});

test("accepts a valid 48-question Aqsam workbook without a fixed bank size", () => {
  const questionNumbers = Array.from({ length: 48 }, (_, index) => index + 1);
  const analysis = excelAdapter.analyzeWorkbookSheets(
    validWideQuantitativeSheets(questionNumbers),
    { from: 1, to: 48 }
  );

  assert.equal(analysis.issues.length, 0);
  assert.equal(analysis.questions.length, 48);
  assert.equal(analysis.sheetSummary[0]?.questionCount, 48);
});

test("keeps Aqsam banks idempotent and separate from general questions", async () => {
  const bankKey = "quantitative-trial-bank";
  const request = {
    createdBy: "admin@example.com",
    questionRange: { from: 1, to: 1 },
    importType: "aqsam" as const,
    bankKey,
    bankName: "بنك كمي تجريبي",
    excel: {
      buffer: createWorkbookBuffer(validWideQuantitativeSheets([1])),
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      originalname: "quantitative-aqsam.xlsx"
    },
    images: [{ buffer: png, mimetype: "image/png", originalname: "1.png" }]
  };

  const first = await importService.analyzeQuestionImport(request);
  await importService.confirmQuestionImport(first.job.id, {});
  const completed = await waitForTerminalJob(first.job.id);
  assert.equal(completed.job.status, "completed");

  const retry = await importService.analyzeQuestionImport(request);
  assert.equal(retry.job.bankId, first.job.bankId);
  assert.equal(retry.items[0]?.isDuplicate, true);

  const aqsam = await importService.getAdminQuestionBank({
    bankId: first.job.bankId ?? undefined,
    mode: "aqsam",
    page: 1,
    pageSize: 10,
    sort: "asc"
  });
  const general = await importService.getAdminQuestionBank({
    mode: "general",
    page: 1,
    pageSize: 10,
    query: completed.items[0]?.questionId,
    sort: "asc"
  });

  assert.equal(aqsam.questions.length, 1);
  assert.equal(aqsam.banks.filter((bank) => bank.key === bankKey).length, 1);
  assert.equal(aqsam.banks.find((bank) => bank.key === bankKey)?.questionCount, 1);
  assert.equal(general.questions.length, 0);

  await importService.cancelQuestionImport(retry.job.id);
  await importService.rollbackQuestionImport(first.job.id);
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

test("analyzes a 48-question general workbook with 48 matching images", async () => {
  const workbook = createWorkbookBuffer([{
    sheet: "الحساب",
    data: [
      standardHeader,
      ...Array.from({ length: 48 }, (_, index) => [
        toArabicDigits(index + 1),
        `سؤال ${index + 1}`,
        "أول",
        "ثان",
        "ثالث",
        "رابع",
        "أ"
      ])
    ]
  }]);
  const detail = await importService.analyzeQuestionImport({
    createdBy: "admin@example.com",
    importType: "general",
    questionRange: { from: 1, to: 48 },
    excel: {
      buffer: workbook,
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      originalname: "general.xlsx"
    },
    images: Array.from({ length: 48 }, (_, index) => ({
      buffer: png,
      mimetype: "image/png",
      originalname: `${index + 1}.png`
    }))
  });

  assert.equal(detail.items.length, 48);
  assert.equal(detail.job.errorCount, 0);
  assert.deepEqual(detail.job.mediaSummary, {
    expected: 48,
    extra: 0,
    found: 48,
    matched: 48,
    missing: 0
  });
  assert.equal(detail.diagnostics?.sheets[0]?.rows[0]?.excelRowNumber, 2);
  assert.equal(detail.diagnostics?.matchingStatus, "completed");
  assert.equal(detail.diagnostics?.parsedQuestionIdentifiers.length, 48);
  await importService.cancelQuestionImport(detail.job.id);
});

test("matches 48 authoritative A-R rows to 48 selected media identifiers", async () => {
  const detail = await importService.analyzeQuestionImport({
    createdBy: "admin@example.com",
    importType: "general",
    questionRange: { from: 1, to: 48 },
    excel: {
      buffer: createWorkbookBuffer([{
        sheet: "بنك الهندسة",
        data: [
          authoritativeArHeader,
          ...Array.from({ length: 48 }, (_, index) => authoritativeArRow(index + 1))
        ]
      }]),
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      originalname: "quantitative-a-r.xlsx"
    },
    images: Array.from({ length: 48 }, (_, index) => ({
      buffer: png,
      mimetype: "image/png",
      originalname: `${index + 1}.png`
    }))
  });

  assert.equal(detail.items.length, 48);
  assert.equal(detail.job.errorCount, 0);
  assert.deepEqual(detail.job.mediaSummary, {
    expected: 48,
    extra: 0,
    found: 48,
    matched: 48,
    missing: 0
  });
  assert.equal(
    detail.diagnostics?.sheets[0]?.rows.filter((row) => row.mediaMatchStatus === "matched").length,
    48
  );
  await importService.cancelQuestionImport(detail.job.id);
});

test("persists authoritative Excel metadata with the imported question", async () => {
  const questionNumber = 7901;
  const detail = await importService.analyzeQuestionImport({
    createdBy: "admin@example.com",
    importType: "general",
    questionRange: { from: questionNumber, to: questionNumber },
    excel: {
      buffer: createWorkbookBuffer([{
        sheet: "بنك الهندسة",
        data: [authoritativeArHeader, authoritativeArRow(questionNumber)]
      }]),
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      originalname: "metadata-source.xlsx"
    },
    images: [{ buffer: png, mimetype: "image/png", originalname: `${questionNumber}.png` }]
  });

  await importService.confirmQuestionImport(detail.job.id, {});
  const completed = await waitForTerminalJob(detail.job.id);
  assert.equal(completed.job.status, "completed");
  const saved = await questionRepository.findQuestionById(`Q-${questionNumber}`);
  const metadata = JSON.parse(saved?.import_metadata_json ?? "{}") as Record<string, unknown>;
  assert.equal(metadata.sourceWorkbook, "metadata-source.xlsx");
  assert.equal(metadata.sourceWorksheet, "بنك الهندسة");
  assert.equal(metadata.sourceRowNumber, 2);
  assert.deepEqual(metadata.sourceIdentifiers, {
    code: `CODE-${questionNumber}`,
    primary: String(questionNumber),
    secondary: "GROUP-7"
  });
  assert.equal(metadata.additionalCategory, "تدريب تأسيسي");
  assert.deepEqual(metadata.comparisonImages, [
    `cmp-a-${questionNumber}`,
    `cmp-b-${questionNumber}`
  ]);
  await importService.rollbackQuestionImport(detail.job.id);
});

test("does not report every image as extra when workbook detection fails", async () => {
  const detail = await importService.analyzeQuestionImport({
    createdBy: "admin@example.com",
    importType: "general",
    questionRange: { from: 1, to: 1 },
    excel: {
      buffer: createWorkbookBuffer([{
        sheet: "ورقة غير مدعومة",
        data: [["عمود غريب"], ["قيمة"]]
      }]),
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      originalname: "unsupported.xlsx"
    },
    images: [{ buffer: png, mimetype: "image/png", originalname: "1.png" }]
  });

  assert.deepEqual(detail.job.issues.map((entry) => entry.code), ["unsupported_workbook_structure"]);
  assert.equal(detail.job.mediaSummary.extra, 0);
  assert.equal(detail.diagnostics?.matchingStatus, "not_attempted");
  assert.deepEqual(detail.diagnostics?.unmatchedMediaIdentifiers, []);
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
    mode: "general",
    page: 1,
    pageSize: 1,
    sort: "asc"
  });
  assert.equal(bank.mode, "general");
  assert.equal(bank.pageSize, 1);
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

test("reads PDF page counts from a disk path without buffering the source file", async () => {
  const pdfPath = resolve(
    workspaceRoot,
    "test-data/pdf/(1 بالجملة) القالب الرئيسي عبقور.pdf"
  );
  assert.equal(await pdfAdapter.getPdfPageCount(pdfPath), 49);
});

test("maps a selected PDF page range deterministically", () => {
  const pages = pdfAdapter.selectPdfPages(40, 50, { from: 7, to: 9 });
  assert.deepEqual(pages, [
    { pageIndex: 7, questionNumber: 50 },
    { pageIndex: 8, questionNumber: 51 },
    { pageIndex: 9, questionNumber: 52 }
  ]);
});

test("pairs 48 authoritative Excel rows with the same 48 selected PDF question identifiers", () => {
  const analysis = excelAdapter.analyzeWorkbookSheets([{
    sheet: "بنك الهندسة",
    data: [
      authoritativeArHeader,
      ...Array.from({ length: 48 }, (_, index) => authoritativeArRow(index + 1))
    ]
  }], { from: 1, to: 48 }, "general");
  const pages = pdfAdapter.selectPdfPagesForQuestionRange(
    48,
    { from: 1, to: 48 },
    { from: 1, to: 48 }
  );

  assert.deepEqual(
    analysis.questions.map((question) => question.questionNumber),
    pages.map((page) => page.questionNumber)
  );
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

test("cleans up a partial streamed source upload when verification fails", async () => {
  const path = join(testDirectory, "source-upload.pdf");
  writeFileSync(path, Buffer.from("%PDF-test"));
  const deleted: string[] = [];
  const storage = {
    copyObject: async () => {},
    deleteObject: async (key: string) => { deleted.push(key); },
    deletePrefix: async () => {},
    getObject: async () => ({
      body: Readable.from(Buffer.alloc(0)),
      contentLength: 9
    }),
    getObjectBuffer: async () => null,
    objectExists: async () => true,
    uploadFile: async () => {},
    uploadObject: async () => {}
  };

  await assert.rejects(
    mediaService.uploadVerifiedFileObject(storage, {
      contentLength: 9,
      key: "pdfs/originals/test/original.pdf",
      path
    }),
    /could not be read/
  );
  assert.deepEqual(deleted, ["pdfs/originals/test/original.pdf"]);
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

test("handles production CORS for admin imports while preserving authorization", async () => {
  const app = await createApp();
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const register = async (email: string) => {
    const password = "correct horse battery";
    const verificationCode = await issueTestRegistrationCode(email);
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        passwordConfirmation: password,
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
    const preflight = await fetch(`${baseUrl}/admin/import/analyze`, {
      headers: {
        "access-control-request-headers": "content-type",
        "access-control-request-method": "POST",
        origin: productionFrontendOrigin
      },
      method: "OPTIONS"
    });
    assert.equal(preflight.status, 204);
    assert.equal(
      preflight.headers.get("access-control-allow-origin"),
      productionFrontendOrigin
    );
    assert.equal(preflight.headers.get("access-control-allow-credentials"), "true");
    assert.match(
      preflight.headers.get("access-control-allow-methods") ?? "",
      /POST/
    );
    assert.match(
      preflight.headers.get("access-control-allow-headers") ?? "",
      /Content-Type/i
    );

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

    const userAnalyzeResponse = await fetch(`${baseUrl}/admin/import/analyze`, {
      body: new FormData(),
      headers: { cookie: userCookie, origin: productionFrontendOrigin },
      method: "POST"
    });
    assert.equal(userAnalyzeResponse.status, 403);
    assert.equal(
      userAnalyzeResponse.headers.get("access-control-allow-origin"),
      productionFrontendOrigin
    );

    const invalidAnalyzeResponse = await fetch(`${baseUrl}/admin/import/analyze`, {
      body: new FormData(),
      headers: { cookie: adminCookie, origin: productionFrontendOrigin },
      method: "POST"
    });
    assert.equal(invalidAnalyzeResponse.status, 400);
    assert.equal(
      invalidAnalyzeResponse.headers.get("access-control-allow-origin"),
      productionFrontendOrigin
    );
    assert.equal(invalidAnalyzeResponse.headers.get("access-control-allow-credentials"), "true");
    assert.equal(
      (await invalidAnalyzeResponse.json() as { message?: string }).message,
      "ملف Excel مطلوب."
    );

    const malformedForm = new FormData();
    malformedForm.append(
      "unexpected",
      new Blob([png], { type: "image/png" }),
      "unexpected.png"
    );
    const multipartErrorResponse = await fetch(`${baseUrl}/admin/import/analyze`, {
      body: malformedForm,
      headers: { cookie: adminCookie, origin: productionFrontendOrigin },
      method: "POST"
    });
    assert.equal(multipartErrorResponse.status, 400);
    assert.equal(
      multipartErrorResponse.headers.get("access-control-allow-origin"),
      productionFrontendOrigin
    );
    assert.match(
      (await multipartErrorResponse.json() as { message?: string }).message ?? "",
      /تعذر قبول الملفات المرفوعة/
    );

    const rejectedPreflight = await fetch(`${baseUrl}/admin/import/analyze`, {
      headers: {
        "access-control-request-headers": "content-type",
        "access-control-request-method": "POST",
        origin: "https://rejected.example"
      },
      method: "OPTIONS"
    });
    assert.equal(rejectedPreflight.status, 403);
    assert.equal(rejectedPreflight.headers.get("access-control-allow-origin"), null);

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
      headers: { cookie: adminCookie, origin: productionFrontendOrigin },
      body: form
    });
    assert.equal(analyzeResponse.status, 200);
    assert.equal(
      analyzeResponse.headers.get("access-control-allow-origin"),
      productionFrontendOrigin
    );
    assert.equal(analyzeResponse.headers.get("access-control-allow-credentials"), "true");
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
