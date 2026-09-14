import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { after, test } from "node:test";
import type { S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-storage-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.ADMIN_EMAILS = "";
process.env.JWT_SECRET = "storage-test-secret";
process.env.NODE_ENV = "test";
process.env.STORAGE_DRIVER = "local";

const { createApp } = await import("../src/app.js");
const { db } = await import("../src/database/client.js");
const { optimizeQuestionImage } = await import(
  "../src/modules/media/question-image-optimizer.service.js"
);
const {
  getQuestionImageStorageKey,
  getQuestionImageUrl
} = await import("../src/modules/media/media.service.js");
const { objectStorage } = await import(
  "../src/modules/storage/object-storage.service.js"
);
const { createR2ObjectStorage } = await import(
  "../src/modules/storage/object-storage.service.js"
);

const app = createApp();
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADklEQVQImWP4DwUMMAYAj4IP8cvlVgcAAAAASUVORK5CYII=",
  "base64"
);

test("local object storage supports upload, read, copy, existence, and delete", async () => {
  const sourceKey = "generated/storage-tests/source.txt";
  const copyKey = "generated/storage-tests/copy.txt";
  const body = Buffer.from("abqoor storage adapter");

  await objectStorage.uploadObject({
    body,
    contentType: "text/plain",
    key: sourceKey
  });
  assert.equal(await objectStorage.objectExists(sourceKey), true);
  assert.deepEqual(await objectStorage.getObjectBuffer(sourceKey), body);

  await objectStorage.copyObject(sourceKey, copyKey, {
    contentType: "text/plain"
  });
  assert.deepEqual(await objectStorage.getObjectBuffer(copyKey), body);

  await objectStorage.deleteObject(sourceKey);
  assert.equal(await objectStorage.objectExists(sourceKey), false);

  await objectStorage.deletePrefix("generated/storage-tests");
  assert.equal(await objectStorage.objectExists(copyKey), false);
});

test("R2 object storage adapter supports S3-style object operations without real credentials", async () => {
  type StoredFakeObject = {
    body: Buffer;
    contentType?: string;
  };

  const objects = new Map<string, StoredFakeObject>();
  const bucket = "abqoor-test-bucket";
  const notFound = () => {
    const error = new Error("Object not found") as Error & {
      $metadata: { httpStatusCode: number };
      name: string;
    };
    error.name = "NoSuchKey";
    error.$metadata = { httpStatusCode: 404 };
    return error;
  };

  const commandInput = (command: unknown) =>
    (command as { input: Record<string, unknown> }).input;
  const commandName = (command: unknown) =>
    (command as { constructor: { name: string } }).constructor.name;
  const sourceKeyFromCopySource = (copySource: unknown) =>
    String(copySource)
      .replace(`${bucket}/`, "")
      .split("/")
      .map(decodeURIComponent)
      .join("/");

  const fakeClient = {
    async send(command: unknown) {
      const input = commandInput(command);
      const key = String(input.Key ?? "");

      switch (commandName(command)) {
        case "PutObjectCommand": {
          objects.set(key, {
            body: Buffer.from(input.Body as Uint8Array),
            contentType: input.ContentType as string | undefined
          });
          return {};
        }
        case "HeadObjectCommand": {
          if (!objects.has(key)) {
            throw notFound();
          }
          return {};
        }
        case "GetObjectCommand": {
          const object = objects.get(key);
          if (!object) {
            throw notFound();
          }
          return {
            Body: Readable.from(object.body),
            ContentLength: object.body.length,
            ContentType: object.contentType
          };
        }
        case "CopyObjectCommand": {
          const source = objects.get(sourceKeyFromCopySource(input.CopySource));
          if (!source) {
            throw notFound();
          }
          objects.set(key, {
            body: Buffer.from(source.body),
            contentType: input.ContentType as string | undefined
          });
          return {};
        }
        case "DeleteObjectCommand": {
          objects.delete(key);
          return {};
        }
        case "ListObjectsV2Command": {
          const prefix = String(input.Prefix ?? "");
          return {
            Contents: [...objects.keys()]
              .filter((objectKey) => objectKey.startsWith(prefix))
              .map((objectKey) => ({ Key: objectKey }))
          };
        }
        case "DeleteObjectsCommand": {
          const deleteInput = input.Delete as
            | { Objects?: Array<{ Key?: string }> }
            | undefined;
          for (const object of deleteInput?.Objects ?? []) {
            if (object.Key) {
              objects.delete(object.Key);
            }
          }
          return {};
        }
        default:
          throw new Error(`Unexpected command: ${commandName(command)}`);
      }
    }
  };

  const storage = createR2ObjectStorage(
    fakeClient as unknown as Pick<S3Client, "send">,
    bucket
  );
  const sourceKey = "generated/r2-tests/source.txt";
  const copyKey = "generated/r2-tests/copy.txt";
  const body = Buffer.from("abqoor mocked r2 adapter");

  await storage.uploadObject({ body, contentType: "text/plain", key: sourceKey });
  assert.equal(await storage.objectExists(sourceKey), true);
  assert.deepEqual(await storage.getObjectBuffer(sourceKey), body);

  await storage.copyObject(sourceKey, copyKey, { contentType: "text/plain" });
  assert.deepEqual(await storage.getObjectBuffer(copyKey), body);

  await storage.deleteObject(sourceKey);
  assert.equal(await storage.objectExists(sourceKey), false);

  await storage.deletePrefix("generated/r2-tests");
  assert.equal(await storage.objectExists(copyKey), false);

  for (const unsafeKey of [
    "../escape.txt",
    "../../secret",
    "..\\..\\secret",
    "/absolute/path",
    "C:\\secret",
    "questions/../../secret"
  ]) {
    await assert.rejects(
      storage.uploadObject({ body, key: unsafeKey }),
      /Invalid object storage key/
    );
  }
});

