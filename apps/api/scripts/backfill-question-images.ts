import { existsSync, readFileSync } from "node:fs";
import { db } from "../src/database/client.js";
import {
  getLegacyQuestionImagePath,
  getQuestionImagePath,
  getQuestionImageStorageKey,
  getQuestionImageUrl,
  isPngBuffer
} from "../src/modules/media/media.service.js";
import { optimizeQuestionImage } from "../src/modules/media/question-image-optimizer.service.js";
import {
  contentTypeForKey,
  objectStorage
} from "../src/modules/storage/object-storage.service.js";

type QuestionImageRow = {
  id: string;
  image_storage_key: string | null;
  question_image_url: string;
};

const updateQuestionStorageStatement = db.prepare(`
  UPDATE questions
  SET
    image_storage_key = @imageStorageKey,
    question_image_url = @questionImageUrl,
    updated_at = @updatedAt
  WHERE id = @id
`);

const localImagePathForQuestion = (question: QuestionImageRow) => {
  const candidates = [
    question.question_image_url.endsWith(".webp")
      ? getQuestionImagePath(question.id)
      : getLegacyQuestionImagePath(question.id),
    getQuestionImagePath(question.id),
    getLegacyQuestionImagePath(question.id)
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
};

const backfillQuestionImages = async () => {
  const questions = db
    .prepare<[], QuestionImageRow>(
      `
        SELECT id, question_image_url, image_storage_key
        FROM questions
        ORDER BY id ASC
      `
    )
    .all();

  let migrated = 0;
  let skipped = 0;
  let missing = 0;

  for (const question of questions) {
    const targetKey = question.image_storage_key ?? getQuestionImageStorageKey(question.id);
    if (question.image_storage_key && (await objectStorage.objectExists(targetKey))) {
      skipped += 1;
      continue;
    }

    if (await objectStorage.objectExists(targetKey)) {
      updateQuestionStorageStatement.run({
        id: question.id,
        imageStorageKey: targetKey,
        questionImageUrl: getQuestionImageUrl(question.id),
        updatedAt: new Date().toISOString()
      });
      skipped += 1;
      continue;
    }

    const localPath = localImagePathForQuestion(question);
    if (!localPath) {
      console.warn(`Missing local image for ${question.id}; leaving row unchanged.`);
      missing += 1;
      continue;
    }

    const localImage = readFileSync(localPath);
    const uploadImage = isPngBuffer(localImage)
      ? (await optimizeQuestionImage(localImage)).buffer
      : localImage;

    await objectStorage.uploadObject({
      body: uploadImage,
      contentType: contentTypeForKey(targetKey),
      key: targetKey
    });

    if (!(await objectStorage.objectExists(targetKey))) {
      throw new Error(`Uploaded object could not be verified: ${targetKey}`);
    }

    updateQuestionStorageStatement.run({
      id: question.id,
      imageStorageKey: targetKey,
      questionImageUrl: getQuestionImageUrl(question.id),
      updatedAt: new Date().toISOString()
    });
    migrated += 1;
    console.log(`Migrated ${question.id} -> ${targetKey}`);
  }

  console.log(
    `Question image backfill complete. migrated=${migrated} skipped=${skipped} missing=${missing}`
  );
};

await backfillQuestionImages();
db.close();
