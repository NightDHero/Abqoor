import type {
  StudentProfile,
  StudentProfileInput,
  StudyStrategyPreference,
  StudyStylePreference,
  WeakerSection,
  WeeklyStudyHours
} from "../../types/profile";

export type ProfileFormState = {
  username: string;
  targetScore: number;
  hasExamDate: boolean;
  examDate: string;
  weeklyStudyHours: WeeklyStudyHours | "";
  hasTakenQudurat: boolean | null;
  attemptCount: string;
  latestScore: string;
  weakerSection: WeakerSection | "";
  studyStylePreference: StudyStylePreference | "";
  studyStrategyPreference: StudyStrategyPreference | "";
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
  studyStrategyPreference: profile?.studyStrategyPreference ?? "",
  studyStylePreference: profile?.studyStylePreference ?? "",
  targetScore: profile?.targetScore ?? 90,
  username: profile?.username ?? "",
  weakerSection: profile?.weakerSection ?? "",
  weeklyStudyHours: profile?.weeklyStudyHours ?? ""
});

export const toProfileInput = (
  state: ProfileFormState
): StudentProfileInput => ({
  attemptCount: state.hasTakenQudurat ? Number(state.attemptCount) : null,
  examDate: state.hasExamDate ? state.examDate : null,
  hasExamDate: state.hasExamDate,
  hasTakenQudurat: state.hasTakenQudurat === true,
  latestScore: state.hasTakenQudurat ? Number(state.latestScore) : null,
  studyStrategyPreference:
    state.studyStrategyPreference as StudyStrategyPreference,
  studyStylePreference: state.studyStylePreference as StudyStylePreference,
  targetScore: state.targetScore,
  username: state.username.trim(),
  weakerSection: state.weakerSection as WeakerSection,
  weeklyStudyHours: state.weeklyStudyHours as WeeklyStudyHours
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

  if (!state.weeklyStudyHours) {
    return "اختر عدد ساعات الدراسة الأسبوعية.";
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

  if (!state.weakerSection) {
    return "اختر القسم الذي يمثل تحدياً أكبر.";
  }

  if (!state.studyStylePreference) {
    return "اختر أسلوب الدراسة المفضل.";
  }

  if (!state.studyStrategyPreference) {
    return "اختر طريقة بناء الخطة الدراسية.";
  }

  return "";
};
