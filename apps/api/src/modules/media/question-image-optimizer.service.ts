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
  const image = sharp(pngBuffer, { limitInputPixels: 40_000_000 });
  const metadata = await image.metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width > 10_000 ||
    metadata.height > 10_000 ||
    metadata.width * metadata.height > 40_000_000
  ) {
    throw new Error("Question image dimensions exceed the safe processing limit.");
  }
  const buffer = await image
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
