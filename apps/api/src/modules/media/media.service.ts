import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  contentTypeForKey,
  objectStorage
} from "../storage/object-storage.service.js";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(moduleDirectory, "../../../../..");

export const questionMediaDirectory = resolve(
  workspaceRoot,
  "media",
  "questions"
);

export const questionImagesPublicPath = "/question-images";
export const questionImageStorageExtension = "webp";

export const questionImportMediaDirectory = resolve(
  workspaceRoot,
  "media",
  "imports"
);

export const questionImportUploadDirectory = resolve(
  questionImportMediaDirectory,
  "_uploads"
);

const assertStorageIdentifier = (value: string, label: string) => {
  if (!/^[A-Za-z0-9-]+$/.test(value)) {
    throw new Error(`Invalid ${label}.`);
  }
};

export const ensureQuestionMediaDirectory = () => {
  mkdirSync(questionMediaDirectory, { recursive: true });
};

export const getQuestionImageFileName = (questionId: string) => {
  return `${questionId}.${questionImageStorageExtension}`;
};

export const getLegacyQuestionImageFileName = (questionId: string) => {
  return `${questionId}.png`;
};

export const getQuestionImagePath = (questionId: string) => {
  return resolve(questionMediaDirectory, getQuestionImageFileName(questionId));
};

export const getQuestionImageUrl = (questionId: string) => {
  return `${questionImagesPublicPath}/${getQuestionImageFileName(questionId)}`;
};

export const getLegacyQuestionImagePath = (questionId: string) => {
  return resolve(questionMediaDirectory, getLegacyQuestionImageFileName(questionId));
};

export const getQuestionImageStorageKey = (questionId: string) => {
  assertStorageIdentifier(questionId, "question id");
  return `questions/${questionId}/question.${questionImageStorageExtension}`;
};

export const getSourcePdfStorageKey = (sourcePdfId: string) => {
  assertStorageIdentifier(sourcePdfId, "source PDF id");
  return `pdfs/originals/${sourcePdfId}/original.pdf`;
};

export const getStagedQuestionImageStorageKey = (
  importJobId: string,
  questionId: string
) => {
  assertStorageIdentifier(importJobId, "import job id");
  assertStorageIdentifier(questionId, "question id");
  return `imports/${importJobId}/staged/${questionId}.${questionImageStorageExtension}`;
};

export const getImportBackupImageStorageKey = (
  importJobId: string,
  questionId: string
) => {
  assertStorageIdentifier(importJobId, "import job id");
  assertStorageIdentifier(questionId, "question id");
  return `imports/${importJobId}/backup/${questionId}.${questionImageStorageExtension}`;
};

export const questionImageExists = (questionId: string) => {
  return (
    existsSync(getQuestionImagePath(questionId)) ||
    existsSync(getLegacyQuestionImagePath(questionId))
  );
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

export const readQuestionImage = (questionId: string) => {
  const imagePath = getQuestionImagePath(questionId);
  if (existsSync(imagePath)) {
    return readFileSync(imagePath);
  }

  const legacyImagePath = getLegacyQuestionImagePath(questionId);
  return existsSync(legacyImagePath) ? readFileSync(legacyImagePath) : null;
};

export const removeQuestionImage = (questionId: string) => {
  const imagePath = getQuestionImagePath(questionId);
  if (existsSync(imagePath)) {
    unlinkSync(imagePath);
  }
  const legacyImagePath = getLegacyQuestionImagePath(questionId);
  if (existsSync(legacyImagePath)) {
    unlinkSync(legacyImagePath);
  }
};

export const getImportMediaDirectory = (importJobId: string) => {
  assertStorageIdentifier(importJobId, "import job id");
  return resolve(questionImportMediaDirectory, importJobId);
};

export const getStagedQuestionImagePath = (
  importJobId: string,
  questionId: string
) => {
  assertStorageIdentifier(questionId, "question id");
  return resolve(
    getImportMediaDirectory(importJobId),
    "staged",
    getQuestionImageFileName(questionId)
  );
};

export const getImportBackupImagePath = (
  importJobId: string,
  questionId: string
) => {
  assertStorageIdentifier(questionId, "question id");
  return resolve(
    getImportMediaDirectory(importJobId),
    "backup",
    getQuestionImageFileName(questionId)
  );
};

export const stageQuestionImage = (
  importJobId: string,
  questionId: string,
  image: Buffer
) => {
  const target = getStagedQuestionImagePath(importJobId, questionId);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, image);
  return target;
};

export const stageQuestionImageFile = (
  importJobId: string,
  questionId: string,
  sourcePath: string
) => {
  const target = getStagedQuestionImagePath(importJobId, questionId);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(sourcePath, target);
  return target;
};

