import type { CorrectAnswer } from "../types/session";

const arabicAnswerLabels: Record<CorrectAnswer, string> = {
  A: "أ",
  B: "ب",
  C: "ج",
  D: "د"
};

export const toArabicAnswerLabel = (answer: CorrectAnswer) => {
  return arabicAnswerLabels[answer];
};
