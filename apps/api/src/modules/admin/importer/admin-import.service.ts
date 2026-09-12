import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import {
  backupQuestionImageObject,
  commitStagedQuestionImageObject,
  getQuestionImageUrl,
  getSourcePdfStorageKey,
  isPngBuffer,
  questionImageExists,
  removeImportMedia,
  removeImportObjectMedia,
  removeQuestionImageObject,
  removeImportStaging,
  readQuestionImageObject,
  restoreQuestionImageObjectBackup,
  stageQuestionImageObject,
  writeQuestionImageObject
} from "../../media/media.service.js";
import { optimizeQuestionImage } from "../../media/question-image-optimizer.service.js";
import {
  countQuestionReferences,
  deleteQuestion,
  findQuestionById,
  restoreQuestionRecord
} from "../../questions/question.repository.js";
import { saveQuestion } from "../../questions/question.service.js";
import type { QuestionRecord } from "../../questions/question.types.js";
import {
  legacySubjectToSubject,
  topicTaxonomy,
  type LearningSubject
} from "../../learning-taxonomy/taxonomy.js";
import { readAdminWorkbook } from "./adapters/excel.adapter.js";
import { matchUploadedImages } from "./adapters/image.adapter.js";
import {
  getPdfPageCount,
  renderPdfPageToPng,
  selectPdfPages
} from "./adapters/pdf.adapter.js";
import {
  cancelImportJob,
  completeImportAnalysis,
  completeImportJob,
  createImportJob,
  failImportJob,
  findImportJob,
  insertImportItems,
  listAdminQuestionTopicCounts,
  listAdminQuestions,
  listImportJobItems,
  listImportJobs,
  markImportJobImporting,
  markImportJobRolledBack,
  runImportTransaction,
  setImportJobSourcePdf,
  updateImportItemResult
} from "./import-job.repository.js";
import { createSourcePdf } from "../../source-pdfs/source-pdf.repository.js";
import { objectStorage } from "../../storage/object-storage.service.js";
import { toQuestionId } from "./question-format.mapper.js";
import type {
  AnalyzeImportRequest,
  ConfirmImportRequest,
  DuplicateAction,
  ImportJobDetail,
  ImportJobItem,
  ImportValidationIssue,
  MediaSummary
} from "./importer.types.js";

export class AdminImportError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

const activeProgress = new Map<string, number>();
const questionCountSubjectOrder: LearningSubject[] = ["arabic", "math"];
const questionCountSubjectLabels: Record<LearningSubject, string> = {
  arabic: "اللفظي",
  math: "الكمي"
};

type AdminQuestionSubtopicCount = {
  subtopicId: string | null;
  subtopicLabel: string;
  count: number;
};

type AdminQuestionTopicCount = {
  topicId: string | null;
  topicLabel: string;
  count: number;
  subtopics: AdminQuestionSubtopicCount[];
};

type MutableAdminQuestionTopicCount = Omit<
  AdminQuestionTopicCount,
  "subtopics"
> & {
  subtopicsById: Map<string, AdminQuestionSubtopicCount>;
};

type AdminQuestionSubjectCount = {
  subjectId: LearningSubject;
  subjectLabel: string;
  total: number;
  topics: AdminQuestionTopicCount[];
};

const errorIssue = (
  code: string,
  message: string,
  questionNumber?: number
): ImportValidationIssue => ({
  code,
  message,
  questionNumber,
  severity: "error"
});

const validateExcelFile = (file: AnalyzeImportRequest["excel"]) => {
  const extension = extname(file.originalname).toLowerCase();
  const hasZipSignature = file.buffer.subarray(0, 2).toString("binary") === "PK";

  if (extension !== ".xlsx" || !hasZipSignature) {
    throw new AdminImportError("يجب رفع ملف Excel صالح بصيغة .xlsx.");
  }
};

