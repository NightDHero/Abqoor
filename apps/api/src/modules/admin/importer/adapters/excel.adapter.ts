import readXlsxFile from "read-excel-file/node";
import { parseCorrectAnswer, parseQuestionNumber } from "../question-format.mapper.js";
import type {
  ImportValidationIssue,
  PageRange,
  ParsedWorkbookQuestion,
  QuestionBankType,
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
    topic: "التناظر اللفظي", topicId: "verbal-analogy"
  },
  "اكمال الجمل عام": {
    acceptedNames: ["اكمال الجمل عام"], headers: sentenceCompletionHeaders,
    optionIndexes: [3, 4, 5, 6], answerIndex: 7,
    topic: "إكمال الجمل", topicId: "sentence-completion"
  },
  "الخطأ السياقي عام": {
    acceptedNames: ["الخطأ السياقي عام"], headers: standardHeaders,
    optionIndexes: [2, 3, 4, 5], answerIndex: 6,
    topic: "الخطأ السياقي", topicId: "contextual-error"
  },
  "المفردة الشاذة عام": {
    acceptedNames: ["المفردة الشاذة عام"], headers: standardHeaders,
    optionIndexes: [2, 3, 4, 5], answerIndex: 6,
    topic: "المفردة الشاذة", topicId: "odd-word-out"
  },
  "استيعاب المقروء عام": null
};

const quantitativeSheetDefinition: SheetDefinition = {
  acceptedNames: ["الورقة1"], headers: quantitativeHeaders,
  optionIndexes: [2, 3, 4, 5], answerIndex: 7,
  topic: "الكمي", topicId: "quantitative"
};

const text = (value: unknown) => String(value ?? "").trim();
const isEmptyRow = (row: unknown[]) => row.every((cell) => text(cell) === "");
const inRange = (value: number, range: PageRange) => value >= range.from && value <= range.to;
const issue = (
  code: string,
  message: string,
  context: Omit<ImportValidationIssue, "code" | "message" | "severity"> = {}
): ImportValidationIssue => ({ code, message, severity: "error", ...context });

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

const validateWorkbookStructure = (sheets: RawWorkbookSheet[], excelType: QuestionBankType) => {
  const issues: ImportValidationIssue[] = [];
  const expectedNames = excelType === "verbal"
    ? requiredVerbalWorkbookSheets
    : requiredQuantitativeWorkbookSheets;
  if (sheets.length !== expectedNames.length) {
    issues.push(issue(
      "invalid_sheet_count",
      `يجب أن يحتوي ملف Excel على ${expectedNames.length} ${expectedNames.length === 1 ? "ورقة" : "أوراق"} بالترتيب المعتمد، والموجود ${sheets.length}.`
    ));
  }
  expectedNames.forEach((expectedName, index) => {
    const actualName = sheets[index]?.sheet;
    const acceptedNames = expectedName === "استيعاب المقروء عام"
      ? [expectedName, "استعياب المقروء عام"]
      : [expectedName];
    if (!actualName || !acceptedNames.includes(actualName)) {
      issues.push(issue(
        "invalid_sheet_order",
        `الورقة رقم ${index + 1} يجب أن تكون "${expectedName}"${actualName ? ` وليست "${actualName}"` : " وهي مفقودة"}.`,
        { sheetName: expectedName }
      ));
    }
  });
  return issues;
};

const getSheetPlans = (sheets: RawWorkbookSheet[], excelType: QuestionBankType) => {
  if (excelType === "quantitative") {
    return [{
      canonicalName: requiredQuantitativeWorkbookSheets[0],
      definition: quantitativeSheetDefinition,
      sheet: sheets.find((candidate) => quantitativeSheetDefinition.acceptedNames.includes(candidate.sheet))
    }];
  }
  return requiredVerbalWorkbookSheets.map((canonicalName) => {
    const definition = verbalSheetDefinitions[canonicalName];
    const acceptedNames = canonicalName === "استيعاب المقروء عام"
      ? [canonicalName, "استعياب المقروء عام"]
      : definition?.acceptedNames ?? [canonicalName];
    return {
      canonicalName,
      definition,
      sheet: sheets.find((candidate) => acceptedNames.includes(candidate.sheet))
    };
  });
};

export const analyzeWorkbookSheets = (
  sheets: RawWorkbookSheet[],
  excelType: QuestionBankType = "verbal",
  questionRange?: PageRange
): WorkbookAnalysis => {
  const issues = validateWorkbookStructure(sheets, excelType);
  const questions: ParsedWorkbookQuestion[] = [];
  const seenQuestions = new Map<number, ParsedWorkbookQuestion>();
  const sheetPlans = getSheetPlans(sheets, excelType);
  const sheetSummary = sheetPlans.map(({ canonicalName }) => ({ sheetName: canonicalName, questionCount: 0 }));

  for (const [sheetIndex, plan] of sheetPlans.entries()) {
    const { canonicalName: sheetName, definition, sheet } = plan;
    if (!sheet) continue;
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
        topic: definition.topic, topicId: definition.topicId, issues: rowIssues
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
  excelType: QuestionBankType = "verbal",
  questionRange?: PageRange
) => {
  const sheets = (await readXlsxFile(excelBuffer)) as RawWorkbookSheet[];
  return analyzeWorkbookSheets(sheets, excelType, questionRange);
};

export const readArabicExcelRows = async (excelBuffer: Buffer): Promise<RawMetadataAdapterResult> => {
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
