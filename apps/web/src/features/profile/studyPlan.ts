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

export const defaultQuantitativeStudyDays: StudyRestDay[] = [0, 2, 4];
export const defaultVerbalStudyDays: StudyRestDay[] = [1, 3];
export const temporaryAvailableSectionCount = 14;

export type StudyDistribution = "quantitative-majority" | "verbal-majority";

export const getStudyDistribution = (
  quantitativeStudyDays: readonly StudyRestDay[]
): StudyDistribution => quantitativeStudyDays.length === 2
  ? "verbal-majority"
  : "quantitative-majority";

export const isCompleteWeeklySchedule = (input: {
  quantitativeStudyDays: readonly StudyRestDay[];
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  verbalStudyDays: readonly StudyRestDay[];
}) => {
  const assignedDays = new Set([
    ...input.quantitativeStudyDays,
    ...input.verbalStudyDays,
    input.restDay,
    input.reviewDay
  ]);
  if (
    ![2, 3].includes(input.quantitativeStudyDays.length) ||
    ![2, 3].includes(input.verbalStudyDays.length) ||
    input.quantitativeStudyDays.length + input.verbalStudyDays.length !== 5 ||
    assignedDays.size !== 7
  ) return false;

  return true;
};

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
