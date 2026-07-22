import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { env } from "../../../../config/env.js";
import type { PageRange, PdfQuestionPage } from "../importer.types.js";

export const getPdfPageCount = async (pdfBuffer: Buffer) => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer)
  });
  const document = await loadingTask.promise;

  try {
    return document.numPages;
  } finally {
    await document.destroy();
  }
};

export const selectPdfPages = (
  pageCount: number,
  startQuestionNumber: number,
  pageRange?: PageRange
): PdfQuestionPage[] => {
  if (pageCount < 1) {
    throw new Error("PDF must contain at least one page.");
  }

  const from = pageRange?.from ?? 1;
  const to = pageRange?.to ?? pageCount;

  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 1 ||
    to < from ||
    to > pageCount
  ) {
    throw new Error("pageRange must be valid and within the PDF page count.");
  }

  return Array.from({ length: to - from + 1 }, (_, index) => {
    const questionNumber = startQuestionNumber + index;

    return {
      questionNumber,
      pageIndex: from + index
    };
  });
};

const runPdftoppm = (
  command: string,
  args: string[]
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell:
        process.platform === "win32" &&
        [".cmd", ".bat"].some((extension) =>
          command.toLowerCase().endsWith(extension)
        )
    });
    const stderr: Buffer[] = [];

    child.stderr.on("data", (chunk: Buffer) => {
      stderr.push(chunk);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          Buffer.concat(stderr).toString("utf8").trim() ||
            `pdftoppm exited with code ${code}.`
        )
      );
    });
  });
};

const findOnPath = (fileName: string) => {
  const pathEntries = (process.env.PATH ?? "").split(delimiter).filter(Boolean);

  for (const entry of pathEntries) {
    const candidate = resolve(entry, fileName);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

const resolvePopplerExecutableFromWrapper = (wrapperPath: string) => {
  const wrapperDirectory = dirname(wrapperPath);
  const candidates = [
    resolve(wrapperDirectory, "..", "native", "poppler", "Library", "bin", "pdftoppm.exe"),
    resolve(wrapperDirectory, "..", "Library", "bin", "pdftoppm.exe")
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
};

const resolvePdftoppmCommand = () => {
  if (env.pdftoppmPath && existsSync(env.pdftoppmPath)) {
    return env.pdftoppmPath;
  }

  const executable = findOnPath("pdftoppm.exe");
  if (executable) {
    return executable;
  }

  const wrapper =
    findOnPath("pdftoppm.cmd") ?? findOnPath("pdftoppm.bat");

  if (wrapper) {
    return resolvePopplerExecutableFromWrapper(wrapper) ?? wrapper;
  }

  return "pdftoppm";
};

export const renderPdfPageToPng = async (
  pdfBuffer: Buffer,
  pageIndex: number
) => {
  const workingDirectory = await mkdtemp(join(tmpdir(), "abqoor-pdf-"));
  const inputPath = join(workingDirectory, "input.pdf");
  const outputPrefix = join(workingDirectory, "page");
  const outputPath = `${outputPrefix}.png`;

  try {
    await writeFile(inputPath, pdfBuffer);
    await runPdftoppm(resolvePdftoppmCommand(), [
      "-f",
      String(pageIndex),
      "-l",
      String(pageIndex),
      "-png",
      "-singlefile",
      inputPath,
      outputPrefix
    ]);

    return await readFile(outputPath);
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
};