const validatePdfFile = (file: NonNullable<AnalyzeImportRequest["pdf"]>) => {
  if (
    extname(file.originalname).toLowerCase() !== ".pdf" ||
    file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-"
  ) {
    throw new AdminImportError("يجب رفع ملف PDF صالح.");
  }
};

const assertAnalysisInput = (request: AnalyzeImportRequest) => {
  validateExcelFile(request.excel);
  const hasPdf = Boolean(request.pdf);
  const hasImages = Boolean(request.images?.length);

  if (hasPdf === hasImages) {
    throw new AdminImportError("اختر ملف PDF أو مجموعة صور PNG، وليس كليهما.");
  }

  if (request.pdf) {
    validatePdfFile(request.pdf);
    if (
      !Number.isInteger(request.startQuestionNumber) ||
      (request.startQuestionNumber ?? 0) < 1
    ) {
      throw new AdminImportError("رقم أول سؤال في الـ PDF يجب أن يكون رقماً موجباً.");
    }
  }
};

const withProgress = (detail: ImportJobDetail): ImportJobDetail => {
  const progress = activeProgress.get(detail.job.id);
  return progress === undefined
    ? detail
    : { ...detail, job: { ...detail.job, processedCount: progress } };
};

export const getImportJobDetail = (jobId: string) => {
  const job = findImportJob(jobId);
  if (!job) {
    throw new AdminImportError("عملية الاستيراد غير موجودة.", 404);
  }

  return withProgress({ job, items: listImportJobItems(jobId) });
};

const analyzePdfMedia = async (
  jobId: string,
  request: AnalyzeImportRequest,
  issues: ImportValidationIssue[]
) => {
  const pdf = request.pdf as NonNullable<AnalyzeImportRequest["pdf"]>;
  const pageCount = await getPdfPageCount(pdf.buffer);
  const sourcePdfId = randomUUID();
  const sourcePdfStorageKey = getSourcePdfStorageKey(sourcePdfId);

  await objectStorage.uploadObject({
    body: pdf.buffer,
    contentType: "application/pdf",
    key: sourcePdfStorageKey
  });

  try {
    createSourcePdf({
      createdBy: request.createdBy,
      fileSize: pdf.buffer.length,
      id: sourcePdfId,
      originalFilename: pdf.originalname,
      pageCount,
      storageKey: sourcePdfStorageKey
    });
  } catch (error) {
    await objectStorage.deleteObject(sourcePdfStorageKey);
    throw error;
  }

  setImportJobSourcePdf({ id: jobId, sourcePdfId });

  const pages = selectPdfPages(
    pageCount,
    request.startQuestionNumber as number
  );
  const mapping = new Map<number, { pageNumber: number; sourceImageName: string }>();

  for (const page of pages) {
    const questionId = toQuestionId(page.questionNumber);
    try {
      const image = await renderPdfPageToPng(pdf.buffer, page.pageIndex);
      if (!isPngBuffer(image)) {
        throw new Error("Rendered output is not PNG.");
      }
      const optimizedImage = await optimizeQuestionImage(image);
      await stageQuestionImageObject(jobId, questionId, optimizedImage.buffer);
      mapping.set(page.questionNumber, {
        pageNumber: page.pageIndex,
        sourceImageName: `الصفحة ${page.pageIndex}`
      });
    } catch {
      issues.push(
        errorIssue(
          "pdf_render_failed",
          `تعذر تحويل الصفحة ${page.pageIndex} الخاصة بالسؤال ${page.questionNumber} إلى صورة.`,
          page.questionNumber
        )
      );
    }
  }

  return { found: pageCount, mapping, sourcePdfId, totalPages: pageCount };
};

