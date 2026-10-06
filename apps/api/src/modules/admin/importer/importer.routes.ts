import { randomUUID } from "node:crypto";
import {
  closeSync,
  openSync,
  readFileSync,
  readSync,
  unlinkSync
} from "node:fs";
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { findSourcePdfById } from "../../source-pdfs/source-pdf.repository.js";
import {
  contentTypeForKey,
  objectStorage
} from "../../storage/object-storage.service.js";
import {
  ensureQuestionImportUploadDirectory,
  questionImportUploadDirectory
} from "../../media/media.service.js";
import { adminImportRateLimit } from "../../security/security.middleware.js";
import { writeSecurityEvent } from "../../security/security-audit.service.js";
import { asyncHandler } from "../../security/async-handler.js";
import {
  AdminImportError,
  analyzeQuestionImport,
  cancelQuestionImport,
  confirmQuestionImport,
  getAdminQuestionBank,
  getImportHistory,
  getImportJobDetail,
  getQuestionImportTaxonomy,
  rollbackQuestionImport
} from "./admin-import.service.js";
import { requireImportAdmin } from "./admin-import.middleware.js";
import type {
  ConfirmImportRequest,
  UploadedImportFile
} from "./importer.types.js";

export const importerRouter = Router();

const importerUploadFileSizeLimitBytes = 80 * 1024 * 1024;
const importerAggregateSizeLimitBytes = 250 * 1024 * 1024;
const importerExcelSizeLimitBytes = 10 * 1024 * 1024;
const importerImageSizeLimitBytes = 15 * 1024 * 1024;
const importerMaxImages = 500;
ensureQuestionImportUploadDirectory();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => {
      ensureQuestionImportUploadDirectory();
      callback(null, questionImportUploadDirectory);
    },
    filename: (_request, _file, callback) => callback(null, randomUUID())
  }),
  limits: {
    fields: 20,
    fieldNameSize: 100,
    fieldSize: 16 * 1024,
    files: importerMaxImages + 2,
    parts: importerMaxImages + 22,
    fileSize: importerUploadFileSizeLimitBytes
  }
});

const analyzeFields = upload.fields([
  { name: "excel", maxCount: 1 },
  { name: "excelFile", maxCount: 1 },
  { name: "pdf", maxCount: 1 },
  { name: "images", maxCount: importerMaxImages }
]);

const readFileHeader = (path: string, byteCount: number) => {
  const descriptor = openSync(path, "r");
  const header = Buffer.alloc(byteCount);
  try {
    const bytesRead = readSync(descriptor, header, 0, byteCount, 0);
    return header.subarray(0, bytesRead);
  } finally {
    closeSync(descriptor);
  }
};

const toUploadedFile = (
  file: Express.Multer.File,
  options: { headerOnly?: boolean } = {}
): UploadedImportFile => ({
  buffer: options.headerOnly
    ? readFileHeader(file.path, 8)
    : readFileSync(file.path),
  mimetype: file.mimetype,
  originalname: file.originalname,
  temporaryPath: file.path
});

const uploadedFiles = (request: Request) => {
  const files = request.files as
    | Record<string, Express.Multer.File[]>
    | undefined;
  return Object.values(files ?? {}).flat();
};

const cleanupUploadedFiles = (request: Request) => {
  for (const file of uploadedFiles(request)) {
    try {
      unlinkSync(file.path);
    } catch {
      // The upload may already have been removed after a failed multipart request.
    }
  }
};

const validateUploadedFileLimits = (request: Request) => {
  const files = uploadedFiles(request);
  const totalSize = files.reduce((total, file) => total + file.size, 0);
  if (totalSize > importerAggregateSizeLimitBytes) {
    throw new AdminImportError("إجمالي الملفات يتجاوز الحد المسموح وهو 250MB.", 413);
  }
  for (const file of files) {
    if ((file.fieldname === "excel" || file.fieldname === "excelFile") && file.size > importerExcelSizeLimitBytes) {
      throw new AdminImportError("حجم ملف Excel يتجاوز الحد المسموح وهو 10MB.", 413);
    }
    if (file.fieldname === "images" && file.size > importerImageSizeLimitBytes) {
      throw new AdminImportError("إحدى الصور تتجاوز الحد المسموح وهو 15MB.", 413);
    }
  }
};

const getField = (
  files: Record<string, Express.Multer.File[]> | undefined,
  name: string
) => files?.[name]?.[0];

const toPositiveInteger = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const toRange = (from: unknown, to: unknown) => {
  const parsedFrom = toPositiveInteger(from);
  const parsedTo = toPositiveInteger(to);
  return parsedFrom && parsedTo ? { from: parsedFrom, to: parsedTo } : undefined;
};

const handleRouteError = (error: unknown, response: Response) => {
  if (error instanceof AdminImportError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "حجم الملف يتجاوز الحد الأقصى المسموح وهو 80MB."
        : `تعذر قبول الملفات المرفوعة: ${error.message}`;
    response.status(400).json({ message });
    return;
  }

  console.error("Admin import request failed", error);
  response.status(500).json({ message: "تعذر تنفيذ طلب الاستيراد." });
};

importerRouter.use(requireImportAdmin);

const acceptAnalyzeUpload = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  analyzeFields(request, response, (error) => {
    if (error) {
      cleanupUploadedFiles(request);
      handleRouteError(error, response);
      return;
    }
    next();
  });
};

