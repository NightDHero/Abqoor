import sharp from "sharp";
import { env } from "../../config/env.js";

export type OptimizedQuestionImage = {
  buffer: Buffer;
  contentType: "image/webp";
  format: "webp";
  quality: number;
  sizeBytes: number;
};

export const optimizeQuestionImage = async (
  pngBuffer: Buffer
): Promise<OptimizedQuestionImage> => {
  const buffer = await sharp(pngBuffer)
    .webp({
      effort: 5,
      quality: env.questionImageWebpQuality
    })
    .toBuffer();

  return {
    buffer,
    contentType: "image/webp",
    format: "webp",
    quality: env.questionImageWebpQuality,
    sizeBytes: buffer.length
  };
};
