import {
  findStudentProfileByUserId,
  isUsernameAvailable,
  upsertStudentProfile
} from "./profile.repository.js";
import {
  toStudentProfile,
  weakerSectionOptions,
  type StudentProfile,
  type UpdateStudentProfileInput,
  type WeakerSection
} from "./profile.types.js";
import {
  bankConfig,
  calculateStudyPlan,
  isDateOnly,
  type StudyRestDay
} from "../banks/bank-config.js";

export class ProfileError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

const usernamePattern =
  /^[\p{L}\p{N}](?:[\p{L}\p{N}_-]{1,22}[\p{L}\p{N}])$/u;

const toUsername = (value: unknown) => {
  if (typeof value !== "string") {
    throw new ProfileError("اسم المستخدم مطلوب.");
  }

  const username = value.trim();

  if (!usernamePattern.test(username)) {
    throw new ProfileError(
      "اسم المستخدم يجب أن يتكون من ٣ إلى ٢٤ حرفاً أو رقماً، ويمكن استخدام _ أو - في الوسط."
    );
  }

  return username;
};

const profileFieldLabels: Record<string, string> = {
  attemptCount: "عدد المحاولات",
  hasExamDate: "حالة موعد الاختبار",
  hasTakenQudurat: "حالة دخول اختبار القدرات",
  latestScore: "آخر درجة",
  studyPlanStartDate: "تاريخ بدء الخطة",
  targetScore: "الدرجة المستهدفة",
  weakerSection: "القسم الأضعف",
  weeklyRestDay: "يوم الراحة الأسبوعي",
  weeklyReviewDay: "يوم المراجعة الأسبوعي"
};

const toFieldLabel = (fieldName: string) => {
  return profileFieldLabels[fieldName] ?? fieldName;
};

const isOneOf = <T extends readonly string[]>(
  value: unknown,
  options: T
): value is T[number] => {
  return typeof value === "string" && options.includes(value);
};

const toBoolean = (value: unknown, fieldName: string) => {
  if (typeof value !== "boolean") {
    throw new ProfileError(
      `${toFieldLabel(fieldName)} يجب أن يكون صحيحاً أو غير صحيح.`
    );
  }

  return value;
};

const toInteger = (value: unknown, fieldName: string) => {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed)) {
    throw new ProfileError(`${toFieldLabel(fieldName)} يجب أن يكون رقماً صحيحاً.`);
  }

  return parsed;
};

const toRequiredOption = <T extends readonly string[]>(
  value: unknown,
  options: T,
  fieldName: string
) => {
  if (!isOneOf(value, options)) {
    throw new ProfileError(`${toFieldLabel(fieldName)} غير صالح.`);
  }

  return value;
};

const toDateOrNull = (hasExamDate: boolean, value: unknown) => {
  if (!hasExamDate) {
    return null;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new ProfileError("موعد الاختبار مطلوب عند اختيار وجود موعد.");
  }

  const normalizedDate = value.trim();
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(normalizedDate)) {
    throw new ProfileError("صيغة موعد الاختبار يجب أن تكون YYYY-MM-DD.");
  }

  const parsedDate = new Date(`${normalizedDate}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ProfileError("موعد الاختبار غير صالح.");
  }

  return normalizedDate;
};

const toStudyPlanStartDate = (value: unknown) => {
  if (typeof value !== "string" || !isDateOnly(value.trim())) {
    throw new ProfileError("اختر تاريخاً صالحاً لبدء المذاكرة.");
  }

  return value.trim();
};

const toStudyDay = (value: unknown, fieldName: string): StudyRestDay => {
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 6) {
    throw new ProfileError(`${toFieldLabel(fieldName)} غير صالح.`);
  }

  return Number(value) as StudyRestDay;
};

const normalizeProfileInput = (input: UpdateStudentProfileInput) => {
  const username = toUsername(input.username);
  const targetScore = toInteger(input.targetScore, "targetScore");
  if (targetScore < 50 || targetScore > 100) {
    throw new ProfileError("الدرجة المستهدفة يجب أن تكون بين ٥٠ و١٠٠.");
  }

  const hasExamDate = toBoolean(input.hasExamDate, "hasExamDate");
  const hasTakenQudurat = toBoolean(
    input.hasTakenQudurat,
    "hasTakenQudurat"
  );

  let attemptCount: number | null = null;
  let latestScore: number | null = null;

  if (hasTakenQudurat) {
    attemptCount = toInteger(input.attemptCount, "attemptCount");
    latestScore = toInteger(input.latestScore, "latestScore");

    if (attemptCount < 1) {
      throw new ProfileError("عدد المحاولات يجب أن يكون ١ أو أكثر.");
    }

    if (latestScore < 0 || latestScore > 100) {
      throw new ProfileError("آخر درجة يجب أن تكون بين ٠ و١٠٠.");
    }
  }

  const studyPlanStartDate = toStudyPlanStartDate(input.studyPlanStartDate);
  const weeklyRestDay = toStudyDay(input.weeklyRestDay, "weeklyRestDay");
  const weeklyReviewDay = toStudyDay(input.weeklyReviewDay, "weeklyReviewDay");
  if (weeklyRestDay === weeklyReviewDay) {
    throw new ProfileError("اليوم المختار للراحة لا يمكن اختياره كيوم مراجعة.");
  }
  const generatedPlan = calculateStudyPlan({
    bankCount: bankConfig.availableBankCount,
    restDay: weeklyRestDay,
    reviewDay: weeklyReviewDay,
    startDate: studyPlanStartDate
  });

  return {
    attemptCount,
    examDate: toDateOrNull(hasExamDate, input.examDate),
    hasExamDate,
    hasTakenQudurat,
    latestScore,
    studyPlanBankCount: generatedPlan.bankCount,
    studyPlanCalendarDays: generatedPlan.calendarDays,
    studyPlanCompletionDate: generatedPlan.completionDate,
    studyPlanStartDate,
    studyPlanStudyDays: generatedPlan.studyDays,
    targetScore,
    username,
    weakerSection: toRequiredOption(
      input.weakerSection,
      weakerSectionOptions,
      "weakerSection"
    ) as WeakerSection,
    weeklyRestDay,
    weeklyReviewDay
  };
};

export const getStudentProfile = async (userId: string): Promise<StudentProfile> => {
  if (!userId.trim()) {
    throw new ProfileError("تسجيل الدخول مطلوب.", 401);
  }

  return toStudentProfile(userId, await findStudentProfileByUserId(userId));
};

export const saveStudentProfile = async (
  userId: string,
  input: UpdateStudentProfileInput
): Promise<StudentProfile> => {
  if (!userId.trim()) {
    throw new ProfileError("تسجيل الدخول مطلوب.", 401);
  }

  const normalized = normalizeProfileInput(input);

  if (!(await isUsernameAvailable(normalized.username, userId))) {
    throw new ProfileError("اسم المستخدم مستخدم بالفعل. اختر اسماً آخر.", 409);
  }

  const savedProfile = await upsertStudentProfile({
    ...normalized,
    userId
  });

  if (!savedProfile) {
    throw new ProfileError("تعذر حفظ الملف الدراسي.", 500);
  }

  return toStudentProfile(userId, savedProfile);
};
