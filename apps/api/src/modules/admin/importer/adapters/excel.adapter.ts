import readXlsxFile from "read-excel-file/node";
import { unzipSync } from "fflate";
import {
  topicTaxonomy,
  type LegacyQuestionSubject,
  type TopicDefinition
} from "../../../learning-taxonomy/taxonomy.js";
import { parseCorrectAnswer, parseQuestionNumber } from "../question-format.mapper.js";
import type {
  ImportValidationIssue,
  PageRange,
  ParsedWorkbookQuestion,
  RawMetadataAdapterResult,
  WorkbookAnalysis
} from "../importer.types.js";

export const requiredVerbalWorkbookSheets = [
  "بنك التناظر عام",
  "اكمال الجمل عام",
  "الخطأ السياقي عام",
  "المفردة الشاذة عام",
  "استيعاب المقروء عام"
] as const;

export const requiredQuantitativeWorkbookSheets = ["الورقة1"] as const;
export const requiredWorkbookSheets = requiredVerbalWorkbookSheets;

type RawWorkbookSheet = { sheet: string; data: unknown[][] };
type SheetDefinition = {
  acceptedNames: readonly string[];
  answerIndex: number;
  headers: readonly string[];
  optionIndexes: readonly [number, number, number, number];
  topic: string;
  topicId: string;
  subtopic: string | null;
  subtopicId: string | null;
  subject: LegacyQuestionSubject;
};

const standardHeaders = ["رقم السؤال", "السؤال", "أ", "ب", "ج", "د", "الاجابة"] as const;
const sentenceCompletionHeaders = [
  "رقم السؤال", "السؤال", "الإجابة نص", "أ", "ب", "ج", "د", "الاجابة"
] as const;
const quantitativeHeaders = [
  "رقم السؤال", "السؤال", "أ", "ب", "ج", "د", "الصورة", "الإجابة"
] as const;

const verbalSheetDefinitions: Record<string, SheetDefinition | null> = {
  "بنك التناظر عام": {
    acceptedNames: ["بنك التناظر عام"], headers: standardHeaders,
    optionIndexes: [2, 3, 4, 5], answerIndex: 6,
    topic: "التناظر اللفظي", topicId: "verbal-analogy", subtopic: null, subtopicId: null,
    subject: "verbal"
  },
  "اكمال الجمل عام": {
    acceptedNames: ["اكمال الجمل عام"], headers: sentenceCompletionHeaders,
    optionIndexes: [3, 4, 5, 6], answerIndex: 7,
    topic: "إكمال الجمل", topicId: "sentence-completion", subtopic: null, subtopicId: null,
    subject: "verbal"
  },
  "الخطأ السياقي عام": {
    acceptedNames: ["الخطأ السياقي عام"], headers: standardHeaders,
    optionIndexes: [2, 3, 4, 5], answerIndex: 6,
    topic: "الخطأ السياقي", topicId: "contextual-error", subtopic: null, subtopicId: null,
    subject: "verbal"
  },
  "المفردة الشاذة عام": {
    acceptedNames: ["المفردة الشاذة عام"], headers: standardHeaders,
    optionIndexes: [2, 3, 4, 5], answerIndex: 6,
    topic: "المفردة الشاذة", topicId: "odd-word", subtopic: null, subtopicId: null,
    subject: "verbal"
  },
  "استيعاب المقروء عام": null
};

const createQuantitativeSheetDefinition = (
  topic: TopicDefinition
): SheetDefinition => ({
  acceptedNames: ["الورقة1"], headers: quantitativeHeaders,
  optionIndexes: [2, 3, 4, 5], answerIndex: 7,
  subject: "quantitative",
  subtopic: null,
  subtopicId: null,
  topic: topic.displayNameAr,
  topicId: topic.slug
});

const text = (value: unknown) => String(value ?? "").trim();
const isEmptyRow = (row: unknown[]) => row.every((cell) => text(cell) === "");
const inRange = (value: number, range: PageRange) => value >= range.from && value <= range.to;
const issue = (
  code: string,
  message: string,
  context: Omit<ImportValidationIssue, "code" | "message" | "severity"> = {}
): ImportValidationIssue => ({ code, message, severity: "error", ...context });

const maxWorkbookEntries = 2_000;
const maxWorkbookUnpackedBytes = 100 * 1024 * 1024;
const maxWorkbookEntryBytes = 50 * 1024 * 1024;
const maxWorkbookCompressionRatio = 500;

export const assertSafeWorkbookArchive = (excelBuffer: Buffer) => {
  let entryCount = 0;
  let unpackedBytes = 0;
  unzipSync(new Uint8Array(excelBuffer), {
    filter: (entry) => {
      entryCount += 1;
      unpackedBytes += entry.originalSize;
      const compressionRatio = entry.originalSize / Math.max(1, entry.size);
      if (
        entryCount > maxWorkbookEntries ||
        unpackedBytes > maxWorkbookUnpackedBytes ||
        entry.originalSize > maxWorkbookEntryBytes ||
        compressionRatio > maxWorkbookCompressionRatio
      ) {
        throw new Error("Excel archive exceeds safe unpacked resource limits.");
      }
      return false;
    }
  });
};

