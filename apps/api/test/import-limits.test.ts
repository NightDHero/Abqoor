import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getImportUploadSizeError,
  importerExcelSizeLimitBytes,
  importerPdfSizeLimitBytes,
  importerUploadFileSizeLimitBytes
} from "../src/modules/admin/importer/import-limits.js";

test("enforces the Excel and PDF binary upload limits at their exact boundaries", () => {
  assert.equal(importerExcelSizeLimitBytes, 100 * 1024 * 1024);
  assert.equal(importerPdfSizeLimitBytes, 1024 * 1024 * 1024);
  assert.equal(importerUploadFileSizeLimitBytes, importerPdfSizeLimitBytes);

  assert.equal(getImportUploadSizeError([
    { fieldname: "excel", size: importerExcelSizeLimitBytes },
    { fieldname: "pdf", size: importerPdfSizeLimitBytes }
  ]), null);

  assert.equal(
    getImportUploadSizeError([
      { fieldname: "excel", size: importerExcelSizeLimitBytes + 1 }
    ])?.limitBytes,
    importerExcelSizeLimitBytes
  );
  assert.equal(
    getImportUploadSizeError([
      { fieldname: "pdf", size: importerPdfSizeLimitBytes + 1 }
    ])?.limitBytes,
    importerPdfSizeLimitBytes
  );
});
