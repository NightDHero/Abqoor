import readXlsxFile from "read-excel-file/node";
import { parseCorrectAnswer, parseQuestionNumber } from "../question-format.mapper.js";
import type {
  ImportValidationIssue,
  ParsedWorkbookQuestion,
  RawMetadataAdapterResult,
  WorkbookAnalysis
} from "../importer.types.js";

export const requiredWorkbookSheets = [
  "بنك التناظر عام",
  "اكمال الجمل عام",
  "الخطأ السياقي عام",
  "المفردة الشاذة عام",
  "استعياب المقروء عام"
] as const;

type RawWorkbookSheet = {
  sheet: string;
  data: unknown[][];
};

const standardHeaders = [
  "رقم السؤال",
  "السؤال",
  "أ",
  "ب",
  "ج",
  "د",
  "الاجابة"
] as const;

const sentenceCompletionHeaders = [
  "رقم السؤال",
  "السؤال",
  "الإجابة نص",
  "أ",
  "ب",
  "ج",
  "د",
  "الاجابة"
] as const;

const sheetDefinitions = {
  "بنك التناظر عام": {
    headers: standardHeaders,
    optionIndexes: [2, 3, 4, 5] as const,
    answerIndex: 6,
    topic: "التناظر اللفظي",
    topicId: "verbal-analogy"
  },
  "اكمال الجمل عام": {
    headers: sentenceCompletionHeaders,
    optionIndexes: [3, 4, 5, 6] as const,
    answerIndex: 7,
    topic: "إكمال الجمل",
    topicId: "sentence-completion"
  },
  "الخطأ السياقي عام": {
    headers: standardHeaders,
    optionIndexes: [2, 3, 4, 5] as const,
    answerIndex: 6,
    topic: "الخطأ السياقي",
    topicId: "contextual-error"
  },
  "المفردة الشاذة عام": {
    headers: standardHeaders,
    optionIndexes: [2, 3, 4, 5] as const,
    answerIndex: 6,
    topic: "المفردة الشاذة",
    topicId: "odd-word-out"
  }
} as const;

const text = (value: unknown) => String(value ?? "").trim();
const isEmptyRow = (row: unknown[]) => row.every((cell) => text(cell) === "");

const issue = (
  code: string,
  message: string,
  context: Omit<ImportValidationIssue, "code" | "message" | "severity"> = {}
): ImportValidationIssue => ({ code, message, severity: "error", ...context });

const validateHeader = (
  sheetName: string,
  actual: unknown[],
  expected: readonly string[]
) => {
  const issues: ImportValidationIssue[] = [];

  expected.forEach((header, index) => {
    if (text(actual[index]) !== header) {
      issues.push(
        issue(
          "invalid_header",
          `العمود ${String.fromCharCode(65 + index)} في ورقة ${sheetName} يجب أن يكون "${header}".`,
          { rowNumber: 1, sheetName }
        )
      );
    }
  });

  if (actual.slice(expected.length).some((cell) => text(cell) !== "")) {
    issues.push(
      issue(
        "unexpected_columns",
        `ورقة ${sheetName} تحتوي على أعمدة غير متوقعة بعد العمود ${String.fromCharCode(64 + expected.length)}.`,
        { rowNumber: 1, sheetName }
      )
    );
  }

  return issues;
};

