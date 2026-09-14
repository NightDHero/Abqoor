import { randomUUID } from "node:crypto";
import { env } from "../src/config/env.js";
import { objectStorage } from "../src/modules/storage/object-storage.service.js";

if (env.storageDriver !== "r2") {
  throw new Error("Set STORAGE_DRIVER=r2 before running the R2 smoke test.");
}

const id = randomUUID();
const sourceKey = `generated/smoke-tests/${id}/source.txt`;
const copyKey = `generated/smoke-tests/${id}/copy.txt`;
const body = Buffer.from(`abqoor-r2-smoke-test:${id}`, "utf8");

try {
  await objectStorage.uploadObject({
    body,
    contentType: "text/plain; charset=utf-8",
    key: sourceKey
  });

  if (!(await objectStorage.objectExists(sourceKey))) {
    throw new Error("Uploaded source object was not found.");
  }

  const downloaded = await objectStorage.getObjectBuffer(sourceKey);
  if (!downloaded?.equals(body)) {
    throw new Error("Downloaded source object did not match uploaded content.");
  }

  await objectStorage.copyObject(sourceKey, copyKey, {
    contentType: "text/plain; charset=utf-8"
  });

  const copied = await objectStorage.getObjectBuffer(copyKey);
  if (!copied?.equals(body)) {
    throw new Error("Copied object did not match uploaded content.");
  }

  await objectStorage.deleteObject(sourceKey);
  await objectStorage.deleteObject(copyKey);

  if (
    (await objectStorage.objectExists(sourceKey)) ||
    (await objectStorage.objectExists(copyKey))
  ) {
    throw new Error("Smoke-test cleanup did not delete all objects.");
  }

  console.log("R2 smoke test passed.");
} finally {
  await objectStorage.deleteObject(sourceKey).catch(() => undefined);
  await objectStorage.deleteObject(copyKey).catch(() => undefined);
}
