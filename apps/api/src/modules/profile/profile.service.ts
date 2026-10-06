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
  isValidStudyWeekdaySchedule,
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
  /^[\p{L}\p{N}](?:[\p{L}\p{N}_ -]*[\p{L}\p{N}])$/u;

const toUsername = (value: unknown) => {
  if (typeof value !== "string") {
    throw new ProfileError("اسم المستخدم مطلوب.");
  }

  const username = value.normalize("NFC");

  const characterCount = Array.from(username).length;
  if (
    characterCount < 3 ||
    characterCount > 20 ||
    username !== username.trim() ||
    !usernamePattern.test(username)
  ) {
    throw new ProfileError(
      "اسم المستخدم يجب أن يتكون من ٣ إلى ٢٠ حرفاً شاملاً المسافات، ويمكن استخدام _ أو - في الوسط."
    );
  }

  return username;
};

const profileFieldLabels: Record<string, string> = {
  attemptCount: "عدد المحاولات",
  hasExamDate: "حالة موعد الاختبار",
  hasTakenQudurat: "حالة دخول اختبار القدرات",
  latestScore: "آخر درجة",
  studyPlanBankCount: "عدد الأقسام في الخطة",
  studyPlanStartDate: "تاريخ بدء الخطة",
  targetScore: "الدرجة المستهدفة",
  weakerSection: "القسم الأضعف",
  weeklyRestDay: "يوم الراحة الأسبوعي",
  weeklyReviewDay: "يوم المراجعة الأسبوعي",
  quantitativeStudyDays: "أيام الكمي",
  verbalStudyDays: "أيام اللفظي"
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
  const parsed =
    typeof value === "string" && value.trim()
      ? Number(value)
      : value;

  if (!Number.isInteger(parsed) || Number(parsed) < 0 || Number(parsed) > 6) {
    throw new ProfileError(`${toFieldLabel(fieldName)} غير صالح.`);
  }

  return Number(parsed) as StudyRestDay;
};

const toStudyDays = (value: unknown, fieldName: string): StudyRestDay[] => {
  if (!Array.isArray(value)) {
    throw new ProfileError(`${toFieldLabel(fieldName)} غير صالحة.`);
  }

  const days = value.map((day) => toStudyDay(day, fieldName));
  if (![2, 3].includes(days.length) || new Set(days).size !== days.length) {
    throw new ProfileError(`اختر يومين أو ثلاثة أيام مختلفة لـ ${toFieldLabel(fieldName)}.`);
  }

  return [...days].sort((left, right) => left - right);
};

const toWeeklySchedule = (input: {
  quantitativeStudyDays: unknown;
  restDay?: unknown;
  reviewDay: unknown;
  verbalStudyDays: unknown;
}) => {
  const quantitativeStudyDays = toStudyDays(
    input.quantitativeStudyDays,
    "quantitativeStudyDays"
  );
  const verbalStudyDays = toStudyDays(input.verbalStudyDays, "verbalStudyDays");
  const weeklyRestDay = toStudyDay(input.restDay, "weeklyRestDay");
  const weeklyReviewDay = toStudyDay(input.reviewDay, "weeklyReviewDay");
  if (!isValidStudyWeekdaySchedule({
    quantitativeStudyDays,
    restDay: weeklyRestDay,
    reviewDay: weeklyReviewDay,
    verbalStudyDays
  })) {
    throw new ProfileError(
      "يجب أن يحتوي الأسبوع على ٥ أيام مذاكرة ويوم مراجعة ويوم راحة دون تداخل."
    );
  }

  return {
    quantitativeStudyDays,
    verbalStudyDays,
    weeklyRestDay,
    weeklyReviewDay
  };
};

const toStudyPlanBankCount = (value: unknown) => {
  const bankCount =
    value === undefined
      ? bankConfig.availableBankCount
      : toInteger(value, "studyPlanBankCount");

  if (bankCount < 1 || bankCount > bankConfig.availableBankCount) {
    throw new ProfileError("عدد الأقسام المختار غير صالح.");
  }

  return bankCount;
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
  const studyPlanBankCount = toStudyPlanBankCount(input.studyPlanBankCount);
  const weeklySchedule = toWeeklySchedule({
    quantitativeStudyDays: input.quantitativeStudyDays,
    restDay: input.weeklyRestDay,
    reviewDay: input.weeklyReviewDay,
    verbalStudyDays: input.verbalStudyDays
  });
  const generatedPlan = calculateStudyPlan({
    bankCount: studyPlanBankCount,
    quantitativeStudyDays: weeklySchedule.quantitativeStudyDays,
    restDay: weeklySchedule.weeklyRestDay,
    reviewDay: weeklySchedule.weeklyReviewDay,
    startDate: studyPlanStartDate,
    verbalStudyDays: weeklySchedule.verbalStudyDays
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
    ...weeklySchedule
  };
};

export const previewStudentStudyPlan = (input: {
  studyPlanStartDate?: unknown;
  studyPlanBankCount?: unknown;
  quantitativeStudyDays?: unknown;
  weeklyRestDay?: unknown;
  weeklyReviewDay?: unknown;
  verbalStudyDays?: unknown;
}) => {
  const studyPlanStartDate = toStudyPlanStartDate(input.studyPlanStartDate);
  const studyPlanBankCount = toStudyPlanBankCount(input.studyPlanBankCount);
  const weeklySchedule = toWeeklySchedule({
    quantitativeStudyDays: input.quantitativeStudyDays,
    restDay: input.weeklyRestDay,
    reviewDay: input.weeklyReviewDay,
    verbalStudyDays: input.verbalStudyDays
  });

  return calculateStudyPlan({
    bankCount: studyPlanBankCount,
    quantitativeStudyDays: weeklySchedule.quantitativeStudyDays,
    restDay: weeklySchedule.weeklyRestDay,
    reviewDay: weeklySchedule.weeklyReviewDay,
    startDate: studyPlanStartDate,
    verbalStudyDays: weeklySchedule.verbalStudyDays
  });
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