export const ensureQuestionImportUploadDirectory = () => {
  mkdirSync(questionImportUploadDirectory, { recursive: true });
};

export const stagedQuestionImageExists = (
  importJobId: string,
  questionId: string
) => existsSync(getStagedQuestionImagePath(importJobId, questionId));

export const commitStagedQuestionImage = (
  importJobId: string,
  questionId: string
) => {
  const source = getStagedQuestionImagePath(importJobId, questionId);
  if (!existsSync(source)) {
    throw new Error(`Staged question image is missing: ${questionId}.png`);
  }

  ensureQuestionMediaDirectory();
  copyFileSync(source, getQuestionImagePath(questionId));
};

export const backupQuestionImage = (
  importJobId: string,
  questionId: string
) => {
  const source = getQuestionImagePath(questionId);
  if (!existsSync(source)) {
    return false;
  }

  const backup = getImportBackupImagePath(importJobId, questionId);
  mkdirSync(dirname(backup), { recursive: true });
  copyFileSync(source, backup);
  return true;
};

export const restoreQuestionImageBackup = (
  importJobId: string,
  questionId: string
) => {
  const backup = getImportBackupImagePath(importJobId, questionId);
  if (!existsSync(backup)) {
    throw new Error(`Question image backup is missing: ${questionId}.png`);
  }

  ensureQuestionMediaDirectory();
  copyFileSync(backup, getQuestionImagePath(questionId));
};

export const removeImportMedia = (importJobId: string) => {
  rmSync(getImportMediaDirectory(importJobId), {
    force: true,
    recursive: true
  });
};

export const removeImportStaging = (importJobId: string) => {
  rmSync(resolve(getImportMediaDirectory(importJobId), "staged"), {
    force: true,
    recursive: true
  });
};

export const stageQuestionImageObject = async (
  importJobId: string,
  questionId: string,
  image: Buffer
) => {
  const key = getStagedQuestionImageStorageKey(importJobId, questionId);
  await objectStorage.uploadObject({
    body: image,
    contentType: contentTypeForKey(key),
    key
  });
  return key;
};

export const stagedQuestionImageObjectExists = async (
  importJobId: string,
  questionId: string
) => objectStorage.objectExists(getStagedQuestionImageStorageKey(importJobId, questionId));

export const commitStagedQuestionImageObject = async (
  importJobId: string,
  questionId: string
) => {
  const source = getStagedQuestionImageStorageKey(importJobId, questionId);
  const target = getQuestionImageStorageKey(questionId);
  if (!(await objectStorage.objectExists(source))) {
    throw new Error(`Staged question image is missing: ${questionId}.${questionImageStorageExtension}`);
  }

  await objectStorage.copyObject(source, target, {
    contentType: contentTypeForKey(target)
  });
  return target;
};

export const backupQuestionImageObject = async (
  importJobId: string,
  questionId: string,
  currentStorageKey?: string | null
) => {
  const source = currentStorageKey ?? getQuestionImageStorageKey(questionId);
  if (!(await objectStorage.objectExists(source))) {
    return false;
  }

  await objectStorage.copyObject(source, getImportBackupImageStorageKey(importJobId, questionId), {
    contentType: contentTypeForKey(source)
  });
  return true;
};

export const restoreQuestionImageObjectBackup = async (
  importJobId: string,
  questionId: string,
  targetStorageKey?: string | null
) => {
  const backup = getImportBackupImageStorageKey(importJobId, questionId);
  if (!(await objectStorage.objectExists(backup))) {
    throw new Error(`Question image backup is missing: ${questionId}.${questionImageStorageExtension}`);
  }

  const target = targetStorageKey ?? getQuestionImageStorageKey(questionId);
  await objectStorage.copyObject(backup, target, {
    contentType: contentTypeForKey(target)
  });
};

export const removeQuestionImageObject = async (questionId: string) => {
  await objectStorage.deleteObject(getQuestionImageStorageKey(questionId));
};

export const readQuestionImageObject = async (
  questionId: string,
  storageKey?: string | null
) => {
  return objectStorage.getObjectBuffer(storageKey ?? getQuestionImageStorageKey(questionId));
};

export const writeQuestionImageObject = async (
  questionId: string,
  image: Buffer,
  storageKey?: string | null
) => {
  const key = storageKey ?? getQuestionImageStorageKey(questionId);
  await objectStorage.uploadObject({
    body: image,
    contentType: contentTypeForKey(key),
    key
  });
  return key;
};

export const removeImportObjectMedia = async (importJobId: string) => {
  assertStorageIdentifier(importJobId, "import job id");
  await objectStorage.deletePrefix(`imports/${importJobId}`);
};

export const isPngBuffer = (buffer: Buffer) => {
  return (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )
  );
};
