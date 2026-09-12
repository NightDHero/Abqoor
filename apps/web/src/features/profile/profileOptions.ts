import type {
  StudyStrategyPreference,
  StudyStylePreference,
  WeakerSection,
  WeeklyStudyHours
} from "../../types/profile";

export const weeklyStudyHourOptions: Array<{
  label: string;
  value: WeeklyStudyHours;
}> = [
  { label: "أقل من ٣ ساعات", value: "less_than_3" },
  { label: "٣ إلى ٥ ساعات", value: "3_to_5" },
  { label: "٥ إلى ١٠ ساعات", value: "5_to_10" },
  { label: "أكثر من ١٥ ساعة", value: "more_than_15" }
];

export const weakerSectionOptions: Array<{
  label: string;
  value: WeakerSection;
}> = [
  { label: "القسم الكمي", value: "quantitative" },
  { label: "القسم اللفظي", value: "verbal" },
  { label: "كلاهما بنفس المستوى", value: "both" }
];

export const studyStylePreferenceOptions: Array<{
  label: string;
  value: StudyStylePreference;
}> = [
  { label: "جلسات قصيرة يومية", value: "short_daily" },
  {
    label: "جلسات أطول عدة مرات أسبوعياً",
    value: "longer_few_times_weekly"
  },
  { label: "لا يوجد تفضيل", value: "no_preference" }
];

export const studyStrategyPreferenceOptions: Array<{
  label: string;
  value: StudyStrategyPreference;
}> = [
  { label: "التركيز على نقاط الضعف أولاً", value: "weakness_first" },
  { label: "التوازن بين جميع الأقسام", value: "balanced" },
  {
    label: "تحقيق أعلى درجة ممكنة بأسرع وقت",
    value: "fastest_highest_score"
  }
];

export const getOptionLabel = <T extends string>(
  options: Array<{ label: string; value: T }>,
  value: T | null
) => {
  return options.find((option) => option.value === value)?.label ?? "غير محدد";
};

export const getWeeklyStudyHourTarget = (
  value: WeeklyStudyHours | null | ""
) => {
  if (value === "less_than_3") {
    return 3;
  }

  if (value === "3_to_5") {
    return 5;
  }

  if (value === "5_to_10") {
    return 10;
  }

  if (value === "more_than_15") {
    return 15;
  }

  return null;
};

export const getStudyStrategyPreferenceLabel = (
  value: StudyStrategyPreference | null | ""
) => {
  return value
    ? getOptionLabel(studyStrategyPreferenceOptions, value)
    : "غير محدد";
};
