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

export const calculateStudyPlan = (input: {
  bankCount: number;
  restDays: readonly StudyRestDay[];
  startDate: string;
}) => {
  if (!input.startDate || input.bankCount < 1 || input.restDays.length >= 7) {
    return null;
  }

  const [year, month, day] = input.startDate.split("-").map(Number);
  const cursor = new Date(year, month - 1, day);
  const restDays = new Set(input.restDays);
  let completedBanks = 0;
  let calendarDays = 0;

  while (completedBanks < input.bankCount) {
    calendarDays += 1;
    if (!restDays.has(cursor.getDay() as StudyRestDay)) completedBanks += 1;
    if (completedBanks < input.bankCount) cursor.setDate(cursor.getDate() + 1);
  }

  const completionYear = cursor.getFullYear();
  const completionMonth = String(cursor.getMonth() + 1).padStart(2, "0");
  const completionDay = String(cursor.getDate()).padStart(2, "0");

  return {
    calendarDays,
    completionDate: `${completionYear}-${completionMonth}-${completionDay}`,
    studyDays: input.bankCount
  };
};

export const formatPlanDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