const analyzeImageMedia = async (
  jobId: string,
  request: AnalyzeImportRequest,
  issues: ImportValidationIssue[]
) => {
  const result = matchUploadedImages(request.images ?? []);
  issues.push(...result.issues);
  const mapping = new Map<number, { pageNumber: number | null; sourceImageName: string }>();

  for (const image of result.byQuestionNumber.values()) {
    const imageBuffer = image.temporaryPath
      ? readFileSync(image.temporaryPath)
      : image.buffer;
    const optimizedImage = await optimizeQuestionImage(imageBuffer);
    await stageQuestionImageObject(
      jobId,
      toQuestionId(image.questionNumber),
      optimizedImage.buffer
    );
    mapping.set(image.questionNumber, {
      pageNumber: null,
      sourceImageName: image.originalname
    });
  }

  return {
    found: request.images?.length ?? 0,
    mapping,
    sourcePdfId: null,
    totalPages: 0
  };
};

export const analyzeQuestionImport = async (
  request: AnalyzeImportRequest
): Promise<ImportJobDetail> => {
  assertAnalysisInput(request);

  const sourceType = request.pdf ? "pdf" : "images";
  const mediaFilename = request.pdf?.originalname ?? `${request.images?.length ?? 0} صور PNG`;
  const job = createImportJob({
    createdBy: request.createdBy,
    excelFilename: request.excel.originalname,
    mediaFilename,
    sourceType,
    startQuestionNumber: request.pdf ? request.startQuestionNumber ?? null : null,
    status: "analyzing"
  });

  try {
    const workbook = await readAdminWorkbook(request.excel.buffer);
    const issues = [...workbook.issues];
    const media = request.pdf
      ? await analyzePdfMedia(job.id, request, issues)
      : await analyzeImageMedia(job.id, request, issues);
    const workbookNumbers = new Set(
      workbook.questions.map((question) => question.questionNumber)
    );

    for (const mediaNumber of media.mapping.keys()) {
      if (!workbookNumbers.has(mediaNumber)) {
        issues.push(
          errorIssue(
            "extra_media",
            `توجد صورة للسؤال ${mediaNumber} ولا يوجد له صف مطابق في Excel.`,
            mediaNumber
          )
        );
      }
    }

    const now = new Date().toISOString();
    const items: ImportJobItem[] = workbook.questions.map((question) => {
      const mediaMatch = media.mapping.get(question.questionNumber);
      const itemIssues = [...question.issues];
      if (!mediaMatch) {
        const missing = errorIssue(
          "missing_image",
          `الصورة الخاصة بالسؤال ${question.questionNumber} غير موجودة.`,
          question.questionNumber
        );
        itemIssues.push(missing);
        issues.push(missing);
      }

      return {
        importJobId: job.id,
        questionNumber: question.questionNumber,
        questionId: toQuestionId(question.questionNumber),
        sheetName: question.sheetName,
        excelRowNumber: question.rowNumber,
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        subject: "verbal",
        topic: question.topic,
        topicId: question.topicId,
        difficulty: 1,
        pageNumber: mediaMatch?.pageNumber ?? null,
        sourceImageName: mediaMatch?.sourceImageName ?? null,
        imageStatus: mediaMatch ? "matched" : "missing",
        validationStatus: itemIssues.some((item) => item.severity === "error")
          ? "error"
          : "valid",
        errors: itemIssues,
        isDuplicate: Boolean(findQuestionById(toQuestionId(question.questionNumber))),
        duplicateAction: null,
        outcome: "pending",
        previousQuestion: null,
        appliedQuestion: null,
        previousImageExisted: false,
        createdAt: now,
        updatedAt: now
      };
    });

    insertImportItems(items);

    const matched = items.filter((item) => item.imageStatus === "matched").length;
    const mediaSummary: MediaSummary = {
      expected: items.length,
      found: media.found,
      matched,
      missing: items.length - matched,
      extra: [...media.mapping.keys()].filter((number) => !workbookNumbers.has(number)).length
    };
    const validCount = items.filter((item) => item.validationStatus === "valid").length;
    const errorCount = issues.filter((item) => item.severity === "error").length;

    completeImportAnalysis({
      id: job.id,
      status: "ready",
      totalPages: media.totalPages,
      totalQuestions: items.length,
      successCount: validCount,
      failureCount: items.length - validCount,
      newCount: items.filter((item) => !item.isDuplicate).length,
      duplicateCount: items.filter((item) => item.isDuplicate).length,
      errorCount,
      sheetSummary: workbook.sheetSummary,
      mediaSummary,
      issues
    });

    return getImportJobDetail(job.id);
  } catch (error) {
    const message =
      error instanceof Error
        ? `تعذر تحليل ملفات الاستيراد: ${error.message}`
        : "تعذر تحليل ملفات الاستيراد.";
    removeImportMedia(job.id);
    await removeImportObjectMedia(job.id);
    completeImportAnalysis({
      id: job.id,
      status: "failed",
      totalPages: 0,
      totalQuestions: 0,
      successCount: 0,
      failureCount: 0,
      newCount: 0,
      duplicateCount: 0,
      errorCount: 1,
      sheetSummary: [],
      mediaSummary: { expected: 0, extra: 0, found: 0, matched: 0, missing: 0 },
      issues: [errorIssue("analysis_failed", message)],
      errorMessage: message
    });
    return getImportJobDetail(job.id);
  }
};

