import readXlsxFile from "read-excel-file/node";
import type { RawMetadataAdapterResult } from "../importer.types.js";

const arabicQuestionSheetName = "بنك التناظر عام";

const toRows = (sheetData: unknown): unknown[][] => {
  if (!Array.isArray(sheetData)) {
    return [];
  }

  return sheetData.filter((row): row is unknown[] => Array.isArray(row));
};

export const readArabicExcelRows = async (
  excelBuffer: Buffer
): Promise<RawMetadataAdapterResult> => {
  const workbook = await readXlsxFile(excelBuffer);
  const sheet = workbook.find(
    (item) => item.sheet === arabicQuestionSheetName
  );

  if (!sheet) {
    return {
      rows: [],
      globalErrors: [
        `Required Excel sheet "${arabicQuestionSheetName}" was not found.`
      ]
    };
  }

  const rows = toRows(sheet.data);

  return {
    rows: rows.slice(1).map((row, index) => ({
      rowNumber: index + 2,
      cells: row
    })),
    globalErrors: []
  };
};
