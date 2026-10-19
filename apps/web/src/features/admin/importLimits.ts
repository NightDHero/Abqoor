export const adminImportExcelLimitBytes = 100 * 1024 * 1024;
export const adminImportPdfLimitBytes = 1024 * 1024 * 1024;

export const adminImportWorkflowSteps = [
  "نوع الرفع والبنك",
  "ملف Excel",
  "النطاق ومصدر الصور",
  "مراجعة الإعدادات",
  "المعاينة والتحقق",
  "تأكيد الرفع",
  "النتيجة النهائية"
] as const;

export const formatImportFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toLocaleString("ar-SA", {
      maximumFractionDigits: 2
    })} GiB`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString("ar-SA", {
    maximumFractionDigits: 1
  })} MiB`;
};
