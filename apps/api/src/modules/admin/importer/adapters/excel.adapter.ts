import readXlsxFile from "read-excel-file/node";
import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";
import { posix } from "node:path";
import {
  topicTaxonomy,
  type LegacyQuestionSubject,
  type TopicDefinition
} from "../../../learning-taxonomy/taxonomy.js";
import { parseCorrectAnswer, parseQuestionNumber } from "../question-format.mapper.js";
import type {
  ImportValidationIssue,
  EmbeddedWorkbookImage,
  PageRange,
  ParsedWorkbookQuestion,
  QuestionImportType,
  RawMetadataAdapterResult,
  WorkbookAnalysis,
  WorkbookColumnMapping,
  WorkbookDiagnosticRow
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

type RawWorkbookSheet = {
  sheet: string;
  data: unknown[][];
  comments?: Map<string, string>;
  embeddedImages?: Map<number, EmbeddedWorkbookImage[]>;
};
type HeaderExpectation = string | readonly string[] | null;
type SheetDefinition = {
  acceptedNames: readonly string[];
  additionalCategoryIndex?: number;
  answerIndex: number;
  answerTextIndex?: number;
  bankGroupIndex?: number;
  categoryIndex?: number;
  comparisonImageIndexes?: readonly number[];
  comparisonOperandIndexes?: readonly number[];
  difficultyIndex?: number;
  format: "compact" | "quantitative-wide" | "quantitative-extended" | "quantitative-bank-first" | "quantitative-a-r" | "verbal-detail" | "reading";
  headers: readonly HeaderExpectation[];
  imageIndex?: number;
  imageIndicatorIndex?: number;
  internalIdentifierIndexes?: readonly number[];
  optionIndexes: readonly [number, number, number, number];
  passageIndex?: number;
  sectionDetectionSource?: "structure" | "worksheet-name";
  sourceIdentifierIndexes?: readonly [number, number, number];
  topic: string;
  topicId: string;
  topicSource?: "fixed-contract" | "worksheet-name" | "column" | "missing";
  subtopic: string | null;
  subtopicId: string | null;
  subject: LegacyQuestionSubject;
  questionNumberIndex: number | null;
  questionNumberStrategy?: "cell" | "data-row";
  questionTextIndex: number;
  scopeToFirstBankGroup?: boolean;
  subtopicIndex?: number;
  subtopicSource?: "column" | "fixed-contract" | null;
};

const answerHeader = ["الاجابة", "الإجابة"] as const;
const standardHeaders = ["رقم السؤال", "السؤال", "أ", "ب", "ج", "د", answerHeader] as const;
const sentenceCompletionHeaders = [
  "السؤال", "الإجابة نص", "أ", "ب", "ج", "د", answerHeader
] as const;
const numberedSentenceCompletionHeaders = [
  "رقم السؤال", "الإجابة نص", "أ", "ب", "ج", "د", answerHeader
] as const;
const legacySentenceCompletionHeaders = [
  "رقم السؤال", "السؤال", "الإجابة نص", "أ", "ب", "ج", "د", answerHeader
] as const;
const oddWordHeaders = [
  "رقم السؤال", "أ", "ب", "ج", "د", answerHeader, "الإجابة نص", "السؤال"
] as const;
const readingHeaders = [
  "رقم السؤال", "النص", "السؤال", "أ", "ب", "ج", "د", answerHeader
] as const;
const quantitativeHeaders = [
  "رقم السؤال", "السؤال", "أ", "ب", "ج", "د", "الصورة", "الإجابة"
] as const;
const quantitativeWideHeaders = [
  "المقارنة ١", "المقارنة ٢", "أ", "ب", "ج", "د", "السؤال", "رقم السؤال",
  "النموذج", "الصورة", "هل صعوبة الدقة في السؤال", "فئة إضافية", "الإجابة",
  "صورة مقارنة ١", "صورة مقارنة ٢", "صورة مقارنة ٣", "الوزن", "الفصل"
] as const;
const quantitativeExtendedHeaders = [
  ["رقم البنك", "رقم القسم", "القسم", "البنك"],
  null,
  null,
  "السؤال",
  ["المقارنة أ", "المقارنة ١"],
  "أ",
  "ب",
  "ج",
  null,
  "د",
  "الصورة",
  null,
  "صعوبة",
  ["فئة السؤال", "الفئة"],
  "فئة إضافية",
  answerHeader,
  ["صورة مقارنة ١", "صورة المقارنة ١"],
  ["صورة مقارنة ٢", "صورة المقارنة ٢"],
  null,
  null,
  null,
  null,
  null,
  null,
  null
] as const satisfies readonly HeaderExpectation[];
const quantitativeBankFirstHeaders = [
  ["البنك", "رقم البنك"],
  "رقم السؤال",
  null,
  "السؤال",
  ["المقارنة أ", "المقارنة ١"],
  ["المقارنة ب", "المقارنة ٢"],
  "أ",
  "ب",
  "ج",
  "د",
  "الصورة",
  ["هل يحتاج صوره؟", "هل يحتاج صورة؟", "نعم / لا"],
  ["صعوبة السؤال", "صعوبة"],
  ["فئة السؤال", "الفئة"],
  ["فئة اضافية", "فئة إضافية"],
  answerHeader,
  ["صورة مقارنة أ", "صورة مقارنة ١"],
  ["صورة مقارنة ب", "صورة مقارنة ٢"]
] as const satisfies readonly HeaderExpectation[];
const quantitativeArHeaders = [
  null,
  null,
  null,
  "السؤال",
  ["المقارنة أ", "المقارنة ١"],
  ["المقارنة ب", "المقارنة ٢"],
  "أ",
  "ب",
  "ج",
  "د",
  "الصورة",
  null,
  ["صعوبة السؤال", "صعوبة"],
  ["فئة السؤال", "الفئة"],
  ["فئة اضافية", "فئة إضافية"],
  answerHeader,
  ["صورة مقارنة أ", "صورة مقارنة ١", "صورة المقارنة ١"],
  ["صورة مقارنة ب", "صورة مقارنة ٢", "صورة المقارنة ٢"]
] as const satisfies readonly HeaderExpectation[];

const verbalSheetDefinitions: Record<string, SheetDefinition[]> = {
  "verbal-analogy": [{
    acceptedNames: ["بنك التناظر عام"], headers: standardHeaders,
    optionIndexes: [2, 3, 4, 5], answerIndex: 6,
    topic: "التناظر اللفظي", topicId: "verbal-analogy", subtopic: null, subtopicId: null,
    subject: "verbal", questionNumberIndex: 0, questionTextIndex: 1, format: "compact"
  }],
  "sentence-completion": [{
    acceptedNames: ["اكمال الجمل عام"], headers: sentenceCompletionHeaders,
    optionIndexes: [2, 3, 4, 5], answerIndex: 6, answerTextIndex: 1,
    topic: "إكمال الجمل", topicId: "sentence-completion", subtopic: null, subtopicId: null,
    subject: "verbal", questionNumberIndex: null, questionNumberStrategy: "data-row", questionTextIndex: 0, format: "verbal-detail"
  }, {
    acceptedNames: ["اكمال الجمل عام"], headers: numberedSentenceCompletionHeaders,
    optionIndexes: [2, 3, 4, 5], answerIndex: 6, answerTextIndex: 1,
    topic: "إكمال الجمل", topicId: "sentence-completion", subtopic: null, subtopicId: null,
    subject: "verbal", questionNumberIndex: 0, questionTextIndex: 1, format: "verbal-detail"
  }, {
    acceptedNames: ["اكمال الجمل عام"], headers: legacySentenceCompletionHeaders,
    optionIndexes: [3, 4, 5, 6], answerIndex: 7, answerTextIndex: 2,
    topic: "إكمال الجمل", topicId: "sentence-completion", subtopic: null, subtopicId: null,
    subject: "verbal", questionNumberIndex: 0, questionTextIndex: 1, format: "verbal-detail"
  }],
  "contextual-error": [{
    acceptedNames: ["الخطأ السياقي عام", "المفردة الخاطئة عام"], headers: sentenceCompletionHeaders,
    optionIndexes: [2, 3, 4, 5], answerIndex: 6, answerTextIndex: 1,
    topic: "الخطأ السياقي", topicId: "contextual-error", subtopic: null, subtopicId: null,
    subject: "verbal", questionNumberIndex: null, questionNumberStrategy: "data-row", questionTextIndex: 0, format: "verbal-detail"
  }, {
    acceptedNames: ["الخطأ السياقي عام", "المفردة الخاطئة عام"], headers: standardHeaders,
    optionIndexes: [2, 3, 4, 5], answerIndex: 6,
    topic: "الخطأ السياقي", topicId: "contextual-error", subtopic: null, subtopicId: null,
    subject: "verbal", questionNumberIndex: 0, questionTextIndex: 1, format: "compact"
  }],
  "odd-word": [{
    acceptedNames: ["المفردة الشاذة عام", "المفردة المختلفة عام"], headers: oddWordHeaders,
    optionIndexes: [1, 2, 3, 4], answerIndex: 5, answerTextIndex: 6,
    topic: "المفردة الشاذة", topicId: "odd-word", subtopic: null, subtopicId: null,
    subject: "verbal", questionNumberIndex: 0, questionTextIndex: 7, format: "verbal-detail"
  }, {
    acceptedNames: ["المفردة الشاذة عام", "المفردة المختلفة عام"], headers: standardHeaders,
    optionIndexes: [2, 3, 4, 5], answerIndex: 6,
    topic: "المفردة الشاذة", topicId: "odd-word", subtopic: null, subtopicId: null,
    subject: "verbal", questionNumberIndex: 0, questionTextIndex: 1, format: "compact"
  }],
  "reading-comprehension": [{
    acceptedNames: ["استيعاب المقروء عام", "استعياب المقروء عام"], headers: readingHeaders,
    optionIndexes: [3, 4, 5, 6], answerIndex: 7, passageIndex: 1,
    topic: "استيعاب المقروء", topicId: "reading-comprehension", subtopic: null, subtopicId: null,
    subject: "verbal", questionNumberIndex: 0, questionTextIndex: 2, format: "reading"
  }]
};

const createQuantitativeSheetDefinition = (
  topic: TopicDefinition
): SheetDefinition => ({
  acceptedNames: ["الورقة1"], headers: quantitativeHeaders,
  optionIndexes: [2, 3, 4, 5], answerIndex: 7,
  subject: "quantitative",
  sectionDetectionSource: "structure",
  subtopic: null,
  subtopicId: null,
  topic: topic.displayNameAr,
  topicId: topic.slug,
  topicSource: "fixed-contract",
  questionNumberIndex: 0,
  questionTextIndex: 1,
  format: "compact"
});

const createTopicStandardDefinition = (
  topic: TopicDefinition
): SheetDefinition => ({
  acceptedNames: [],
  answerIndex: 6,
  format: "compact",
  headers: standardHeaders,
  optionIndexes: [2, 3, 4, 5],
  questionNumberIndex: 0,
  questionTextIndex: 1,
  sectionDetectionSource: "worksheet-name",
  subject: "quantitative",
  subtopic: null,
  subtopicId: null,
  topic: topic.displayNameAr,
  topicId: topic.slug,
  topicSource: "worksheet-name"
});

const createWideQuantitativeDefinition = (
  topic: TopicDefinition | null
): SheetDefinition => ({
  acceptedNames: [],
  answerIndex: 12,
  headers: quantitativeWideHeaders,
  optionIndexes: [2, 3, 4, 5],
  topic: topic?.displayNameAr ?? "",
  topicId: topic?.slug ?? "",
  subtopic: null,
  subtopicId: null,
  subject: "quantitative",
  sectionDetectionSource: "structure",
  questionNumberIndex: 7,
  questionTextIndex: 6,
  format: "quantitative-wide",
  topicSource: topic ? "worksheet-name" : "column"
});

const createExtendedQuantitativeDefinition = (
  topic: TopicDefinition | null
): SheetDefinition => ({
  acceptedNames: [],
  answerIndex: 15,
  bankGroupIndex: 0,
  categoryIndex: 13,
  comparisonImageIndexes: [16, 17],
  comparisonOperandIndexes: [4],
  difficultyIndex: 12,
  format: "quantitative-extended",
  headers: quantitativeExtendedHeaders,
  imageIndex: 10,
  internalIdentifierIndexes: [1, 2, 18, 19, 20, 21, 22, 23, 24],
  optionIndexes: [5, 6, 7, 9],
  questionNumberIndex: 22,
  questionTextIndex: 3,
  subject: "quantitative",
  sectionDetectionSource: "structure",
  subtopic: null,
  subtopicId: null,
  subtopicIndex: 14,
  topic: topic?.displayNameAr ?? "",
  topicId: topic?.slug ?? "",
  topicSource: topic ? "worksheet-name" : "column"
});

const createBankFirstQuantitativeDefinition = (
  topic: TopicDefinition | null,
  headerLength: number
): SheetDefinition => ({
  acceptedNames: [],
  additionalCategoryIndex: 14,
  answerIndex: 15,
  bankGroupIndex: 0,
  comparisonImageIndexes: [16, 17],
  comparisonOperandIndexes: [4, 5],
  difficultyIndex: 12,
  format: "quantitative-bank-first",
  headers: [
    ...quantitativeBankFirstHeaders,
    ...Array.from(
      { length: Math.max(0, headerLength - quantitativeBankFirstHeaders.length) },
      () => null
    )
  ],
  imageIndex: 10,
  imageIndicatorIndex: 11,
  optionIndexes: [6, 7, 8, 9],
  questionNumberIndex: 1,
  questionTextIndex: 3,
  scopeToFirstBankGroup: true,
  subject: "quantitative",
  sectionDetectionSource: "structure",
  sourceIdentifierIndexes: [0, 1, 2],
  subtopic: null,
  subtopicId: null,
  subtopicIndex: 13,
  subtopicSource: "column",
  topic: topic?.displayNameAr ?? "",
  topicId: topic?.slug ?? "",
  topicSource: topic ? "worksheet-name" : "missing"
});

const createAuthoritativeArDefinition = (
  topic: TopicDefinition | null,
  questionNumberIndex: number
): SheetDefinition => ({
  acceptedNames: [],
  additionalCategoryIndex: 14,
  answerIndex: 15,
  comparisonImageIndexes: [16, 17],
  comparisonOperandIndexes: [4, 5],
  difficultyIndex: 12,
  format: "quantitative-a-r",
  headers: quantitativeArHeaders,
  imageIndex: 10,
  imageIndicatorIndex: 10,
  internalIdentifierIndexes: [0, 1, 2],
  optionIndexes: [6, 7, 8, 9],
  questionNumberIndex,
  questionTextIndex: 3,
  sectionDetectionSource: "structure",
  sourceIdentifierIndexes: [0, 1, 2],
  subject: "quantitative",
  subtopic: null,
  subtopicId: null,
  subtopicIndex: 13,
  subtopicSource: "column",
  topic: topic?.displayNameAr ?? "",
  topicId: topic?.slug ?? "",
  topicSource: topic ? "worksheet-name" : "missing"
});

const text = (value: unknown) => String(value ?? "").trim();
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
const xmlParser = new XMLParser({ ignoreAttributes: false });
const xmlDecoder = new TextDecoder();

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const collectXmlText = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";
  return Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !key.startsWith("@_"))
    .map(([, child]) => Array.isArray(child)
      ? child.map(collectXmlText).join("")
      : collectXmlText(child))
    .join("");
};

