import type { StudyProgressDay } from "../../types/session";

export type CareerDayTheme = "math" | "neutral" | "rest" | "verbal";

export const getCareerDayTheme = (
  today: Pick<StudyProgressDay, "planKind" | "planSubjectId">
): CareerDayTheme => {
  if (today.planKind === "rest") return "rest";
  if (today.planKind !== "study") return "neutral";
  if (today.planSubjectId === "math") return "math";
  if (today.planSubjectId === "arabic") return "verbal";
  return "neutral";
};