export const planDuplicateActions = (
  items: ImportJobItem[],
  request: ConfirmImportRequest
) => {
  const decisions = new Map<number, DuplicateAction>();

  for (const decision of request.duplicateDecisions ?? []) {
    if (
      !Number.isInteger(decision.questionNumber) ||
      !["replace", "skip", "stop"].includes(decision.action)
    ) {
      throw new AdminImportError("قرار التعامل مع الأسئلة المكررة غير صالح.");
    }
    decisions.set(decision.questionNumber, decision.action);
  }

  for (const item of items.filter((candidate) => candidate.isDuplicate)) {
    const action =
      decisions.get(item.questionNumber) ??
      (request.applyToAllDuplicates ? request.defaultDuplicateAction : undefined);
    if (!action) {
      throw new AdminImportError(
        `يجب تحديد قرار للسؤال المكرر ${item.questionNumber}.`
      );
    }
    decisions.set(item.questionNumber, action);
  }

  return decisions;
};

type PromotedImportItem = {
  existing: QuestionRecord | null;
  item: ImportJobItem;
  previousImageExisted: boolean;
  targetStorageKey: string;
};

const restorePromotedImages = async (
  jobId: string,
  promotedItems: PromotedImportItem[]
) => {
  for (const promoted of [...promotedItems].reverse()) {
    if (promoted.existing?.image_storage_key && promoted.previousImageExisted) {
      await restoreQuestionImageObjectBackup(
        jobId,
        promoted.item.questionId,
        promoted.existing.image_storage_key
      );
      if (promoted.existing.image_storage_key !== promoted.targetStorageKey) {
        await removeQuestionImageObject(promoted.item.questionId);
      }
      continue;
    }

    await removeQuestionImageObject(promoted.item.questionId);
  }
};

