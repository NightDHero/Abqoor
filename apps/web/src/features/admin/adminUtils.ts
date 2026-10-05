import type { ImportJobStatus } from "../../types/admin";

export const importStatusLabels: Record<ImportJobStatus, string> = {
  analyzing: "جاري التحليل",
  ready: "جاهز للتأكيد",
  importing: "جاري الرفع",
  completed: "مكتمل",
  failed: "فشل",
  cancelled: "ملغي",
  rolled_back: "تم التراجع"
};

export const formatAdminDate = (value: string) =>
  new Date(value).toLocaleString("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh"
  });

const riyadhDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "numeric",
  timeZone: "Asia/Riyadh",
  year: "numeric"
});

const toRiyadhDateNumber = (date: Date) => {
  const parts = Object.fromEntries(
    riyadhDateFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
  return Date.UTC(parts.year, parts.month - 1, parts.day);
};

export const formatRelativeAdminDays = (
  value: string,
  now = new Date()
) => {
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return "";
  const elapsedDays = Math.max(
    0,
    Math.round(
      (toRiyadhDateNumber(now) - toRiyadhDateNumber(createdAt)) /
        (24 * 60 * 60 * 1000)
    )
  );
  if (elapsedDays === 0) return "اليوم";
  if (elapsedDays === 1) return "أمس";
  if (elapsedDays === 2) return "منذ يومين";
  const days = elapsedDays.toLocaleString("ar-SA");
  return elapsedDays <= 10 ? `منذ ${days} أيام` : `منذ ${days} يوماً`;
};

export const answerLabel = (answer: string | null) =>
  ({ A: "أ", B: "ب", C: "ج", D: "د" })[answer ?? ""] ?? "غير صالح";
