import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDataDir = path.dirname(fileURLToPath(import.meta.url));
const pdfDir = path.join(testDataDir, "pdf");
const activeExcelDir = path.join(testDataDir, "excel", "active");

async function listFilesByExtension(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .filter((entry) => path.extname(entry.name).toLowerCase() === extension)
    .map((entry) => entry.name);
}

async function resolveSingleFile(directory, extension, errorLabel) {
  const filenames = await listFilesByExtension(directory, extension);

  if (filenames.length === 0) {
    throw new Error(`No ${errorLabel} file found`);
  }

  if (filenames.length > 1 && errorLabel === "active Excel workbook") {
    throw new Error("Multiple active Excel workbooks found");
  }

  if (filenames.length > 1) {
    throw new Error(`Multiple ${errorLabel} files found`);
  }

  const filename = filenames[0];
  return {
    name: filename,
    path: path.join(directory, filename),
  };
}

const pdfFile = await resolveSingleFile(pdfDir, ".pdf", "bootstrap PDF");
const excelFile = await resolveSingleFile(
  activeExcelDir,
  ".xlsx",
  "active Excel workbook"
);

const pdfBytes = await readFile(pdfFile.path);
const excelStats = await stat(excelFile.path);

const result = {
  pdf: {
    name: pdfFile.name,
    path: pdfFile.path,
    bytes: pdfBytes.length,
    hasPdfHeader: pdfBytes.subarray(0, 4).toString("ascii") === "%PDF",
  },
  excel: {
    name: excelFile.name,
    path: excelFile.path,
    bytes: excelStats.size,
  },
};

console.log(JSON.stringify(result, null, 2));