const validateHeader = (sheetName: string, actual: unknown[], expected: readonly string[]) => {
  const issues: ImportValidationIssue[] = [];
  expected.forEach((header, index) => {
    if (text(actual[index]) !== header) {
      issues.push(issue(
        "invalid_header",
        `العمود ${String.fromCharCode(65 + index)} في ورقة ${sheetName} يجب أن يكون "${header}".`,
        { rowNumber: 1, sheetName }
      ));
    }
  });
  if (actual.slice(expected.length).some((cell) => text(cell) !== "")) {
    issues.push(issue(
      "unexpected_columns",
      `ورقة ${sheetName} تحتوي على أعمدة غير متوقعة بعد العمود ${String.fromCharCode(64 + expected.length)}.`,
      { rowNumber: 1, sheetName }
    ));
  }
  return issues;
};

const potentialQuestionNumber = (value: unknown) => {
  const parsed = parseQuestionNumber(value);
  if (parsed !== null) return parsed;
  const match = /^\s*(\d+)/.exec(text(value));
  return match ? Number(match[1]) : null;
};

const normalizedSheetName = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const verbalTopicSheetNames: Record<string, readonly string[]> = {
  "verbal-analogy": ["بنك التناظر عام"],
  "sentence-completion": ["اكمال الجمل عام", "إكمال الجمل عام"],
  "contextual-error": ["الخطأ السياقي عام"],
  "odd-word": ["المفردة الشاذة عام"],
  "reading-comprehension": ["استيعاب المقروء عام", "استعياب المقروء عام"]
};

const hasSelectedQuestion = (sheet: RawWorkbookSheet, range?: PageRange) =>
  sheet.data.slice(1).some((row) => {
    const number = parseQuestionNumber(row[0]);
    return number !== null && (!range || inRange(number, range));
  });

const findVerbalDefinition = (sheetName: string) => {
  const normalized = normalizedSheetName(sheetName);
  for (const [topicId, names] of Object.entries(verbalTopicSheetNames)) {
    if (!names.some((name) => normalizedSheetName(name) === normalized)) continue;
    const canonicalName = names[0];
    const base = verbalSheetDefinitions[canonicalName] ?? null;
    if (!base) return { canonicalName, definition: null };
    const topic = topicTaxonomy.find((candidate) => candidate.slug === topicId);
    return {
      canonicalName,
      definition: topic
        ? { ...base, topic: topic.displayNameAr, topicId: topic.slug }
        : base
    };
  }
  return null;
};

const findQuantitativeTopic = (sheetName: string) => {
  const normalized = normalizedSheetName(sheetName);
  if (normalized === normalizedSheetName(requiredQuantitativeWorkbookSheets[0])) {
    return topicTaxonomy.find((topic) => topic.slug === "arithmetic") ?? null;
  }

  return (
    topicTaxonomy.find(
      (topic) =>
        topic.subject === "math" &&
        (normalized === normalizedSheetName(topic.slug) ||
          normalized.includes(normalizedSheetName(topic.displayNameAr)))
    ) ?? null
  );
};

const getSheetPlans = (sheets: RawWorkbookSheet[], questionRange?: PageRange) => {
  const recognized = sheets.flatMap((sheet) => {
    const verbal = findVerbalDefinition(sheet.sheet);
    if (verbal) return [{ ...verbal, sheet }];

    const quantitativeTopic = findQuantitativeTopic(sheet.sheet);
    if (quantitativeTopic) {
      return [{
        canonicalName: sheet.sheet,
        definition: createQuantitativeSheetDefinition(quantitativeTopic),
        sheet
      }];
    }
    return [];
  });
  const selected = recognized.filter((plan) =>
    hasSelectedQuestion(plan.sheet, questionRange)
  );
  return selected.length > 0 ? selected : recognized;
};

