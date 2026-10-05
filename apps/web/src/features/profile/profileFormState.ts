import type {
  StudentProfile,
  StudentProfileInput,
  StudyRestDay,
  WeakerSection
} from "../../types/profile";
import {
  defaultQuantitativeStudyDays,
  defaultVerbalStudyDays,
  isCompleteWeeklySchedule,
  temporaryAvailableSectionCount,
  getTodayDate
} from "./studyPlan";

export type ProfileFormState = {
  username: string;
  targetScore: number;
  hasExamDate: boolean;
  examDate: string;
  hasTakenQudurat: boolean | null;
  attemptCount: string;
  latestScore: string;
  studyPlanBankCount: number;
  weakerSection: WeakerSection | "";
  studyPlanStartDate: string;
  quantitativeStudyDays: StudyRestDay[];
  weeklyRestDay: StudyRestDay;
  weeklyReviewDay: StudyRestDay;
  verbalStudyDays: StudyRestDay[];
};

export const createDefaultProfileForm = (
  profile?: StudentProfile | null,
  _availableBankCount = temporaryAvailableSectionCount
): ProfileFormState => ({
  attemptCount: profile?.attemptCount ? String(profile.attemptCount) : "",
  examDate: profile?.examDate ?? "",
  hasExamDate: profile?.hasExamDate ?? false,
  hasTakenQudurat: profile?.hasTakenQudurat ?? null,
  latestScore:
    profile?.latestScore !== null && profile?.latestScore !== undefined
      ? String(profile.latestScore)
      : "",
  studyPlanBankCount: temporaryAvailableSectionCount,
  studyPlanStartDate: profile?.studyPlanStartDate ?? getTodayDate(),
  quantitativeStudyDays: profile?.quantitativeStudyDays ?? defaultQuantitativeStudyDays,
  targetScore: profile?.targetScore ?? 90,
  username: profile?.username ?? "",
  weakerSection: profile?.weakerSection ?? "",
  weeklyRestDay: profile?.weeklyRestDay ?? 5,
  weeklyReviewDay: profile?.weeklyReviewDay ?? 6,
  verbalStudyDays: profile?.verbalStudyDays ?? defaultVerbalStudyDays
});

export const applyProfileFormUpdate = (
  current: ProfileFormState,
  nextValues: Partial<ProfileFormState>
): ProfileFormState => {
  return { ...current, ...nextValues };
};

export const toProfileInput = (
  state: ProfileFormState
): StudentProfileInput => ({
  attemptCount: state.hasTakenQudurat ? Number(state.attemptCount) : null,
  examDate: state.hasExamDate ? state.examDate : null,
  hasExamDate: state.hasExamDate,
  hasTakenQudurat: state.hasTakenQudurat === true,
  latestScore: state.hasTakenQudurat ? Number(state.latestScore) : null,
  studyPlanBankCount: state.studyPlanBankCount,
  studyPlanStartDate: state.studyPlanStartDate,
  quantitativeStudyDays: state.quantitativeStudyDays,
  targetScore: state.targetScore,
  username: state.username.trim(),
  weakerSection: state.weakerSection as WeakerSection,
  weeklyRestDay: state.weeklyRestDay,
  weeklyReviewDay: state.weeklyReviewDay,
  verbalStudyDays: state.verbalStudyDays
});

export const validateProfileForm = (
  state: ProfileFormState,
  availableBankCount = Number.POSITIVE_INFINITY
) => {
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
  if (
    !Number.isInteger(state.studyPlanBankCount) ||
    state.studyPlanBankCount < 1 ||
    state.studyPlanBankCount > availableBankCount
  ) {
    return "اختر عدداً صالحاً من الأقسام المتاحة.";
  }
  if (!state.studyPlanStartDate) return "اختر تاريخ بدء المذاكرة.";
  if (!isCompleteWeeklySchedule({
    quantitativeStudyDays: state.quantitativeStudyDays,
    restDay: state.weeklyRestDay,
    reviewDay: state.weeklyReviewDay,
    verbalStudyDays: state.verbalStudyDays
  })) {
    return "يجب أن يحتوي الأسبوع على ٥ أيام مذاكرة ويوم مراجعة ويوم راحة دون تداخل.";
  }
  return "";
};
