export const importerExcelSizeLimitBytes = 100 * 1024 * 1024;
export const importerPdfSizeLimitBytes = 1024 * 1024 * 1024;
export const importerImageSizeLimitBytes = 15 * 1024 * 1024;

export const importerUploadFileSizeLimitBytes = importerPdfSizeLimitBytes;
export const importerAggregateSizeLimitBytes =
  importerPdfSizeLimitBytes + importerExcelSizeLimitBytes;

export type ImportUploadFileSize = {
  fieldname: string;
  size: number;
};

export type ImportUploadSizeError = {
  limitBytes: number;
  message: string;
};

export const getImportUploadSizeError = (
  files: ImportUploadFileSize[]
): ImportUploadSizeError | null => {
  const totalSize = files.reduce((total, file) => total + file.size, 0);
  if (totalSize > importerAggregateSizeLimitBytes) {
    return {
      limitBytes: importerAggregateSizeLimitBytes,
      message: "إجمالي ملفات Excel وPDF يتجاوز الحد المسموح وهو 1124MiB."
    };
  }

  for (const file of files) {
    if (
      (file.fieldname === "excel" || file.fieldname === "excelFile") &&
      file.size > importerExcelSizeLimitBytes
    ) {
      return {
        limitBytes: importerExcelSizeLimitBytes,
        message: "حجم ملف Excel يتجاوز الحد المسموح وهو 100MiB."
      };
    }

    if (file.fieldname === "pdf" && file.size > importerPdfSizeLimitBytes) {
      return {
        limitBytes: importerPdfSizeLimitBytes,
        message: "حجم ملف PDF يتجاوز الحد المسموح وهو 1GiB."
      };
    }

    if (file.fieldname === "images" && file.size > importerImageSizeLimitBytes) {
      return {
        limitBytes: importerImageSizeLimitBytes,
        message: "إحدى الصور تتجاوز الحد المسموح وهو 15MiB."
      };
    }
  }

  return null;
};