const relationshipMap = (xml: unknown) => {
  if (!xml || typeof xml !== "object") return new Map<string, string>();
  const relationships = (xml as {
    Relationships?: { Relationship?: unknown };
  }).Relationships?.Relationship;
  return new Map(
    asArray(relationships as Record<string, unknown> | Record<string, unknown>[] | undefined)
      .map((relationship) => [
        String(relationship["@_Id"] ?? ""),
        String(relationship["@_Target"] ?? "")
      ] as const)
      .filter(([id, target]) => id && target)
  );
};

export const extractWorkbookComments = (excelBuffer: Buffer) => {
  const archive = unzipSync(new Uint8Array(excelBuffer));
  const readXml = (path: string) => archive[path]
    ? xmlParser.parse(xmlDecoder.decode(archive[path])) as unknown
    : null;
  const workbook = readXml("xl/workbook.xml") as {
    workbook?: { sheets?: { sheet?: unknown } };
  } | null;
  const workbookRelationships = relationshipMap(
    readXml("xl/_rels/workbook.xml.rels")
  );
  const result = new Map<string, Map<string, string>>();

  for (const sheet of asArray(
    workbook?.workbook?.sheets?.sheet as Record<string, unknown> | Record<string, unknown>[] | undefined
  )) {
    const name = String(sheet["@_name"] ?? "");
    const relationshipId = String(sheet["@_r:id"] ?? "");
    const target = workbookRelationships.get(relationshipId);
    if (!name || !target) continue;
    const sheetPath = target.startsWith("/")
      ? target.slice(1)
      : posix.normalize(posix.join("xl", target));
    const relationshipPath = posix.join(
      posix.dirname(sheetPath),
      "_rels",
      `${posix.basename(sheetPath)}.rels`
    );
    const sheetRelationships = relationshipMap(readXml(relationshipPath));
    const comments = new Map<string, string>();

    for (const commentTarget of sheetRelationships.values()) {
      if (!commentTarget.toLowerCase().includes("comment")) continue;
      const commentPath = commentTarget.startsWith("/")
        ? commentTarget.slice(1)
        : posix.normalize(posix.join(posix.dirname(sheetPath), commentTarget));
      const document = readXml(commentPath) as Record<string, unknown> | null;
      if (!document) continue;
      const root = (document.comments ?? document.ThreadedComments) as
        | { commentList?: { comment?: unknown }; threadedComment?: unknown }
        | undefined;
      const nodes = root?.commentList?.comment ?? root?.threadedComment;
      for (const comment of asArray(
        nodes as Record<string, unknown> | Record<string, unknown>[] | undefined
      )) {
        const reference = String(comment["@_ref"] ?? "");
        const content = collectXmlText(comment.text ?? comment["#text"] ?? "").trim();
        if (reference && content) comments.set(reference, content);
      }
    }
    if (comments.size > 0) result.set(name, comments);
  }

  return result;
};

const drawingXmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true
});

const mediaTypeForWorkbookImage = (filename: string) => {
  const extension = posix.extname(filename).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "application/octet-stream";
};

const resolveOoxmlTarget = (partPath: string, target: string) =>
  target.startsWith("/")
    ? target.slice(1)
    : posix.normalize(posix.join(posix.dirname(partPath), target));

export const extractWorkbookEmbeddedImages = (excelBuffer: Buffer) => {
  const archive = unzipSync(new Uint8Array(excelBuffer));
  const imageBuffers = new Map<string, Buffer>();
  const readXml = (path: string, parser = xmlParser) => archive[path]
    ? parser.parse(xmlDecoder.decode(archive[path])) as unknown
    : null;
  const workbook = readXml("xl/workbook.xml") as {
    workbook?: { sheets?: { sheet?: unknown } };
  } | null;
  const workbookRelationships = relationshipMap(
    readXml("xl/_rels/workbook.xml.rels")
  );
  const result = new Map<string, Map<number, EmbeddedWorkbookImage[]>>();

  for (const sheet of asArray(
    workbook?.workbook?.sheets?.sheet as Record<string, unknown> | Record<string, unknown>[] | undefined
  )) {
    const sheetName = String(sheet["@_name"] ?? "");
    const relationshipId = String(sheet["@_r:id"] ?? "");
    const sheetTarget = workbookRelationships.get(relationshipId);
    if (!sheetName || !sheetTarget) continue;

    const sheetPath = sheetTarget.startsWith("/")
      ? sheetTarget.slice(1)
      : posix.normalize(posix.join("xl", sheetTarget));
    const sheetRelationshipPath = posix.join(
      posix.dirname(sheetPath),
      "_rels",
      `${posix.basename(sheetPath)}.rels`
    );
    const sheetRelationships = relationshipMap(readXml(sheetRelationshipPath));
    const drawingTarget = [...sheetRelationships.values()].find((target) =>
      target.toLowerCase().includes("drawing")
    );
    if (!drawingTarget) continue;

    const drawingPath = resolveOoxmlTarget(sheetPath, drawingTarget);
    const drawingRelationshipPath = posix.join(
      posix.dirname(drawingPath),
      "_rels",
      `${posix.basename(drawingPath)}.rels`
    );
    const drawingRelationships = relationshipMap(readXml(drawingRelationshipPath));
    const drawingDocument = readXml(drawingPath, drawingXmlParser) as {
      wsDr?: {
        oneCellAnchor?: unknown;
        twoCellAnchor?: unknown;
      };
    } | null;
    const anchors = [
      ...asArray(drawingDocument?.wsDr?.oneCellAnchor as Record<string, unknown> | Record<string, unknown>[] | undefined),
      ...asArray(drawingDocument?.wsDr?.twoCellAnchor as Record<string, unknown> | Record<string, unknown>[] | undefined)
    ];
    const imagesByRow = new Map<number, EmbeddedWorkbookImage[]>();

    for (const anchor of anchors) {
      const from = anchor.from as { col?: unknown; row?: unknown } | undefined;
      const pic = anchor.pic as {
        blipFill?: { blip?: Record<string, unknown> };
        nvPicPr?: { cNvPr?: Record<string, unknown> };
      } | undefined;
      const relationship = pic?.blipFill?.blip;
      const embeddedRelationshipId = String(
        relationship?.["@_r:embed"] ?? relationship?.["@_embed"] ?? ""
      );
      const imageTarget = drawingRelationships.get(embeddedRelationshipId);
      const rowIndex = Number(from?.row);
      const columnIndex = Number(from?.col);
      if (!imageTarget || !Number.isInteger(rowIndex) || !Number.isInteger(columnIndex)) {
        continue;
      }

      const imagePath = resolveOoxmlTarget(drawingPath, imageTarget);
      const bytes = archive[imagePath];
      if (!bytes) continue;
      let imageBuffer = imageBuffers.get(imagePath);
      if (!imageBuffer) {
        imageBuffer = Buffer.from(bytes);
        imageBuffers.set(imagePath, imageBuffer);
      }
      const filename = String(
        pic?.nvPicPr?.cNvPr?.["@_name"] ?? posix.basename(imagePath)
      );
      const rowNumber = rowIndex + 1;
      const image: EmbeddedWorkbookImage = {
        buffer: imageBuffer,
        columnIndex,
        filename,
        mediaType: mediaTypeForWorkbookImage(filename),
        rowNumber,
        sheetName
      };
      imagesByRow.set(rowNumber, [...(imagesByRow.get(rowNumber) ?? []), image]);
    }

    if (imagesByRow.size > 0) result.set(sheetName, imagesByRow);
  }

  return result;
};

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

