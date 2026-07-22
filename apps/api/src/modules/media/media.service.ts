import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(moduleDirectory, "../../../../..");

export const questionMediaDirectory = resolve(
  workspaceRoot,
  "media",
  "questions"
);

export const questionImagesPublicPath = "/question-images";

export const ensureQuestionMediaDirectory = () => {
  mkdirSync(questionMediaDirectory, { recursive: true });
};

export const getQuestionImageFileName = (questionId: string) => {
  return `${questionId}.png`;
};

export const getQuestionImagePath = (questionId: string) => {
  return resolve(questionMediaDirectory, getQuestionImageFileName(questionId));
};

export const getQuestionImageUrl = (questionId: string) => {
  return `${questionImagesPublicPath}/${getQuestionImageFileName(questionId)}`;
};

export const questionImageExists = (questionId: string) => {
  return existsSync(getQuestionImagePath(questionId));
};

export const writeQuestionImage = (
  questionId: string,
  image: Buffer,
  options?: { overwriteExisting?: boolean }
) => {
  ensureQuestionMediaDirectory();

  const imagePath = getQuestionImagePath(questionId);

  if (existsSync(imagePath) && !options?.overwriteExisting) {
    throw new Error(`Question image already exists: ${getQuestionImageFileName(questionId)}`);
  }

  mkdirSync(dirname(imagePath), { recursive: true });
  writeFileSync(imagePath, image);
};
