import { extname, parse } from "node:path";
import { isPngBuffer } from "../../../media/media.service.js";
import type {
  ImportValidationIssue,
  PageRange,
  UploadedImportFile
} from "../importer.types.js";

export type MatchedUploadImage = {
  buffer: Buffer;
  originalname: string;
  questionNumber: number;
  temporaryPath?: string;
};

const parseImageQuestionNumber = (filename: string) => {
  if (extname(filename).toLowerCase() !== ".png") {
    return null;
  }

  const match = /^(?:Q-)?(\d+)$/i.exec(parse(filename).name.trim());
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isInteger(value) && value > 0 ? value : null;
};

export const matchUploadedImages = (
  images: UploadedImportFile[],
  questionRange?: PageRange
) => {
  const byQuestionNumber = new Map<number, MatchedUploadImage>();
  const issues: ImportValidationIssue[] = [];

  if (questionRange) {
    const expectedCount = questionRange.to - questionRange.from + 1;
    images.forEach((image, index) => {
      if (index >= expectedCount) {
        issues.push({
          code: "extra_image",
          message: `الصورة "${image.originalname}" زائدة عن نطاق الأسئلة المحدد.`,
          severity: "error"
        });
        return;
      }

      const questionNumber = questionRange.from + index;
      if (!isPngBuffer(image.buffer)) {
        issues.push({
          code: "invalid_image_type",
          message: `الصورة رقم ${index + 1} الخاصة بالسؤال ${questionNumber} ليست ملف PNG صالحاً.`,
          questionNumber,
          severity: "error"
        });
        return;
      }

      byQuestionNumber.set(questionNumber, {
        buffer: image.buffer,
        originalname: image.originalname,
        questionNumber,
        temporaryPath: image.temporaryPath
      });
    });
    return { byQuestionNumber, issues };
  }

  for (const image of images) {
    const questionNumber = parseImageQuestionNumber(image.originalname);

    if (questionNumber === null) {
      issues.push({
        code: "ambiguous_image_filename",
        message: `تعذر تحديد رقم السؤال من اسم الصورة "${image.originalname}". استخدم 500.png أو Q-500.png.`,
        severity: "error"
      });
      continue;
    }

    if (!isPngBuffer(image.buffer)) {
      issues.push({
        code: "invalid_image_type",
        message: `الصورة الخاصة بالسؤال ${questionNumber} ليست ملف PNG صالحاً.`,
        questionNumber,
        severity: "error"
      });
      continue;
    }

    if (byQuestionNumber.has(questionNumber)) {
      issues.push({
        code: "duplicate_image",
        message: `تم رفع أكثر من صورة للسؤال ${questionNumber}.`,
        questionNumber,
        severity: "error"
      });
      continue;
    }

    byQuestionNumber.set(questionNumber, {
      buffer: image.buffer,
      originalname: image.originalname,
      questionNumber,
      temporaryPath: image.temporaryPath
    });
  }

  return { byQuestionNumber, issues };
};

export { parseImageQuestionNumber };