const commitImport = async (
  jobId: string,
  decisions: Map<number, DuplicateAction>
) => {
  const promotedItems: PromotedImportItem[] = [];

  try {
    const job = findImportJob(jobId);
    const items = listImportJobItems(jobId);
    if (!job || job.status !== "importing") {
      throw new Error("Import job is not ready for commit.");
    }

    let stopped = false;
    let createdCount = 0;
    let replacedCount = 0;
    let skippedCount = 0;
    let processedCount = 0;
    const databaseUpdates: Array<
      PromotedImportItem & {
        action: DuplicateAction | null;
        outcome: "created" | "replaced";
      }
    > = [];
    const skippedUpdates: Array<{
      action: DuplicateAction | null;
      item: ImportJobItem;
    }> = [];

    for (const item of items) {
      const action = item.isDuplicate ? decisions.get(item.questionNumber) ?? null : null;
      if (stopped || action === "skip" || action === "stop") {
        stopped = stopped || action === "stop";
        skippedCount += 1;
        processedCount += 1;
        skippedUpdates.push({ action, item });
        activeProgress.set(jobId, processedCount);
        continue;
      }

      const existing = findQuestionById(item.questionId);
      if (item.isDuplicate && !existing) {
        throw new Error(`السؤال ${item.questionNumber} تغير بعد المعاينة.`);
      }
      if (!item.isDuplicate && existing) {
        throw new Error(`السؤال ${item.questionNumber} أصبح مكرراً بعد المعاينة.`);
      }
      if (!item.correctAnswer || item.validationStatus !== "valid") {
        throw new Error(`السؤال ${item.questionNumber} غير صالح للاستيراد.`);
      }

      const previousImageExisted = await backupQuestionImageObject(
        jobId,
        item.questionId,
        existing?.image_storage_key
      );
      const targetStorageKey = await commitStagedQuestionImageObject(
        jobId,
        item.questionId
      );
      const promoted = {
        existing,
        item,
        previousImageExisted,
        targetStorageKey
      };
      promotedItems.push(promoted);
      databaseUpdates.push({
        ...promoted,
        action,
        outcome: existing ? "replaced" : "created"
      });

      if (existing) {
        replacedCount += 1;
      } else {
        createdCount += 1;
      }
      processedCount += 1;
      activeProgress.set(jobId, processedCount);
    }

    runImportTransaction(() => {
      for (const skipped of skippedUpdates) {
        updateImportItemResult({
          importJobId: jobId,
          questionNumber: skipped.item.questionNumber,
          duplicateAction: skipped.action,
          outcome: "skipped",
          previousQuestion: null,
          appliedQuestion: null,
          previousImageExisted: false
        });
      }

      for (const update of databaseUpdates) {
        saveQuestion({
          id: update.item.questionId,
          questionImageUrl: getQuestionImageUrl(update.item.questionId),
          imageStorageKey: update.targetStorageKey,
          sourcePdfId: job.sourcePdfId ?? undefined,
          sourcePage: update.item.pageNumber ?? undefined,
          correctAnswer: update.item.correctAnswer as NonNullable<typeof update.item.correctAnswer>,
          subject: "verbal",
          subjectId: "arabic",
          topic: update.item.topic,
          topicId: update.item.topicId,
          difficulty: update.item.difficulty,
          difficultyScore: update.item.difficulty,
          source: job.sourceType === "pdf" ? "pdf" : "manual",
          version: (update.existing?.version ?? 0) + 1,
          importJobId: jobId
        });

        const applied = findQuestionById(update.item.questionId);
        if (!applied) {
          throw new Error(`تعذر حفظ السؤال ${update.item.questionNumber}.`);
        }

        updateImportItemResult({
          importJobId: jobId,
          questionNumber: update.item.questionNumber,
          duplicateAction: update.action,
          outcome: update.outcome,
          previousQuestion: update.existing,
          appliedQuestion: applied,
          previousImageExisted: update.previousImageExisted
        });
      }

      completeImportJob({
        id: jobId,
        processedCount,
        successCount: createdCount + replacedCount,
        failureCount: 0,
        createdCount,
        replacedCount,
        skippedCount
      });
    });

    await removeImportObjectMedia(jobId);
    removeImportStaging(jobId);
  } catch (error) {
    await restorePromotedImages(jobId, promotedItems);
    removeImportMedia(jobId);
    await removeImportObjectMedia(jobId);
    failImportJob(
      jobId,
      error instanceof Error ? error.message : "فشلت معاملة الاستيراد."
    );
  } finally {
    activeProgress.delete(jobId);
  }
};