const headerMatches = (actual: unknown, expected: HeaderExpectation) => {
  if (expected === null) return true;
  const accepted = typeof expected === "string" ? [expected] : expected;
  return accepted.some(
    (value) => normalizedHeader(actual) === normalizedHeader(value)
  );
};

const validateHeader = (sheetName: string, actual: unknown[], expected: readonly HeaderExpectation[]) => {
  const issues: ImportValidationIssue[] = [];
  expected.forEach((header, index) => {
    if (!headerMatches(actual[index], header)) {
      const label = header === null
        ? "بيانات تقنية"
        : typeof header === "string"
          ? header
          : header.join(" أو ");
      issues.push(issue(
        "invalid_header",
        `العمود ${String.fromCharCode(65 + index)} في ورقة ${sheetName} يجب أن يكون "${label}".`,
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

const normalizedArabicText = (value: unknown) => text(value)
  .normalize("NFKC")
  .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
  .replace(/[أإآ]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/\s+/g, " ")
  .toLowerCase();
const normalizedSheetName = (value: string) => normalizedArabicText(value);
const normalizedHeader = (value: unknown) => normalizedArabicText(value);
const isWideQuantitativeSheet = (sheet: RawWorkbookSheet) =>
  quantitativeWideHeaders.every(
    (header, index) => normalizedHeader(sheet.data[0]?.[index]) === normalizedHeader(header)
  );
const isExtendedQuantitativeSheet = (sheet: RawWorkbookSheet) => {
  const header = sheet.data[0] ?? [];
  return [3, 5, 6, 7, 9, 10, 12, 13, 14, 15].every((index) =>
    headerMatches(header[index], quantitativeExtendedHeaders[index] ?? null)
  ) && header.length >= quantitativeExtendedHeaders.length;
};
const isBankFirstQuantitativeSheet = (sheet: RawWorkbookSheet) => {
  const header = sheet.data[0] ?? [];
  return header.length >= quantitativeBankFirstHeaders.length &&
    quantitativeBankFirstHeaders.every((expected, index) =>
      headerMatches(header[index], expected)
    );
};
const isAuthoritativeArQuantitativeSheet = (sheet: RawWorkbookSheet) => {
  const header = sheet.data[0] ?? [];
  return header.length >= quantitativeArHeaders.length &&
    quantitativeArHeaders.every((expected, index) =>
      headerMatches(header[index], expected)
    );
};

const findRangeIdentifierIndex = (
  sheet: RawWorkbookSheet,
  range?: PageRange
) => {
  const candidates = [0, 1, 2].map((index) => {
    const values = sheet.data.slice(1)
      .map((row) => parseQuestionNumber(row[index]))
      .filter((value): value is number => value !== null && (!range || inRange(value, range)));
    const uniqueValues = new Set(values);
    const expectedCoverage = range
      ? Array.from(
          { length: range.to - range.from + 1 },
          (_, offset) => range.from + offset
        ).filter((value) => uniqueValues.has(value)).length
      : uniqueValues.size;
    return {
      duplicates: values.length - uniqueValues.size,
      expectedCoverage,
      index
    };
  });
  const selected = candidates.sort((left, right) =>
    right.expectedCoverage - left.expectedCoverage ||
    left.duplicates - right.duplicates ||
    left.index - right.index
  )[0];
  return selected && selected.expectedCoverage > 0 ? selected.index : 0;
};

const verbalTopicSheetNames: Record<string, readonly string[]> = {
  "verbal-analogy": ["بنك التناظر عام"],
  "sentence-completion": ["اكمال الجمل عام", "إكمال الجمل عام"],
  "contextual-error": ["الخطأ السياقي عام", "المفردة الخاطئة عام"],
  "odd-word": ["المفردة الشاذة عام", "المفردة المختلفة عام"],
  "reading-comprehension": ["استيعاب المقروء عام", "استعياب المقروء عام"]
};

const hasSelectedQuestion = (
  sheet: RawWorkbookSheet,
  definition: SheetDefinition | null,
  range?: PageRange
) =>
  sheet.data.slice(1).some((row, index) => {
    const number = definition?.questionNumberStrategy === "data-row"
      ? index + 1
      : parseQuestionNumber(row[definition?.questionNumberIndex ?? 0]);
    return number !== null && (!range || inRange(number, range));
  });

const definitionMatchesHeader = (definition: SheetDefinition, header: unknown[]) =>
  definition.headers.length === header.length &&
  definition.headers.every((expected, index) => headerMatches(header[index], expected));

const findVerbalDefinition = (sheet: RawWorkbookSheet) => {
  const normalized = normalizedSheetName(sheet.sheet);
  for (const [topicId, names] of Object.entries(verbalTopicSheetNames)) {
    if (!names.some((name) => normalizedSheetName(name) === normalized)) continue;
    const canonicalName = names[0];
    const definitions = verbalSheetDefinitions[topicId] ?? [];
    const base = definitions.find((definition) =>
      definitionMatchesHeader(definition, sheet.data[0] ?? [])
    ) ?? definitions[0] ?? null;
    if (!base) return null;
    const topic = topicTaxonomy.find((candidate) => candidate.slug === topicId);
    return {
      canonicalName,
      definition: topic
        ? {
            ...base,
            sectionDetectionSource: "worksheet-name" as const,
            topic: topic.displayNameAr,
            topicId: topic.slug,
            topicSource: "worksheet-name" as const
          }
        : {
            ...base,
            sectionDetectionSource: "worksheet-name" as const,
            topicSource: "worksheet-name" as const
          }
    };
  }

  const structuralMatches = Object.entries(verbalSheetDefinitions).flatMap(
    ([topicId, definitions]) => definitions
      .filter((definition) => definitionMatchesHeader(definition, sheet.data[0] ?? []))
      .map((definition) => ({ definition, topicId }))
  );
  const matchingTopics = [...new Set(structuralMatches.map((match) => match.topicId))];
  if (matchingTopics.length === 1) {
    const match = structuralMatches[0];
    const topic = match
      ? topicTaxonomy.find((candidate) => candidate.slug === match.topicId)
      : null;
    if (match && topic) {
      return {
        canonicalName: sheet.sheet,
        definition: {
          ...match.definition,
          sectionDetectionSource: "structure" as const,
          topic: topic.displayNameAr,
          topicId: topic.slug,
          topicSource: "fixed-contract" as const
        }
      };
    }
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
          normalized.includes(normalizedSheetName(topic.displayNameAr)) ||
          normalized.includes(normalizedSheetName(topic.displayNameAr).replace(/^ال/, "")))
    ) ?? null
  );
};

const getSheetPlans = (
  sheets: RawWorkbookSheet[],
  questionRange?: PageRange,
  importType: QuestionImportType = "general"
) => {
  const detectionIssues: ImportValidationIssue[] = [];
  const recognized = sheets.flatMap((sheet) => {
    if (isBankFirstQuantitativeSheet(sheet)) {
      const topic = findQuantitativeTopic(sheet.sheet);
      return [{
        canonicalName: sheet.sheet,
        definition: createBankFirstQuantitativeDefinition(
          topic,
          sheet.data[0]?.length ?? quantitativeBankFirstHeaders.length
        ),
        sheet
      }];
    }
    if (isAuthoritativeArQuantitativeSheet(sheet)) {
      return [{
        canonicalName: sheet.sheet,
        definition: createAuthoritativeArDefinition(
          findQuantitativeTopic(sheet.sheet),
          findRangeIdentifierIndex(sheet, questionRange)
        ),
        sheet
      }];
    }
    if (isExtendedQuantitativeSheet(sheet)) {
      return [{
        canonicalName: sheet.sheet,
        definition: createExtendedQuantitativeDefinition(findQuantitativeTopic(sheet.sheet)),
        sheet
      }];
    }
    if (isWideQuantitativeSheet(sheet)) {
      return [{
        canonicalName: sheet.sheet,
        definition: createWideQuantitativeDefinition(findQuantitativeTopic(sheet.sheet)),
        sheet
      }];
    }
    const verbal = findVerbalDefinition(sheet);
    if (verbal) return [{ ...verbal, sheet }];

    const quantitativeTopic = findQuantitativeTopic(sheet.sheet);
    if (quantitativeTopic) {
      const header = sheet.data[0] ?? [];
      const standardDefinition = createTopicStandardDefinition(quantitativeTopic);
      return [{
        canonicalName: sheet.sheet,
        definition: definitionMatchesHeader(standardDefinition, header)
          ? standardDefinition
          : createQuantitativeSheetDefinition(quantitativeTopic),
        sheet
      }];
    }
    const header = sheet.data[0] ?? [];
    if (
      importType === "general" &&
      header.length === standardHeaders.length &&
      standardHeaders.every((expected, index) => headerMatches(header[index], expected))
    ) {
      detectionIssues.push(issue(
        "ambiguous_workbook_structure",
        `ورقة ${sheet.sheet} تطابق بنية مشتركة من سبعة أعمدة، لكن اسمها ومحتواها لا يحددان هل الأسئلة كمية أم لفظية أو ما هو الموضوع الرئيسي.`,
        { sheetName: sheet.sheet }
      ));
    }
    return [];
  });
  const selected = recognized.filter((plan) =>
    hasSelectedQuestion(plan.sheet, plan.definition, questionRange)
  );
  return {
    detectionIssues,
    recognized,
    selected: selected.length > 0 ? selected : recognized
  };
};

const columnMappingsForDefinition = (
  definition: SheetDefinition,
  header: unknown[]
): WorkbookColumnMapping[] => {
  const topicIndex = definition.format === "quantitative-wide"
    ? 11
    : definition.categoryIndex ?? null;
  const subtopicIndex = definition.format === "quantitative-wide"
    ? 17
    : definition.subtopicIndex ?? null;
  const difficultyIndex = definition.format === "quantitative-wide"
    ? 10
    : definition.difficultyIndex ?? null;
  const mappings: Array<[string, number | null, "column" | "row-order"]> = [
    ["questionNumber", definition.questionNumberIndex, definition.questionNumberStrategy === "data-row" ? "row-order" : "column"],
    ["questionText", definition.questionTextIndex, "column"],
    ["optionA", definition.optionIndexes[0], "column"],
    ["optionB", definition.optionIndexes[1], "column"],
    ["optionC", definition.optionIndexes[2], "column"],
    ["optionD", definition.optionIndexes[3], "column"],
    ["correctAnswer", definition.answerIndex, "column"],
    ["topic", topicIndex, "column"],
    ["subtopic", subtopicIndex, "column"],
    ["additionalCategory", definition.additionalCategoryIndex ?? null, "column"],
    ["difficulty", difficultyIndex, "column"],
    ["comparisonA", definition.comparisonOperandIndexes?.[0] ?? null, "column"],
    ["comparisonB", definition.comparisonOperandIndexes?.[1] ?? null, "column"],
    ["imageIndicator", definition.imageIndicatorIndex ?? definition.imageIndex ?? null, "column"],
    ["comparisonImageA", definition.comparisonImageIndexes?.[0] ?? null, "column"],
    ["comparisonImageB", definition.comparisonImageIndexes?.[1] ?? null, "column"],
    ["sourceIdentifierPrimary", definition.sourceIdentifierIndexes?.[0] ?? null, "column"],
    ["sourceIdentifierSecondary", definition.sourceIdentifierIndexes?.[1] ?? null, "column"],
    ["sourceIdentifierCode", definition.sourceIdentifierIndexes?.[2] ?? null, "column"]
  ];

  return mappings
    .filter(([, index, source]) => source === "row-order" || index !== null)
    .map(([field, index, source]) => ({
      field,
      columnIndex: source === "row-order" ? null : index,
      columnName: source === "row-order" || index === null ? "ترتيب الصف" : columnName(index),
      header: source === "row-order" || index === null ? null : text(header[index]) || null,
      source
    }));
};

const selectedBankGroupForDefinition = (
  definition: SheetDefinition,
  data: unknown[][],
  questionRange?: PageRange
) => {
  if (!definition.scopeToFirstBankGroup || definition.bankGroupIndex === undefined) {
    return null;
  }
  for (let rowIndex = 1; rowIndex < data.length; rowIndex += 1) {
    const row = data[rowIndex] ?? [];
    const questionNumber = parseQuestionNumber(row[definition.questionNumberIndex ?? 0]);
    if (questionNumber !== null && (!questionRange || inRange(questionNumber, questionRange))) {
      return text(row[definition.bankGroupIndex]) || null;
    }
  }
  return null;
};

const metadataText = (metadata: Record<string, unknown> | undefined, key: string) => {
  const value = metadata?.[key];
  return value === null || value === undefined || value === "" ? null : String(value);
};

const metadataTextArray = (metadata: Record<string, unknown> | undefined, key: string) => {
  const value = metadata?.[key];
  return Array.isArray(value)
    ? value.map((entry) => String(entry)).filter(Boolean)
    : [];
};

const buildWorkbookDiagnostics = (
  sheets: RawWorkbookSheet[],
  recognizedPlans: ReturnType<typeof getSheetPlans>["recognized"],
  selectedPlans: ReturnType<typeof getSheetPlans>["selected"],
  questions: ParsedWorkbookQuestion[],
  issues: ImportValidationIssue[],
  questionRange?: PageRange
): WorkbookAnalysis["diagnostics"] => {
  const questionsByRow = new Map(
    questions.map((question) => [`${question.sheetName}\0${question.rowNumber}`, question] as const)
  );
  const selectedWorksheetNames = selectedPlans.map((plan) => plan.sheet.sheet);

  return {
    parsedQuestionIdentifiers: questions.map((question) => question.questionNumber),
    selectedWorksheetNames,
    sheets: sheets.map((sheet) => {
      const recognizedPlan = recognizedPlans.find((plan) => plan.sheet === sheet);
      const selected = selectedPlans.some((plan) => plan.sheet === sheet);
      const definition = recognizedPlan?.definition;
      const data = Array.isArray(sheet.data) ? sheet.data : [];
      const selectedBankGroup = definition
        ? selectedBankGroupForDefinition(definition, data, questionRange)
        : null;
      const detectedHeaders = (data[0] ?? []).map((value) => text(value));
      const nonEmptyRows = data.slice(1)
        .map((row, index) => ({ row, rowNumber: index + 2 }))
        .filter(({ row }) => !isEmptyRow(row));
      const rows: WorkbookDiagnosticRow[] = nonEmptyRows.map(({ row, rowNumber }) => {
        const parsed = questionsByRow.get(`${recognizedPlan?.canonicalName ?? sheet.sheet}\0${rowNumber}`);
        const questionNumber = definition?.questionNumberStrategy === "data-row"
          ? rowNumber - 1
          : definition
            ? parseQuestionNumber(row[definition.questionNumberIndex ?? 0])
            : parseQuestionNumber(row[0]);
        const rowIssues = issues.filter((entry) =>
          entry.sheetName === (recognizedPlan?.canonicalName ?? sheet.sheet) &&
          entry.rowNumber === rowNumber
        );
        let status: WorkbookDiagnosticRow["status"] = "skipped";
        let reason: string | null = null;

        if (!recognizedPlan) {
          reason = "بنية ورقة العمل غير مدعومة.";
        } else if (!selected) {
          reason = "لم تُحدد ورقة العمل لهذا النطاق.";
        } else if (
          selectedBankGroup !== null &&
          definition?.bankGroupIndex !== undefined &&
          text(row[definition.bankGroupIndex]) !== selectedBankGroup
        ) {
          reason = `الصف تابع لمجموعة بنك أخرى (${text(row[definition.bankGroupIndex]) || "فارغة"}).`;
        } else if (questionNumber === null) {
          status = "invalid";
          reason = "تعذر قراءة رقم السؤال من العمود المحدد.";
        } else if (questionRange && !inRange(questionNumber, questionRange)) {
          reason = "رقم السؤال خارج النطاق المحدد.";
        } else if (!parsed) {
          status = "invalid";
          reason = rowIssues[0]?.message ?? "لم يتمكن المحلل من استخراج هذا الصف.";
        } else {
          status = parsed.issues.some((entry) => entry.severity === "error")
            ? "invalid"
            : "extracted";
          reason = parsed.issues[0]?.message ?? null;
        }

        return {
          additionalCategory: metadataText(parsed?.metadata, "additionalCategory"),
          comparisonA: metadataTextArray(parsed?.metadata, "comparisonOperands")[0] ?? null,
          comparisonB: metadataTextArray(parsed?.metadata, "comparisonOperands")[1] ?? null,
          comparisonImages: metadataTextArray(parsed?.metadata, "comparisonImages"),
          correctAnswer: parsed?.correctAnswer ?? null,
          detectedSection: parsed?.subject ?? definition?.subject ?? null,
          difficulty: parsed?.difficulty ?? null,
          excelRowNumber: rowNumber,
          format: definition?.format ?? null,
          imageIndicator: metadataText(parsed?.metadata, "imageIndicator"),
          issues: parsed?.issues ?? rowIssues,
          matchedMediaIdentifier: null,
          matchedPageNumber: null,
          matchedSourceName: null,
          mediaMatchStatus: "not_attempted",
          metadata: parsed?.metadata ?? null,
          options: parsed?.options ?? null,
          questionNumber: parsed?.questionNumber ?? questionNumber,
          questionText: parsed?.questionText || null,
          rawValues: row,
          reason,
          status,
          subject: parsed?.subject ?? null,
          sourceIdentifiers: parsed?.metadata?.sourceIdentifiers &&
            typeof parsed.metadata.sourceIdentifiers === "object"
            ? parsed.metadata.sourceIdentifiers as WorkbookDiagnosticRow["sourceIdentifiers"]
            : null,
          subtopic: parsed?.subtopic ?? null,
          subtopicId: parsed?.subtopicId ?? null,
          subtopicSource: definition?.subtopicSource ?? null,
          topic: parsed?.topic ?? null,
          topicId: parsed?.topicId ?? null,
          topicSource: definition?.topicSource ?? null
        };
      });

      return {
        columnMappings: definition
          ? columnMappingsForDefinition(definition, data[0] ?? [])
          : [],
        detectedHeaders,
        emptyRowCount: Math.max(0, data.length - 1 - nonEmptyRows.length),
        format: definition?.format ?? null,
        detectedSection: definition?.subject ?? null,
        recognized: Boolean(recognizedPlan),
        rows,
        selected,
        sectionDetectionSource: definition?.sectionDetectionSource ?? null,
        sheetName: sheet.sheet,
        skippedReason: recognizedPlan
          ? selected ? null : "لا تحتوي الورقة على أسئلة من النطاق المحدد."
          : "لم تتطابق رؤوس الأعمدة مع أي بنية Excel مدعومة."
      };
    })
  };
};

export const analyzeWorkbookSheets = (
  sheets: RawWorkbookSheet[],
  questionRange?: PageRange,
  importType: QuestionImportType = "general"
): WorkbookAnalysis => {
  const issues: ImportValidationIssue[] = [];
  const questions: ParsedWorkbookQuestion[] = [];
  const seenQuestions = new Map<number, ParsedWorkbookQuestion>();
  const missingTopicSheets = new Set<string>();
  const plans = getSheetPlans(sheets, questionRange, importType);
  const sheetPlans = plans.selected;
  const structuralFailure = sheetPlans.length === 0;
  if (sheetPlans.length === 0) {
    if (plans.detectionIssues.length > 0) {
      issues.push(...plans.detectionIssues);
    } else {
      issues.push(issue(
        "unsupported_workbook_structure",
        `لم يُعثر على ورقة ببنية Excel مدعومة. الأوراق المكتشفة: ${sheets.map((sheet) => sheet.sheet).join("، ") || "لا توجد أوراق"}.`
      ));
    }
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

    const selectedBankGroups = new Set<string>();
    const selectedBankGroup = selectedBankGroupForDefinition(
      definition,
      data,
      questionRange
    );
    for (let rowIndex = 1; rowIndex < data.length; rowIndex += 1) {
      const row = data[rowIndex] ?? [];
      if (isEmptyRow(row)) continue;
      const rowNumber = rowIndex + 1;
      if (
        selectedBankGroup !== null &&
        definition.bankGroupIndex !== undefined &&
        text(row[definition.bankGroupIndex]) !== selectedBankGroup
      ) {
        continue;
      }
      const questionNumber = definition.questionNumberStrategy === "data-row"
        ? rowIndex
        : parseQuestionNumber(row[definition.questionNumberIndex ?? 0]);
      const possibleNumber = definition.questionNumberStrategy === "data-row"
        ? rowIndex
        : potentialQuestionNumber(row[definition.questionNumberIndex ?? 0]);
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
      const questionCell = `${String.fromCharCode(65 + definition.questionTextIndex)}${rowNumber}`;
      const questionText = text(row[definition.questionTextIndex]) ||
        text(sheet.comments?.get(questionCell));
      const options = definition.optionIndexes.map((index) => text(row[index])) as [string, string, string, string];
      const correctAnswer = parseCorrectAnswer(row[definition.answerIndex]);
      const embeddedImages = sheet.embeddedImages?.get(rowNumber) ?? [];
      const categoryIndex = definition.format === "quantitative-wide"
        ? 11
        : definition.categoryIndex;
      const categoryValue = categoryIndex === undefined ? "" : text(row[categoryIndex]);
      const categoryTopic = categoryValue
        ? topicTaxonomy.find((candidate) =>
            candidate.subject === "math" &&
            normalizedHeader(candidate.displayNameAr) === normalizedHeader(categoryValue)
          )
        : null;
      const difficultyIndex = definition.difficultyIndex ?? (
        definition.format === "quantitative-wide" ? 10 : undefined
      );
      const difficultyValue = difficultyIndex === undefined ? Number.NaN : Number(row[difficultyIndex]);
      const difficulty = Number.isInteger(difficultyValue) && difficultyValue >= 1 && difficultyValue <= 10
        ? difficultyValue
        : 1;
      const sourceIdentifierValues = definition.sourceIdentifierIndexes
        ? definition.sourceIdentifierIndexes.map((index) => text(row[index]) || null)
        : null;
      const comparisonValues = (definition.comparisonOperandIndexes ?? [])
        .map((index) => text(row[index]) || null);
      const comparisonImageValues = (definition.comparisonImageIndexes ?? [])
        .map((index) => text(row[index]) || null);
      const additionalCategory = definition.additionalCategoryIndex === undefined
        ? null
        : text(row[definition.additionalCategoryIndex]) || null;
      const sourceSubtopic = definition.format === "quantitative-wide"
        ? text(row[17]) || null
        : definition.subtopicIndex === undefined
          ? definition.subtopic
          : text(row[definition.subtopicIndex]) || null;
      const bankFirstCategoryMatch = definition.format === "quantitative-bank-first" && sourceSubtopic
        ? topicTaxonomy
            .filter((candidate) => candidate.subject === "math")
            .map((topic) => ({
              subtopic: topic.subtopics.find(
                (candidate) => normalizedHeader(candidate.displayNameAr) === normalizedHeader(sourceSubtopic)
              ) ?? null,
              topic
            }))
            .find(({ subtopic, topic }) =>
              Boolean(subtopic) || normalizedHeader(topic.displayNameAr) === normalizedHeader(sourceSubtopic)
            ) ?? null
        : null;
      const bankFirstDirectTopic = bankFirstCategoryMatch && !bankFirstCategoryMatch.subtopic
        ? bankFirstCategoryMatch.topic
        : null;
      const resolvedTopicDefinition = bankFirstCategoryMatch?.topic ?? categoryTopic ??
        topicTaxonomy.find((candidate) => candidate.slug === definition.topicId) ?? null;
      const resolvedTopic = resolvedTopicDefinition?.displayNameAr ?? definition.topic;
      const resolvedTopicId = resolvedTopicDefinition?.slug ?? definition.topicId;
      if (!resolvedTopic || !resolvedTopicId) {
        missingTopicSheets.add(sheetName);
      }
      const canonicalSubtopic = bankFirstCategoryMatch?.subtopic ??
        (sourceSubtopic && resolvedTopicDefinition && !bankFirstDirectTopic
          ? resolvedTopicDefinition.subtopics.find(
            (candidate) => normalizedHeader(candidate.displayNameAr) === normalizedHeader(sourceSubtopic)
          ) ?? null
          : null);
      const resolvedSubtopic = bankFirstDirectTopic ? null : sourceSubtopic;
      const metadata: Record<string, unknown> = {
        additionalCategory,
        classification: {
          detectedSection: definition.subject,
          mainTopic: resolvedTopic || null,
          mainTopicId: resolvedTopicId || null,
          mainTopicSource: bankFirstCategoryMatch || categoryTopic ? "column" : definition.topicSource ?? null,
          subtopic: resolvedSubtopic,
          subtopicId: canonicalSubtopic?.slug ?? definition.subtopicId,
          subtopicSource: definition.subtopicSource ?? null
        },
        comparisonImageValues,
        comparisonImages: comparisonImageValues.filter(Boolean),
        comparisonOperands: comparisonValues.filter(Boolean),
        detectedFormat: definition.format,
        detectedSection: definition.subject,
        imageIndicator: definition.imageIndicatorIndex === undefined
          ? definition.imageIndex === undefined
            ? null
            : text(row[definition.imageIndex]) || null
          : text(row[definition.imageIndicatorIndex]) || null,
        imageSourceValue: definition.imageIndex === undefined
          ? null
          : text(row[definition.imageIndex]) || null,
        normalizedCorrectAnswer: correctAnswer,
        normalizedQuestionNumber: questionNumber,
        originalHeaders: (data[0] ?? []).map((value) => text(value) || null),
        questionNumberSource: definition.questionNumberStrategy === "data-row"
          ? { column: null, value: rowIndex, source: "row-order" }
          : {
              column: columnName(definition.questionNumberIndex ?? 0),
              value: text(row[definition.questionNumberIndex ?? 0]) || null,
              source: "column"
            },
        sourceColumns: row.map((value, index) => ({
          column: columnName(index),
          header: text(data[0]?.[index]) || null,
          value: value ?? null
        })),
        sourceIdentifiers: sourceIdentifierValues
          ? {
              code: sourceIdentifierValues[2] ?? null,
              primary: sourceIdentifierValues[0] ?? null,
              secondary: sourceIdentifierValues[1] ?? null
            }
          : null,
        sourceOptions: options,
        sourceCorrectAnswer: text(row[definition.answerIndex]) || null,
        sourceQuestionText: questionText || null,
        sourceRowNumber: rowNumber,
        sourceWorksheet: sheetName
      };
      if (definition.format === "quantitative-wide") {
        Object.assign(metadata, {
          additionalCategory: text(row[11]) || null,
          chapter: text(row[17]) || null,
          comparisonImageValues: [text(row[13]) || null, text(row[14]) || null, text(row[15]) || null],
          comparisonImages: [text(row[13]), text(row[14]), text(row[15])].filter(Boolean),
          comparisonOperands: [text(row[0]), text(row[1])].filter(Boolean),
          imageIndicator: text(row[9]) || null,
          model: text(row[8]) || null,
          precisionDifficulty: text(row[10]) || null,
          weight: text(row[16]) || null
        });
      } else if (
        definition.format === "quantitative-extended" ||
        definition.format === "quantitative-bank-first" ||
        definition.format === "quantitative-a-r"
      ) {
        const bankGroupIdentifier = definition.bankGroupIndex === undefined
          ? null
          : text(row[definition.bankGroupIndex]) || null;
        if (bankGroupIdentifier) selectedBankGroups.add(bankGroupIdentifier);
        Object.assign(metadata, {
          additionalCategory: definition.additionalCategoryIndex === undefined && definition.subtopicIndex === undefined
            ? null
            : text(row[definition.additionalCategoryIndex ?? definition.subtopicIndex ?? 0]) || null,
          bankGroupIdentifier,
          comparisonImageValues,
          comparisonImages: comparisonImageValues.filter(Boolean),
          comparisonOperands: comparisonValues.filter(Boolean),
          internalIdentifiers: (definition.internalIdentifierIndexes ?? [])
            .map((index) => ({ column: columnName(index), value: text(row[index]) }))
            .filter((entry) => entry.value),
          technicalColumns: definition.format === "quantitative-bank-first"
            ? undefined
            : row.slice(18, 25).map((value, index) => ({
                column: columnName(index + 18),
                value: text(value) || null
              }))
        });
        if (definition.format === "quantitative-bank-first") {
          Object.assign(metadata, {
            bankSectionNumber: text(row[0]) || null,
            sourceQuestionNumber: text(row[1]) || null,
            sourceCategory: text(row[13]) || null,
            unknownSourceFields: [
              { column: "C", header: text(data[0]?.[2]) || null, value: row[2] ?? null },
              ...row.slice(18).map((value, index) => ({
                column: columnName(index + 18),
                header: text(data[0]?.[index + 18]) || null,
                value: value ?? null
              }))
            ]
          });
        }
      }
      if (definition.answerTextIndex !== undefined) {
        metadata.answerText = text(row[definition.answerTextIndex]) || null;
      }
      if (definition.passageIndex !== undefined) {
        const passage = text(row[definition.passageIndex]) || null;
        metadata.passage = passage;
        metadata.passageId = passage
          ? createHash("sha256")
              .update(`${sheetName}\0${passage}`)
              .digest("hex")
              .slice(0, 24)
          : null;
      }
      if (embeddedImages.length > 0) {
        metadata.embeddedImages = embeddedImages.map((image) => ({
          column: columnName(image.columnIndex),
          filename: image.filename,
          mediaType: image.mediaType,
          rowNumber: image.rowNumber
        }));
      }
      if (!questionText) {
        rowIssues.push(issue("missing_question_text", `نص السؤال ${questionNumber} مفقود.`, {
          questionNumber, rowNumber, sheetName
        }));
      }
      const comparisonQuestion = (
        definition.format === "quantitative-extended" ||
        definition.format === "quantitative-bank-first" ||
        definition.format === "quantitative-a-r"
      ) &&
        (definition.comparisonOperandIndexes ?? []).some((index) => text(row[index]));
      options.forEach((option, optionIndex) => {
        if (comparisonQuestion) return;
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
        topic: resolvedTopic,
        topicId: resolvedTopicId,
        subtopic: resolvedSubtopic,
        subtopicId: canonicalSubtopic?.slug ?? definition.subtopicId,
        difficulty,
        metadata,
        embeddedImages,
        issues: rowIssues
      };
      seenQuestions.set(questionNumber, parsed);
      questions.push(parsed);
      issues.push(...rowIssues);
      sheetSummary[sheetIndex].questionCount += 1;
    }

    if (!definition.scopeToFirstBankGroup && selectedBankGroups.size > 1) {
      issues.push(issue(
        "multiple_bank_groups",
        `النطاق المحدد في ورقة ${sheetName} يحتوي على أكثر من معرّف بنك في العمود A. ارفع كل بنك في عملية مستقلة حتى لا تندمج الأقسام.`,
        { sheetName }
      ));
    }
  }

  for (const sheetName of missingTopicSheets) {
    issues.push(issue(
      "missing_main_topic",
      `تم اكتشاف قسم الأسئلة في ورقة ${sheetName}، لكن تعذر تحديد الموضوع الرئيسي من اسم الورقة أو أعمدة التصنيف المعتمدة.`,
      { sheetName }
    ));
  }

  if (questionRange && !structuralFailure) {
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
    diagnostics: buildWorkbookDiagnostics(
      sheets,
      plans.recognized,
      sheetPlans,
      questions,
      issues,
      questionRange
    ),
    issues,
    questions: questions.sort((left, right) => left.questionNumber - right.questionNumber),
    sheetSummary,
    structuralFailure
  };
};

export const readAdminWorkbook = async (
  excelBuffer: Buffer,
  questionRange?: PageRange,
  importType: QuestionImportType = "general"
) => {
  assertSafeWorkbookArchive(excelBuffer);
  const sheets = (await readXlsxFile(excelBuffer)) as RawWorkbookSheet[];
  const comments = extractWorkbookComments(excelBuffer);
  const embeddedImages = extractWorkbookEmbeddedImages(excelBuffer);
  for (const sheet of sheets) {
    sheet.comments = comments.get(sheet.sheet);
    sheet.embeddedImages = embeddedImages.get(sheet.sheet);
  }
  return analyzeWorkbookSheets(
    sheets,
    questionRange,
    importType
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
