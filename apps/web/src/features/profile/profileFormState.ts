import type {
  StudentProfile,
  StudentProfileInput,
  StudyRestDay,
  WeakerSection
} from "../../types/profile";
import { getTodayDate } from "./studyPlan";

export type ProfileFormState = {
  username: string;
  targetScore: number;
  hasExamDate: boolean;
  examDate: string;
  hasTakenQudurat: boolean | null;
  attemptCount: string;
  latestScore: string;
  weakerSection: WeakerSection | "";
  studyPlanStartDate: string;
  weeklyRestDays: StudyRestDay[];
};

export const createDefaultProfileForm = (
  profile?: StudentProfile | null
): ProfileFormState => ({
  attemptCount: profile?.attemptCount ? String(profile.attemptCount) : "",
  examDate: profile?.examDate ?? "",
  hasExamDate: profile?.hasExamDate ?? false,
  hasTakenQudurat: profile?.hasTakenQudurat ?? null,
  latestScore:
    profile?.latestScore !== null && profile?.latestScore !== undefined
      ? String(profile.latestScore)
      : "",
  studyPlanStartDate: profile?.studyPlanStartDate ?? getTodayDate(),
  targetScore: profile?.targetScore ?? 90,
  username: profile?.username ?? "",
  weakerSection: profile?.weakerSection ?? "",
  weeklyRestDays: profile?.weeklyRestDays ?? []
});

export const toProfileInput = (
  state: ProfileFormState
): StudentProfileInput => ({
  attemptCount: state.hasTakenQudurat ? Number(state.attemptCount) : null,
  examDate: state.hasExamDate ? state.examDate : null,
  hasExamDate: state.hasExamDate,
  hasTakenQudurat: state.hasTakenQudurat === true,
  latestScore: state.hasTakenQudurat ? Number(state.latestScore) : null,
  studyPlanStartDate: state.studyPlanStartDate,
  targetScore: state.targetScore,
  username: state.username.trim(),
  weakerSection: state.weakerSection as WeakerSection,
  weeklyRestDays: state.weeklyRestDays
});

export const validateProfileForm = (state: ProfileFormState) => {
  const usernamePattern =
    /^[\p{L}\p{N}](?:[\p{L}\p{N}_-]{1,22}[\p{L}\p{N}])$/u;

  if (!usernamePattern.test(state.username.trim())) {
    return "اختر اسم مستخدم من ٣ إلى ٢٤ حرفاً أو رقماً، ويمكن استخدام _ أو - في الوسط.";
  }
  if (state.targetScore < 50 || state.targetScore > 100) {
    return "اختر درجة مستهدفة بين ٥٠ و١٠٠.";
  }
  if (state.hasExamDate && !state.examDate) {
    return "اختر موعد الاختبار أو فعّل خيار عدم وجود موعد حالياً.";
  }
  if (state.hasTakenQudurat === null) {
    return "حدد هل سبق لك دخول اختبار القدرات.";
  }
  if (state.hasTakenQudurat) {
    const attemptCount = Number(state.attemptCount);
    const latestScore = Number(state.latestScore);
    if (!Number.isInteger(attemptCount) || attemptCount < 1) {
      return "أدخل عدد محاولات صحيحاً.";
    }
    if (!Number.isInteger(latestScore) || latestScore < 0 || latestScore > 100) {
      return "أدخل آخر درجة بين ٠ و١٠٠.";
    }
  }
  if (!state.weakerSection) return "اختر القسم الذي يمثل تحدياً أكبر.";
  if (!state.studyPlanStartDate) return "اختر تاريخ بدء المذاكرة.";
  if (state.weeklyRestDays.length >= 7) {
    return "اختر يوماً واحداً على الأقل للمذاكرة كل أسبوع.";
  }
  return "";
};