export const confirmQuestionImport = (
  jobId: string,
  request: ConfirmImportRequest
) => {
  const detail = getImportJobDetail(jobId);
  if (detail.job.status !== "ready") {
    throw new AdminImportError("عملية الاستيراد ليست جاهزة للتأكيد.", 409);
  }
  if (detail.job.errorCount > 0 || detail.items.some((item) => item.validationStatus === "error")) {
    throw new AdminImportError("لا يمكن تأكيد الاستيراد قبل معالجة جميع أخطاء التحقق.", 409);
  }

  const decisions = planDuplicateActions(detail.items, request);
  if (!markImportJobImporting(jobId)) {
    throw new AdminImportError("تم تغيير حالة الاستيراد. حدّث الصفحة وحاول مجدداً.", 409);
  }

  activeProgress.set(jobId, 0);
  setImmediate(() => commitImport(jobId, decisions));
  return getImportJobDetail(jobId);
};

export const cancelQuestionImport = async (jobId: string) => {
  if (!cancelImportJob(jobId)) {
    throw new AdminImportError("لا يمكن إلغاء عملية الاستيراد في حالتها الحالية.", 409);
  }
  removeImportMedia(jobId);
  await removeImportObjectMedia(jobId);
  return getImportJobDetail(jobId);
};

export const rollbackQuestionImport = async (jobId: string) => {
  const detail = getImportJobDetail(jobId);
  if (detail.job.status !== "completed") {
    throw new AdminImportError("يمكن التراجع عن عمليات الاستيراد المكتملة فقط.", 409);
  }

  const changedItems = detail.items.filter(
    (item) => item.outcome === "created" || item.outcome === "replaced"
  );
  for (const item of changedItems) {
    const current = findQuestionById(item.questionId);
    if (!current || current.import_job_id !== jobId) {
      throw new AdminImportError(
        `تعذر التراجع لأن السؤال ${item.questionNumber} تغير بعد هذا الاستيراد.`,
        409
      );
    }
    if (item.outcome === "created" && countQuestionReferences(item.questionId) > 0) {
      throw new AdminImportError(
        `تعذر حذف السؤال ${item.questionNumber} لأنه مستخدم في بيانات تعلم حالية.`,
        409
      );
    }
  }

  const objectSnapshots = new Map<
    string,
    { buffer: Buffer | null; storageKey: string | null }
  >();
  try {
    for (const item of changedItems) {
      const current = findQuestionById(item.questionId);
      objectSnapshots.set(item.questionId, {
        buffer: current
          ? await readQuestionImageObject(item.questionId, current.image_storage_key)
          : null,
        storageKey: current?.image_storage_key ?? null
      });

      if (item.outcome === "created") {
        await removeQuestionImageObject(item.questionId);
        continue;
      }

      if (!item.previousQuestion) {
        throw new Error(`لقطة السؤال ${item.questionNumber} السابقة غير موجودة.`);
      }

      if (item.previousImageExisted) {
        await restoreQuestionImageObjectBackup(
          jobId,
          item.questionId,
          item.previousQuestion.image_storage_key
        );
      } else {
        await removeQuestionImageObject(item.questionId);
      }
    }

    runImportTransaction(() => {
      for (const item of changedItems) {
        if (item.outcome === "created") {
          deleteQuestion(item.questionId);
          continue;
        }

        if (!item.previousQuestion) {
          throw new Error(`لقطة السؤال ${item.questionNumber} السابقة غير موجودة.`);
        }
        restoreQuestionRecord(item.previousQuestion);
      }

      if (!markImportJobRolledBack(jobId)) {
        throw new Error("تعذر تحديث سجل التراجع.");
      }
    });
  } catch (error) {
    for (const [questionId, snapshot] of objectSnapshots) {
      if (snapshot.buffer) {
        await writeQuestionImageObject(questionId, snapshot.buffer, snapshot.storageKey);
      } else {
        await removeQuestionImageObject(questionId);
      }
    }
    throw new AdminImportError(
      error instanceof Error ? error.message : "فشل التراجع عن الاستيراد.",
      409
    );
  }

  removeImportMedia(jobId);
  await removeImportObjectMedia(jobId);
  return getImportJobDetail(jobId);
};

export const getImportHistory = () => ({ jobs: listImportJobs() });

const normalizeTopicCountKey = (
  subjectId: LearningSubject,
  topicId: string | null,
  topicLabel: string
) => {
  return `${subjectId}:${topicId ?? topicLabel}`;
};