export const analyzeWorkbookSheets = (
  sheets: RawWorkbookSheet[]
): WorkbookAnalysis => {
  const issues: ImportValidationIssue[] = [];
  const questions: ParsedWorkbookQuestion[] = [];
  const seenQuestions = new Map<number, ParsedWorkbookQuestion>();

  if (sheets.length !== requiredWorkbookSheets.length) {
    issues.push(
      issue(
        "invalid_sheet_count",
        `يجب أن يحتوي ملف Excel على ${requiredWorkbookSheets.length} أوراق بالترتيب المعتمد، والموجود ${sheets.length}.`
      )
    );
  }

  requiredWorkbookSheets.forEach((expectedName, index) => {
    const actualName = sheets[index]?.sheet;
    if (actualName !== expectedName) {
      issues.push(
        issue(
          "invalid_sheet_order",
          `الورقة رقم ${index + 1} يجب أن تكون "${expectedName}"${actualName ? ` وليست "${actualName}"` : " وهي مفقودة"}.`,
          { sheetName: expectedName }
        )
      );
    }
  });

  const sheetSummary = requiredWorkbookSheets.map((sheetName) => ({
    sheetName,
    questionCount: 0
  }));

  for (const [sheetIndex, sheetName] of requiredWorkbookSheets.entries()) {
    const sheet = sheets.find((candidate) => candidate.sheet === sheetName);
    if (!sheet) {
      continue;
    }

    const data = Array.isArray(sheet.data) ? sheet.data : [];
    const rows = data.slice(1);
    const lastPopulatedIndex = rows.reduce(
      (last, row, index) => (!isEmptyRow(row) ? index : last),
      -1
    );

    if (sheetName === "استعياب المقروء عام") {
      if (lastPopulatedIndex >= 0) {
        issues.push(
          issue(
            "unsupported_reading_rows",
            "ورقة استعياب المقروء عام يجب أن تكون فارغة في عقد الاستيراد الحالي.",
            { sheetName }
          )
        );
      }
      continue;
    }

    const definition = sheetDefinitions[sheetName];
    issues.push(...validateHeader(sheetName, data[0] ?? [], definition.headers));

    for (let rowIndex = 0; rowIndex <= lastPopulatedIndex; rowIndex += 1) {
      const row = rows[rowIndex] ?? [];
      const rowNumber = rowIndex + 2;

      if (isEmptyRow(row)) {
        issues.push(
          issue("empty_row", `الصف ${rowNumber} في ورقة ${sheetName} فارغ بين صفوف البيانات.`, {
            rowNumber,
            sheetName
          })
        );
        continue;
      }

      const questionNumber = parseQuestionNumber(row[0]);
      if (questionNumber === null) {
        issues.push(
          issue("invalid_question_number", `رقم السؤال في الصف ${rowNumber} غير صالح.`, {
            rowNumber,
            sheetName
          })
        );
        continue;
      }

      const rowIssues: ImportValidationIssue[] = [];
      const questionText = text(row[1]);
      const options = definition.optionIndexes.map((index) => text(row[index])) as [
        string,
        string,
        string,
        string
      ];
      const correctAnswer = parseCorrectAnswer(row[definition.answerIndex]);

      if (!questionText) {
        rowIssues.push(
          issue("missing_question_text", `نص السؤال ${questionNumber} مفقود.`, {
            questionNumber,
            rowNumber,
            sheetName
          })
        );
      }

      options.forEach((option, optionIndex) => {
        if (!option) {
          rowIssues.push(
            issue(
              "missing_option",
              `الخيار ${["أ", "ب", "ج", "د"][optionIndex]} في السؤال ${questionNumber} مفقود.`,
              { questionNumber, rowNumber, sheetName }
            )
          );
        }
      });

      if (!correctAnswer) {
        rowIssues.push(
          issue("invalid_correct_answer", `الإجابة الصحيحة في السؤال ${questionNumber} غير صالحة.`, {
            questionNumber,
            rowNumber,
            sheetName
          })
        );
      }

      if (row.slice(definition.headers.length).some((cell) => text(cell) !== "")) {
        rowIssues.push(
          issue("unexpected_row_data", `السؤال ${questionNumber} يحتوي على بيانات بعد الأعمدة المعتمدة.`, {
            questionNumber,
            rowNumber,
            sheetName
          })
        );
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
        questionNumber,
        sheetName,
        rowNumber,
        questionText,
        options,
        correctAnswer,
        topic: definition.topic,
        topicId: definition.topicId,
        issues: rowIssues
      };

      seenQuestions.set(questionNumber, parsed);
      questions.push(parsed);
      issues.push(...rowIssues);
      sheetSummary[sheetIndex].questionCount += 1;
    }
  }

  return {
    issues,
    questions: questions.sort((left, right) => left.questionNumber - right.questionNumber),
    sheetSummary
  };
};

export const readAdminWorkbook = async (excelBuffer: Buffer) => {
  const sheets = (await readXlsxFile(excelBuffer)) as RawWorkbookSheet[];
  return analyzeWorkbookSheets(sheets);
};

export const readArabicExcelRows = async (
  excelBuffer: Buffer
): Promise<RawMetadataAdapterResult> => {
  const sheets = (await readXlsxFile(excelBuffer)) as RawWorkbookSheet[];
  const sheet = sheets.find((item) => item.sheet === "بنك التناظر عام");

  if (!sheet) {
    return {
      rows: [],
      globalErrors: ['Required Excel sheet "بنك التناظر عام" was not found.']
    };
  }

  return {
    rows: sheet.data.slice(1).map((row, index) => ({
      rowNumber: index + 2,
      cells: row
    })),
    globalErrors: []
  };
};
