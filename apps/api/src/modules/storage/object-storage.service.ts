import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";

export type ObjectUploadInput = {
  body: Buffer | Uint8Array;
  contentType?: string;
  key: string;
};

export type StoredObject = {
  body: Readable;
  contentLength?: number;
  contentType?: string;
};

export type ObjectStorage = {
  copyObject(sourceKey: string, targetKey: string, options?: { contentType?: string }): Promise<void>;
  deleteObject(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
  getObject(key: string): Promise<StoredObject | null>;
  getObjectBuffer(key: string): Promise<Buffer | null>;
  objectExists(key: string): Promise<boolean>;
  uploadObject(input: ObjectUploadInput): Promise<void>;
};

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(moduleDirectory, "../../../../..");
const localObjectStorageDirectory = resolve(workspaceRoot, "media", "object-storage");

const assertObjectKey = (key: string) => {
  if (
    !key ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Invalid object storage key.");
  }
};

const localPathForKey = (key: string) => {
  assertObjectKey(key);
  return resolve(localObjectStorageDirectory, key);
};

const createLocalStorage = (): ObjectStorage => ({
  async copyObject(sourceKey, targetKey) {
    const source = localPathForKey(sourceKey);
    const target = localPathForKey(targetKey);
    if (!existsSync(source)) {
      throw new Error(`Storage object is missing: ${sourceKey}`);
    }

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(source));
  },

  async deleteObject(key) {
    rmSync(localPathForKey(key), { force: true });
  },

  async deletePrefix(prefix) {
    rmSync(localPathForKey(prefix), { force: true, recursive: true });
  },

  async getObject(key) {
    const path = localPathForKey(key);
    if (!existsSync(path)) {
      return null;
    }

    const stats = statSync(path);
    return {
      body: createReadStream(path),
      contentLength: stats.size,
      contentType: contentTypeForKey(key)
    };
  },

  async getObjectBuffer(key) {
    const path = localPathForKey(key);
    return existsSync(path) ? readFileSync(path) : null;
  },

  async objectExists(key) {
    return existsSync(localPathForKey(key));
  },

  async uploadObject(input) {
    const path = localPathForKey(input.key);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, input.body);
  }
});

const encodeCopySourceKey = (key: string) =>
  key.split("/").map(encodeURIComponent).join("/");

const streamToBuffer = async (stream: Readable) => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const createR2Storage = (): ObjectStorage => {
  const bucket = env.r2.bucket as string;
  const client = new S3Client({
    credentials: {
      accessKeyId: env.r2.accessKeyId as string,
      secretAccessKey: env.r2.secretAccessKey as string
    },
    endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    region: "auto"
  });

  return {
    async copyObject(sourceKey, targetKey, options) {
      assertObjectKey(sourceKey);
      assertObjectKey(targetKey);
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          ContentType: options?.contentType ?? contentTypeForKey(targetKey),
          CopySource: `${bucket}/${encodeCopySourceKey(sourceKey)}`,
          Key: targetKey,
          MetadataDirective: "REPLACE"
        })
      );
    },

    async deleteObject(key) {
      assertObjectKey(key);
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    async deletePrefix(prefix) {
      assertObjectKey(prefix);
      let continuationToken: string | undefined;

      do {
        const listed = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            ContinuationToken: continuationToken,
            Prefix: `${prefix.replace(/\/?$/, "/")}`
          })
        );
        const objects = listed.Contents?.map((object) =>
          object.Key ? { Key: object.Key } : null
        ).filter((object): object is { Key: string } => Boolean(object)) ?? [];

        if (objects.length > 0) {
          await client.send(
            new DeleteObjectsCommand({
              Bucket: bucket,
              Delete: { Objects: objects, Quiet: true }
            })
          );
        }

        continuationToken = listed.NextContinuationToken;
      } while (continuationToken);
    },

    async getObject(key) {
      assertObjectKey(key);
      try {
        const result = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key })
        );
        const body = result.Body;

        if (!body) {
          return null;
        }

        if (body instanceof Readable) {
          return {
            body,
            contentLength: result.ContentLength,
            contentType: result.ContentType ?? contentTypeForKey(key)
          };
        }

        if ("transformToByteArray" in body) {
          const bytes = await body.transformToByteArray();
          return {
            body: Readable.from(Buffer.from(bytes)),
            contentLength: result.ContentLength,
            contentType: result.ContentType ?? contentTypeForKey(key)
          };
        }

        throw new Error("Unsupported R2 response body type.");
      } catch (error) {
        if (isStorageNotFoundError(error)) {
          return null;
        }
        throw error;
      }
    },

    async getObjectBuffer(key) {
      const object = await this.getObject(key);
      return object ? streamToBuffer(object.body) : null;
    },

    async objectExists(key) {
      assertObjectKey(key);
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
      } catch (error) {
        if (isStorageNotFoundError(error)) {
          return false;
        }
        throw error;
      }
    },

    async uploadObject(input) {
      assertObjectKey(input.key);
      await client.send(
        new PutObjectCommand({
          Body: input.body,
          Bucket: bucket,
          ContentType: input.contentType ?? contentTypeForKey(input.key),
          Key: input.key
        })
      );
    }
  };
};

const isStorageNotFoundError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const metadata = error as Error & { $metadata?: { httpStatusCode?: number }; name?: string };
  return metadata.$metadata?.httpStatusCode === 404 || metadata.name === "NoSuchKey";
};

export const contentTypeForKey = (key: string) => {
  if (key.endsWith(".webp")) {
    return "image/webp";
  }
  if (key.endsWith(".png")) {
    return "image/png";
  }
  if (key.endsWith(".pdf")) {
    return "application/pdf";
  }
  return "application/octet-stream";
};

export const objectStorage =
  env.storageDriver === "r2" ? createR2Storage() : createLocalStorage();
