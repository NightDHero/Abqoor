import { extname } from "node:path";
import {
  backupQuestionImage,
  commitStagedQuestionImage,
  getQuestionImageUrl,
  isPngBuffer,
  questionImageExists,
  readQuestionImage,
  removeImportMedia,
  removeImportStaging,
  removeQuestionImage,
  restoreQuestionImageBackup,
  stageQuestionImage,
  stageQuestionImageFile,
  writeQuestionImage
} from "../../media/media.service.js";
import {
  countQuestionReferences,
  deleteQuestion,
  findQuestionById,
  restoreQuestionRecord
} from "../../questions/question.repository.js";
import { saveQuestion } from "../../questions/question.service.js";
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
  updateImportItemResult
} from "./import-job.repository.js";
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
      stageQuestionImage(jobId, questionId, image);
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

  return { found: pageCount, mapping, totalPages: pageCount };
};

const analyzeImageMedia = (
  jobId: string,
  request: AnalyzeImportRequest,
  issues: ImportValidationIssue[]
) => {
  const result = matchUploadedImages(request.images ?? []);
  issues.push(...result.issues);
  const mapping = new Map<number, { pageNumber: number | null; sourceImageName: string }>();

  for (const image of result.byQuestionNumber.values()) {
    if (image.temporaryPath) {
      stageQuestionImageFile(
        jobId,
        toQuestionId(image.questionNumber),
        image.temporaryPath
      );
    } else {
      stageQuestionImage(jobId, toQuestionId(image.questionNumber), image.buffer);
    }
    mapping.set(image.questionNumber, {
      pageNumber: null,
      sourceImageName: image.originalname
    });
  }

  return {
    found: request.images?.length ?? 0,
    mapping,
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
      : analyzeImageMedia(job.id, request, issues);
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

const restoreFileChanges = (
  snapshots: Map<string, Buffer | null>
) => {
  for (const [questionId, previousImage] of snapshots) {
    if (previousImage) {
      writeQuestionImage(questionId, previousImage, { overwriteExisting: true });
    } else {
      removeQuestionImage(questionId);
    }
  }
};

const commitImport = (
  jobId: string,
  decisions: Map<number, DuplicateAction>
) => {
  const fileSnapshots = new Map<string, Buffer | null>();

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

    runImportTransaction(() => {
      for (const item of items) {
        const action = item.isDuplicate ? decisions.get(item.questionNumber) ?? null : null;
        if (stopped || action === "skip" || action === "stop") {
          stopped = stopped || action === "stop";
          skippedCount += 1;
          processedCount += 1;
          updateImportItemResult({
            importJobId: jobId,
            questionNumber: item.questionNumber,
            duplicateAction: action,
            outcome: "skipped",
            previousQuestion: null,
            appliedQuestion: null,
            previousImageExisted: false
          });
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

        const previousImage = readQuestionImage(item.questionId);
        fileSnapshots.set(item.questionId, previousImage);
        const previousImageExisted = backupQuestionImage(jobId, item.questionId);
        commitStagedQuestionImage(jobId, item.questionId);

        saveQuestion({
          id: item.questionId,
          questionImageUrl: getQuestionImageUrl(item.questionId),
          correctAnswer: item.correctAnswer,
          subject: "verbal",
          subjectId: "arabic",
          topic: item.topic,
          topicId: item.topicId,
          difficulty: item.difficulty,
          difficultyScore: item.difficulty,
          source: job.sourceType === "pdf" ? "pdf" : "manual",
          version: (existing?.version ?? 0) + 1,
          importJobId: jobId
        });

        const applied = findQuestionById(item.questionId);
        if (!applied) {
          throw new Error(`تعذر حفظ السؤال ${item.questionNumber}.`);
        }

        const outcome = existing ? "replaced" : "created";
        if (existing) {
          replacedCount += 1;
        } else {
          createdCount += 1;
        }
        processedCount += 1;
        updateImportItemResult({
          importJobId: jobId,
          questionNumber: item.questionNumber,
          duplicateAction: action,
          outcome,
          previousQuestion: existing,
          appliedQuestion: applied,
          previousImageExisted
        });
        activeProgress.set(jobId, processedCount);
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

    removeImportStaging(jobId);
  } catch (error) {
    restoreFileChanges(fileSnapshots);
    removeImportMedia(jobId);
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

export const cancelQuestionImport = (jobId: string) => {
  if (!cancelImportJob(jobId)) {
    throw new AdminImportError("لا يمكن إلغاء عملية الاستيراد في حالتها الحالية.", 409);
  }
  removeImportMedia(jobId);
  return getImportJobDetail(jobId);
};

export const rollbackQuestionImport = (jobId: string) => {
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

  const fileSnapshots = new Map<string, Buffer | null>();
  try {
    runImportTransaction(() => {
      for (const item of changedItems) {
        fileSnapshots.set(item.questionId, readQuestionImage(item.questionId));
        if (item.outcome === "created") {
          removeQuestionImage(item.questionId);
          deleteQuestion(item.questionId);
          continue;
        }

        if (!item.previousQuestion) {
          throw new Error(`لقطة السؤال ${item.questionNumber} السابقة غير موجودة.`);
        }
        restoreQuestionRecord(item.previousQuestion);
        if (item.previousImageExisted) {
          restoreQuestionImageBackup(jobId, item.questionId);
        } else {
          removeQuestionImage(item.questionId);
        }
      }

      if (!markImportJobRolledBack(jobId)) {
        throw new Error("تعذر تحديث سجل التراجع.");
      }
    });
  } catch (error) {
    restoreFileChanges(fileSnapshots);
    throw new AdminImportError(
      error instanceof Error ? error.message : "فشل التراجع عن الاستيراد.",
      409
    );
  }

  removeImportMedia(jobId);
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
    questions: Array<Record<string, unknown> & { id: string }>;
  };
  return {
    ...result,
    questionCounts: toQuestionCountOverview(),
    questions: result.questions.map((question) => ({
      ...question,
      imageExists: questionImageExists(question.id),
      questionNumber: Number(question.id.replace(/^Q-/, ""))
    }))
  };
};