const toQuestionCountOverview = () => {
  const topicMaps = new Map<
    LearningSubject,
    Map<string, MutableAdminQuestionTopicCount>
  >();

  for (const subjectId of questionCountSubjectOrder) {
    const topics = new Map<string, MutableAdminQuestionTopicCount>();

    for (const topic of topicTaxonomy.filter(
      (candidate) => candidate.subject === subjectId
    )) {
      const subtopicsById = new Map<string, AdminQuestionSubtopicCount>();

      for (const subtopic of topic.subtopics) {
        subtopicsById.set(subtopic.slug, {
          count: 0,
          subtopicId: subtopic.slug,
          subtopicLabel: subtopic.displayNameAr
        });
      }

      topics.set(normalizeTopicCountKey(subjectId, topic.slug, topic.slug), {
        count: 0,
        subtopicsById,
        topicId: topic.slug,
        topicLabel: topic.displayNameAr
      });
    }

    topicMaps.set(subjectId, topics);
  }

  for (const row of listAdminQuestionTopicCounts()) {
    const subjectId = row.subject_id ?? legacySubjectToSubject[row.subject];
    const topics = topicMaps.get(subjectId);

    if (!topics) {
      continue;
    }

    const topicDefinition = topicTaxonomy.find(
      (topic) => topic.subject === subjectId && topic.slug === row.topic_id
    );
    const topicId = topicDefinition?.slug ?? row.topic_id;
    const topicLabel = topicDefinition?.displayNameAr ?? row.topic;
    const topicKey = normalizeTopicCountKey(subjectId, topicId, topicLabel);
    let topic = topics.get(topicKey);

    if (!topic) {
      topic = {
        count: 0,
        subtopicsById: new Map<string, AdminQuestionSubtopicCount>(),
        topicId,
        topicLabel
      };
      topics.set(topicKey, topic);
    }

    topic.count += row.question_count;

    const subtopicDefinition = topicDefinition?.subtopics.find(
      (subtopic) => subtopic.slug === row.subtopic_id
    );
    const subtopicId = subtopicDefinition?.slug ?? row.subtopic_id;
    const subtopicLabel =
      subtopicDefinition?.displayNameAr ?? row.subtopic ?? "";

    if (subtopicLabel) {
      const subtopicKey = subtopicId ?? subtopicLabel;
      const existingSubtopic = topic.subtopicsById.get(subtopicKey);

      topic.subtopicsById.set(subtopicKey, {
        count: (existingSubtopic?.count ?? 0) + row.question_count,
        subtopicId,
        subtopicLabel
      });
    }
  }

  const subjects: AdminQuestionSubjectCount[] = questionCountSubjectOrder.map(
    (subjectId) => {
      const topics = [...(topicMaps.get(subjectId)?.values() ?? [])].map(
        (topic) => ({
          count: topic.count,
          subtopics: [...topic.subtopicsById.values()],
          topicId: topic.topicId,
          topicLabel: topic.topicLabel
        })
      );

      return {
        subjectId,
        subjectLabel: questionCountSubjectLabels[subjectId],
        total: topics.reduce((total, topic) => total + topic.count, 0),
        topics
      };
    }
  );

  return { subjects };
};

export const getAdminQuestionBank = (input: {
  query?: string;
  page: number;
  pageSize: number;
  sort: "asc" | "desc";
}) => {
  const result = listAdminQuestions(input) as {
    page: number;
    pageSize: number;
    total: number;
    questions: Array<
      Record<string, unknown> & { id: string; imageStorageKey?: string | null }
    >;
  };
  return {
    ...result,
    questionCounts: toQuestionCountOverview(),
    questions: result.questions.map((question) => ({
      ...question,
      imageExists: Boolean(question.imageStorageKey) || questionImageExists(question.id),
      questionNumber: Number(question.id.replace(/^Q-/, ""))
    }))
  };
};
