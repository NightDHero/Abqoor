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
import {
  AdminImportError,
  analyzeQuestionImport,
  cancelQuestionImport,
  confirmQuestionImport,
  getAdminQuestionBank,
  getImportHistory,
  getImportJobDetail,
  rollbackQuestionImport
} from "./admin-import.service.js";
import { requireImportAdmin } from "./admin-import.middleware.js";
import type {
  ConfirmImportRequest,
  UploadedImportFile
} from "./importer.types.js";

export const importerRouter = Router();

const importerUploadFileSizeLimitBytes = 120 * 1024 * 1024;
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
    files: 2002,
    fileSize: importerUploadFileSizeLimitBytes
  }
});

const analyzeFields = upload.fields([
  { name: "excel", maxCount: 1 },
  { name: "excelFile", maxCount: 1 },
  { name: "pdf", maxCount: 1 },
  { name: "images", maxCount: 2000 }
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

const getField = (
  files: Record<string, Express.Multer.File[]> | undefined,
  name: string
) => files?.[name]?.[0];

const toPositiveInteger = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const handleRouteError = (error: unknown, response: Response) => {
  if (error instanceof AdminImportError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "حجم الملف يتجاوز الحد الأقصى المسموح وهو 120MB."
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

importerRouter.post("/analyze", acceptAnalyzeUpload, async (request, response) => {
  try {
    const files = request.files as
      | Record<string, Express.Multer.File[]>
      | undefined;
    const excel = getField(files, "excel") ?? getField(files, "excelFile");
    const pdf = getField(files, "pdf");
    const images = files?.images ?? [];

    if (!excel) {
      throw new AdminImportError("ملف Excel مطلوب.");
    }

    const startQuestionNumber = toPositiveInteger(
      (request.body as Record<string, unknown>).startQuestionNumber
    );
    const detail = await analyzeQuestionImport({
      createdBy: request.user?.email ?? "unknown",
      excel: toUploadedFile(excel),
      pdf: pdf ? toUploadedFile(pdf) : undefined,
      images: images.map((image) =>
        toUploadedFile(image, { headerOnly: true })
      ),
      startQuestionNumber: startQuestionNumber ?? undefined
    });

    response.status(200).json(detail);
  } catch (error) {
    handleRouteError(error, response);
  } finally {
    cleanupUploadedFiles(request);
  }
});

importerRouter.get("/questions", (request, response) => {
  try {
    const page = toPositiveInteger(request.query.page) ?? 1;
    const requestedPageSize = toPositiveInteger(request.query.pageSize) ?? 50;
    const pageSize = Math.min(requestedPageSize, 100);
    const sort = request.query.sort === "desc" ? "desc" : "asc";
    const query =
      typeof request.query.query === "string" ? request.query.query : undefined;

    response.status(200).json(
      getAdminQuestionBank({ page, pageSize, query, sort })
    );
  } catch (error) {
    handleRouteError(error, response);
  }
});

importerRouter.get("/jobs", (_request, response) => {
  response.status(200).json(getImportHistory());
});

importerRouter.get("/jobs/:id", (request, response) => {
  try {
    response.status(200).json(getImportJobDetail(request.params.id));
  } catch (error) {
    handleRouteError(error, response);
  }
});

importerRouter.post("/jobs/:id/confirm", (request, response) => {
  try {
    const detail = confirmQuestionImport(
      request.params.id,
      (request.body ?? {}) as ConfirmImportRequest
    );
    response.status(202).json(detail);
  } catch (error) {
    handleRouteError(error, response);
  }
});

importerRouter.post("/jobs/:id/cancel", async (request, response) => {
  try {
    response.status(200).json(await cancelQuestionImport(request.params.id));
  } catch (error) {
    handleRouteError(error, response);
  }
});

importerRouter.post("/jobs/:id/rollback", async (request, response) => {
  try {
    response.status(200).json(await rollbackQuestionImport(request.params.id));
  } catch (error) {
    handleRouteError(error, response);
  }
});

importerRouter.get("/source-pdfs/:id/file", async (request, response) => {
  try {
    const sourcePdf = findSourcePdfById(request.params.id);
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