importerRouter.post("/analyze", adminImportRateLimit, acceptAnalyzeUpload, async (request, response) => {
  try {
    const files = request.files as
      | Record<string, Express.Multer.File[]>
      | undefined;
    validateUploadedFileLimits(request);
    const excel = getField(files, "excel") ?? getField(files, "excelFile");
    const pdf = getField(files, "pdf");
    const images = files?.images ?? [];

    if (!excel) {
      throw new AdminImportError("ملف Excel مطلوب.");
    }

    const body = request.body as Record<string, unknown>;
    const questionRange = toRange(body.questionFrom, body.questionTo);
    const pdfPageRange = toRange(body.pdfPageFrom, body.pdfPageTo);
    if (!questionRange) {
      throw new AdminImportError("نطاق أسئلة Excel مطلوب.");
    }
    if (questionRange.to - questionRange.from + 1 > importerMaxImages) {
      throw new AdminImportError(`لا يمكن استيراد أكثر من ${importerMaxImages} سؤالاً في العملية الواحدة.`);
    }
    const detail = await analyzeQuestionImport({
      createdBy: request.user?.email ?? "unknown",
      excel: toUploadedFile(excel),
      questionRange,
      pdf: pdf ? toUploadedFile(pdf) : undefined,
      pdfPageRange,
      images: images.map((image) =>
        toUploadedFile(image, { headerOnly: true })
      )
    });

    response.status(200).json(detail);
    writeSecurityEvent(request, "admin.import", {
      actorUserId: request.user?.id,
      detail: { action: "analyze" },
      outcome: "success",
      targetId: detail.job.id
    });
  } catch (error) {
    writeSecurityEvent(request, "admin.import", {
      actorUserId: request.user?.id,
      detail: { action: "analyze" },
      outcome: "failure"
    });
    handleRouteError(error, response);
  } finally {
    cleanupUploadedFiles(request);
  }
});

importerRouter.get("/taxonomy", (_request, response) => {
  response.status(200).json(getQuestionImportTaxonomy());
});

importerRouter.get("/questions", async (request, response) => {
  try {
    const page = toPositiveInteger(request.query.page) ?? 1;
    const requestedPageSize = toPositiveInteger(request.query.pageSize) ?? 50;
    const pageSize = Math.min(requestedPageSize, 100);
    const sort = request.query.sort === "desc" ? "desc" : "asc";
    const query =
      typeof request.query.query === "string" ? request.query.query : undefined;

    response.status(200).json(
      await getAdminQuestionBank({ page, pageSize, query, sort })
    );
  } catch (error) {
    handleRouteError(error, response);
  }
});

importerRouter.get("/jobs", asyncHandler(async (_request, response) => {
  response.status(200).json(await getImportHistory());
}));

importerRouter.get("/jobs/:id", async (request, response) => {
  try {
    response.status(200).json(await getImportJobDetail(request.params.id));
  } catch (error) {
    handleRouteError(error, response);
  }
});

importerRouter.post("/jobs/:id/confirm", adminImportRateLimit, async (request, response) => {
  try {
    const jobId = String(request.params.id);
    const detail = await confirmQuestionImport(
      jobId,
      (request.body ?? {}) as ConfirmImportRequest
    );
    response.status(202).json(detail);
    writeSecurityEvent(request, "admin.import", {
      actorUserId: request.user?.id,
      detail: { action: "confirm" },
      outcome: "success",
      targetId: jobId
    });
  } catch (error) {
    handleRouteError(error, response);
  }
});

importerRouter.post("/jobs/:id/cancel", adminImportRateLimit, async (request, response) => {
  try {
    response.status(200).json(await cancelQuestionImport(String(request.params.id)));
  } catch (error) {
    handleRouteError(error, response);
  }
});

importerRouter.post("/jobs/:id/rollback", adminImportRateLimit, async (request, response) => {
  try {
    response.status(200).json(await rollbackQuestionImport(String(request.params.id)));
  } catch (error) {
    handleRouteError(error, response);
  }
});

importerRouter.get("/source-pdfs/:id/file", async (request, response) => {
  try {
    const sourcePdf = await findSourcePdfById(request.params.id);
    if (!sourcePdf) {
      response.status(404).json({ message: "ملف PDF غير موجود." });
      return;
    }

    const storedPdf = await objectStorage.getObject(sourcePdf.storage_key);
    if (!storedPdf) {
      response.status(404).json({ message: "ملف PDF غير موجود في التخزين." });
      return;
    }

    const encodedFilename = encodeURIComponent(sourcePdf.original_filename);
    response.setHeader(
      "content-type",
      storedPdf.contentType ?? contentTypeForKey(sourcePdf.storage_key)
    );
    response.setHeader(
      "content-disposition",
      `attachment; filename*=UTF-8''${encodedFilename}`
    );
    if (storedPdf.contentLength !== undefined) {
      response.setHeader("content-length", String(storedPdf.contentLength));
    }
    storedPdf.body.pipe(response);
  } catch (error) {
    handleRouteError(error, response);
  }
});

importerRouter.post("/pdf", (_request, response) => {
  response.status(410).json({
    message:
      "تم استبدال الاستيراد المباشر بمسار التحليل والتأكيد الآمن. استخدم /admin/import/analyze ثم أكّد العملية."
  });
});
