import type { ImportJobStatus } from "../../types/admin";

export const importStatusLabels: Record<ImportJobStatus, string> = {
  analyzing: "جاري التحليل",
  ready: "جاهز للتأكيد",
  importing: "جاري الاستيراد",
  completed: "مكتمل",
  failed: "فشل",
  cancelled: "ملغي",
  rolled_back: "تم التراجع"
};

export const formatAdminDate = (value: string) =>
  new Date(value).toLocaleString("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short"
  });

export const answerLabel = (answer: string | null) =>
  ({ A: "أ", B: "ب", C: "ج", D: "د" })[answer ?? ""] ?? "غير صالح";