export const analyzeWorkbookSheets = (
  sheets: RawWorkbookSheet[],
  questionRange?: PageRange
): WorkbookAnalysis => {
  const issues: ImportValidationIssue[] = [];
  const questions: ParsedWorkbookQuestion[] = [];
  const seenQuestions = new Map<number, ParsedWorkbookQuestion>();
  const sheetPlans = getSheetPlans(sheets, questionRange);
  if (sheetPlans.length === 0) {
    issues.push(issue(
      "unrecognized_workbook_classification",
      "تعذر تحديد قسم وموضوع الأسئلة من أوراق ملف Excel."
    ));
  }
  const sheetSummary = sheetPlans.map(({ canonicalName, definition }) => ({
    sheetName: canonicalName,
    topic: definition?.topic ?? "",
    subtopic: definition?.subtopic ?? null,
    questionCount: 0
  }));

  for (const [sheetIndex, plan] of sheetPlans.entries()) {
    const { canonicalName: sheetName, definition, sheet } = plan;
    const data = Array.isArray(sheet.data) ? sheet.data : [];
    if (!definition) {
      const unsupportedRows = data.slice(1).filter((row) => {
        if (isEmptyRow(row)) return false;
        const questionNumber = parseQuestionNumber(row[0]);
        return !questionRange || (questionNumber !== null && inRange(questionNumber, questionRange));
      });
      if (unsupportedRows.length > 0) {
        issues.push(issue(
          "unsupported_reading_rows",
          "ورقة استيعاب المقروء عام يجب أن تكون فارغة في عقد الاستيراد الحالي.",
          { sheetName }
        ));
      }
      continue;
    }
    issues.push(...validateHeader(sheetName, data[0] ?? [], definition.headers));

    for (let rowIndex = 1; rowIndex < data.length; rowIndex += 1) {
      const row = data[rowIndex] ?? [];
      if (isEmptyRow(row)) continue;
      const rowNumber = rowIndex + 1;
      const questionNumber = parseQuestionNumber(row[0]);
      const possibleNumber = potentialQuestionNumber(row[0]);
      if (questionNumber === null) {
        if (possibleNumber !== null && questionRange && inRange(possibleNumber, questionRange)) {
          issues.push(issue("invalid_question_number", `رقم السؤال في الصف ${rowNumber} غير صالح.`, {
            questionNumber: possibleNumber, rowNumber, sheetName
          }));
        }
        continue;
      }
      if (questionRange && !inRange(questionNumber, questionRange)) continue;

      const rowIssues: ImportValidationIssue[] = [];
      const questionText = text(row[1]);
      const options = definition.optionIndexes.map((index) => text(row[index])) as [string, string, string, string];
      const correctAnswer = parseCorrectAnswer(row[definition.answerIndex]);
      if (!questionText) {
        rowIssues.push(issue("missing_question_text", `نص السؤال ${questionNumber} مفقود.`, {
          questionNumber, rowNumber, sheetName
        }));
      }
      options.forEach((option, optionIndex) => {
        if (!option) {
          rowIssues.push(issue(
            "missing_option",
            `الخيار ${["أ", "ب", "ج", "د"][optionIndex]} في السؤال ${questionNumber} مفقود.`,
            { questionNumber, rowNumber, sheetName }
          ));
        }
      });
      if (!correctAnswer) {
        rowIssues.push(issue("invalid_correct_answer", `الإجابة الصحيحة في السؤال ${questionNumber} غير صالحة.`, {
          questionNumber, rowNumber, sheetName
        }));
      }
      if (row.slice(definition.headers.length).some((cell) => text(cell) !== "")) {
        rowIssues.push(issue("unexpected_row_data", `السؤال ${questionNumber} يحتوي على بيانات بعد الأعمدة المعتمدة.`, {
          questionNumber, rowNumber, sheetName
        }));
      }

      const duplicate = seenQuestions.get(questionNumber);
      if (duplicate) {
        const duplicateIssue = issue(
          "duplicate_workbook_question",
          `رقم السؤال ${questionNumber} مكرر في الصف ${rowNumber} وظهر أولاً في الصف ${duplicate.rowNumber}.`,
          { questionNumber, rowNumber, sheetName }
        );
        duplicate.issues.push(duplicateIssue);
        issues.push(duplicateIssue);
        continue;
      }

      const parsed: ParsedWorkbookQuestion = {
        questionNumber, sheetName, rowNumber, questionText, options, correctAnswer,
        subject: definition.subject,
        topic: definition.topic, topicId: definition.topicId,
        subtopic: definition.subtopic, subtopicId: definition.subtopicId,
        issues: rowIssues
      };
      seenQuestions.set(questionNumber, parsed);
      questions.push(parsed);
      issues.push(...rowIssues);
      sheetSummary[sheetIndex].questionCount += 1;
    }
  }

  if (questionRange) {
    for (let questionNumber = questionRange.from; questionNumber <= questionRange.to; questionNumber += 1) {
      if (!seenQuestions.has(questionNumber)) {
        issues.push(issue(
          "missing_selected_question",
          `السؤال ${questionNumber} غير موجود في نطاق Excel المحدد.`,
          { questionNumber }
        ));
      }
    }
  }

  return {
    issues,
    questions: questions.sort((left, right) => left.questionNumber - right.questionNumber),
    sheetSummary
  };
};

export const readAdminWorkbook = async (
  excelBuffer: Buffer,
  questionRange?: PageRange
) => {
  assertSafeWorkbookArchive(excelBuffer);
  const sheets = (await readXlsxFile(excelBuffer)) as RawWorkbookSheet[];
  return analyzeWorkbookSheets(
    sheets,
    questionRange
  );
};

export const readArabicExcelRows = async (excelBuffer: Buffer): Promise<RawMetadataAdapterResult> => {
  assertSafeWorkbookArchive(excelBuffer);
  const sheets = (await readXlsxFile(excelBuffer)) as RawWorkbookSheet[];
  const sheet = sheets.find((item) => item.sheet === "بنك التناظر عام");
  if (!sheet) {
    return { rows: [], globalErrors: ['Required Excel sheet "بنك التناظر عام" was not found.'] };
  }
  return {
    rows: sheet.data.slice(1).map((row, index) => ({ rowNumber: index + 2, cells: row })),
    globalErrors: []
  };
};