test("question image optimizer creates readable WebP output", async () => {
  const optimized = await optimizeQuestionImage(png);
  assert.equal(optimized.format, "webp");
  assert.equal(optimized.contentType, "image/webp");
  assert.equal(optimized.quality, 88);
  assert.ok(optimized.sizeBytes > 0);

  const metadata = await sharp(optimized.buffer).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 2);
  assert.equal(metadata.height, 2);
});

test("question image route serves storage-backed images and handles missing objects", async () => {
  const questionId = "Q-STORAGE-001";
  const storageKey = getQuestionImageStorageKey(questionId);
  const now = new Date().toISOString();

  db.prepare(
    `
      INSERT INTO questions (
        id,
        question_image_url,
        image_storage_key,
        source_pdf_id,
        source_page,
        correct_answer,
        subject,
        subject_id,
        topic,
        topic_id,
        subtopic,
        subtopic_id,
        difficulty,
        difficulty_score,
        source,
        version,
        import_job_id,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @questionImageUrl,
        @imageStorageKey,
        NULL,
        NULL,
        'A',
        'quantitative',
        'math',
        'اختبار التخزين',
        'storage-test',
        NULL,
        NULL,
        1,
        1,
        'manual',
        1,
        NULL,
        @now,
        @now
      )
    `
  ).run({
    id: questionId,
    imageStorageKey: storageKey,
    now,
    questionImageUrl: getQuestionImageUrl(questionId)
  });

  const missingResponse = await fetch(
    `${baseUrl}/question-images/${questionId}.webp`
  );
  assert.equal(missingResponse.status, 404);

  const optimized = await optimizeQuestionImage(png);
  await objectStorage.uploadObject({
    body: optimized.buffer,
    contentType: optimized.contentType,
    key: storageKey
  });

  const response = await fetch(`${baseUrl}/question-images/${questionId}.webp`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/webp");
  assert.equal(response.headers.get("cache-control"), "public, max-age=300");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), optimized.buffer);
});

after(async () => {
  await objectStorage.deletePrefix("questions/Q-STORAGE-001").catch(() => undefined);
  await objectStorage.deletePrefix("generated/storage-tests").catch(() => undefined);
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  db.close();
  rmSync(testDirectory, { force: true, recursive: true });
});
