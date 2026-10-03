import type { StudyRestDay } from "../../types/profile";

export const weekdayOptions: Array<{ label: string; value: StudyRestDay }> = [
  { label: "الأحد", value: 0 },
  { label: "الاثنين", value: 1 },
  { label: "الثلاثاء", value: 2 },
  { label: "الأربعاء", value: 3 },
  { label: "الخميس", value: 4 },
  { label: "الجمعة", value: 5 },
  { label: "السبت", value: 6 }
];

export const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatPlanDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
