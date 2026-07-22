import { env } from "../../config/env";
import type { ExamQuestion, ExamSection } from "../../types/exam";

export const examAnswerOptions = ["A", "B", "C", "D"] as const;
export type ExamNavigatorTone = "answered" | "default" | "flagged";

export const toExamImageSrc = (questionImageUrl: string) =>
  questionImageUrl.startsWith("http")
    ? questionImageUrl
    : `${env.apiUrl}${questionImageUrl}`;

export const getCategoryLabel = (category: ExamQuestion["category"]) =>
  category === "math" ? "الكمي" : "اللفظي";

export const formatExamTimer = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
};

export const getTimerTone = (seconds: number) => {
  if (seconds < 60) {
    return "danger";
  }

  if (seconds < 5 * 60) {
    return "warning";
  }

  return "normal";
};

export const getSectionCounts = (section: ExamSection | null) => {
  const questions = section?.questions ?? [];
  const answered = questions.filter((question) => question.userAnswer).length;
  const flagged = questions.filter((question) => question.flagged).length;

  return {
    answered,
    flagged,
    unanswered: Math.max(questions.length - answered, 0)
  };
};

export const getNavigatorTone = (question: ExamQuestion): ExamNavigatorTone => {
  if (question.flagged) {
    return "flagged";
  }

  if (question.userAnswer) {
    return "answered";
  }

  return "default";
};

export const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);
