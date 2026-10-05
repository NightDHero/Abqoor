export const bankConfig = Object.freeze({
  availableBankCount: 14,
  mathQuestionsPerBank: 55,
  verbalQuestionsPerBank: 65,
  studyPaceBanksPerDay: 1
});

export type StudyRestDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type StudyScheduleSubjectId = "math" | "arabic";
export type StudyScheduleDayKind = "study" | "review" | "rest";

export type StudyWeekdaySchedule = {
  quantitativeStudyDays: StudyRestDay[];
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  verbalStudyDays: StudyRestDay[];
};

export type StudyScheduleDay = {
  date: string;
  kind: StudyScheduleDayKind;
  questionTarget: number | null;
  subjectId: StudyScheduleSubjectId | null;
  subjectLabel: string | null;
  weekday: StudyRestDay;
};

export type StudyPlanPreview = {
  bankCount: number;
  calendarDays: number;
  completionDate: string;
  schedule: StudyScheduleDay[];
  studyDays: number;
  weeklyReviewDays: 1;
  weeklyRestDays: 1;
  weeklyStudyDays: 5;
};

const isStudyRestDay = (value: unknown): value is StudyRestDay =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 6;

export const normalizeStoredStudyDays = (input: {
  restDay: unknown;
  reviewDay: unknown;
}) => {
  const restDay = isStudyRestDay(input.restDay) ? input.restDay : 5;
  const reviewDay =
    isStudyRestDay(input.reviewDay) && input.reviewDay !== restDay
      ? input.reviewDay
      : restDay === 6
        ? 5
        : 6;

  return { restDay, reviewDay };
};

const parseStoredStudyDays = (value: unknown): StudyRestDay[] => {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];
  return [...new Set(parsed.filter(isStudyRestDay))].sort((left, right) => left - right);
};

export const createDefaultStudyDayAssignments = (
  restDay: StudyRestDay = 5,
  reviewDay: StudyRestDay = 6
): Pick<StudyWeekdaySchedule, "quantitativeStudyDays" | "verbalStudyDays"> => {
  const studyDays = ([0, 1, 2, 3, 4, 5, 6] as StudyRestDay[]).filter(
    (day) => day !== restDay && day !== reviewDay
  );

  return {
    quantitativeStudyDays: studyDays.filter((_day, index) => index % 2 === 0),
    verbalStudyDays: studyDays.filter((_day, index) => index % 2 === 1)
  };
};

export const isValidStudyDayAssignments = (input: {
  quantitativeStudyDays: readonly StudyRestDay[];
  verbalStudyDays: readonly StudyRestDay[];
}) => {
  const quantitativeDays = new Set(input.quantitativeStudyDays);
  const verbalDays = new Set(input.verbalStudyDays);
  const assignedDays = new Set([...quantitativeDays, ...verbalDays]);

  return (
    [2, 3].includes(input.quantitativeStudyDays.length) &&
    [2, 3].includes(input.verbalStudyDays.length) &&
    input.quantitativeStudyDays.length + input.verbalStudyDays.length === 5 &&
    quantitativeDays.size === input.quantitativeStudyDays.length &&
    verbalDays.size === input.verbalStudyDays.length &&
    assignedDays.size === 5 &&
    [...assignedDays].every(isStudyRestDay)
  );
};

export const isValidStudyWeekdaySchedule = (input: {
  quantitativeStudyDays: readonly StudyRestDay[];
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  verbalStudyDays: readonly StudyRestDay[];
}) => {
  if (!isValidStudyDayAssignments(input)) return false;
  const allDays = new Set([
    ...input.quantitativeStudyDays,
    ...input.verbalStudyDays,
    input.restDay,
    input.reviewDay
  ]);
  return allDays.size === 7;
};

export const normalizeStoredStudySchedule = (input: {
  quantitativeStudyDays: unknown;
  restDay: unknown;
  reviewDay: unknown;
  verbalStudyDays: unknown;
}): StudyWeekdaySchedule => {
  const legacyDays = normalizeStoredStudyDays(input);
  const quantitativeStudyDays = parseStoredStudyDays(input.quantitativeStudyDays);
  const verbalStudyDays = parseStoredStudyDays(input.verbalStudyDays);
  const assignments = isValidStudyWeekdaySchedule({
    quantitativeStudyDays,
    restDay: legacyDays.restDay,
    reviewDay: legacyDays.reviewDay,
    verbalStudyDays
  })
    ? { quantitativeStudyDays, verbalStudyDays }
    : createDefaultStudyDayAssignments(legacyDays.restDay, legacyDays.reviewDay);
  const restDay = legacyDays.restDay;
  const reviewDay = legacyDays.reviewDay;

  return { ...assignments, restDay, reviewDay };
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const isDateOnly = (value: string) => {
  if (!datePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const toUtcDate = (dateKey: string) => {
  if (!isDateOnly(dateKey)) {
    throw new Error("Invalid study-plan date.");
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const addDays = (dateKey: string, offset: number) => {
  const date = toUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

const getDayKind = (
  dateKey: string,
  restDay: StudyRestDay,
  reviewDay: StudyRestDay
): StudyScheduleDayKind => {
  const weekday = toUtcDate(dateKey).getUTCDay() as StudyRestDay;
  if (weekday === restDay) return "rest";
  if (weekday === reviewDay) return "review";
  return "study";
};

const getWeekStart = (dateKey: string) =>
  addDays(dateKey, -toUtcDate(dateKey).getUTCDay());

const getWeekOffset = (startDate: string, date: string) => {
  const start = toUtcDate(getWeekStart(startDate));
  const current = toUtcDate(getWeekStart(date));
  return Math.round((current.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
};

const positiveModulo = (value: number, divisor: number) =>
  ((value % divisor) + divisor) % divisor;

export const getStudyScheduleDay = (input: {
  date: string;
  quantitativeStudyDays: readonly StudyRestDay[];
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  startDate: string;
  verbalStudyDays: readonly StudyRestDay[];
}): StudyScheduleDay => {
  if (input.restDay === input.reviewDay) {
    throw new Error("The rest day and review day must be different.");
  }

  const weekday = toUtcDate(input.date).getUTCDay() as StudyRestDay;
  const kind = getDayKind(input.date, input.restDay, input.reviewDay);
  if (kind !== "study") {
    return {
      date: input.date,
      kind,
      questionTarget: null,
      subjectId: null,
      subjectLabel: null,
      weekday
    };
  }

  const baseSubjectId: StudyScheduleSubjectId | null = input.quantitativeStudyDays.includes(weekday)
    ? "math"
    : input.verbalStudyDays.includes(weekday)
      ? "arabic"
      : null;
  if (!baseSubjectId) {
    throw new Error("The study weekday is not assigned to a subject.");
  }
  const shouldInvertSubjects = positiveModulo(
    getWeekOffset(input.startDate, input.date),
    2
  ) === 1;
  const subjectId = shouldInvertSubjects
    ? baseSubjectId === "math" ? "arabic" : "math"
    : baseSubjectId;

  return {
    date: input.date,
    kind,
    questionTarget:
      subjectId === "math"
        ? bankConfig.mathQuestionsPerBank
        : bankConfig.verbalQuestionsPerBank,
    subjectId,
    subjectLabel: subjectId === "math" ? "الكمي" : "اللفظي",
    weekday
  };
};

export const getStudyScheduleWeek = (input: {
  quantitativeStudyDays: readonly StudyRestDay[];
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  startDate: string;
  verbalStudyDays: readonly StudyRestDay[];
  weekDate?: string;
}) => {
  const weekDate = input.weekDate ?? input.startDate;
  const weekStart = getWeekStart(weekDate);

  return Array.from({ length: 7 }, (_value, index) =>
    getStudyScheduleDay({
      ...input,
      date: addDays(weekStart, index)
    })
  );
};

export const calculateStudyPlan = (input: {
  bankCount: number;
  quantitativeStudyDays: readonly StudyRestDay[];
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  startDate: string;
  verbalStudyDays: readonly StudyRestDay[];
}) => {
  if (!isDateOnly(input.startDate)) {
    throw new Error("Invalid study-plan start date.");
  }

  if (!Number.isInteger(input.bankCount) || input.bankCount < 1) {
    throw new Error("The study plan needs at least one bank.");
  }

  if (input.restDay === input.reviewDay) {
    throw new Error("The rest day and review day must be different.");
  }

  if (!isValidStudyWeekdaySchedule(input)) {
    throw new Error("The weekly subject assignments are invalid.");
  }

  const [year, month, day] = input.startDate.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  let completedBanks = 0;
  let calendarDays = 0;

  while (completedBanks < input.bankCount) {
    calendarDays += 1;

    const weekday = cursor.getUTCDay() as StudyRestDay;
    if (weekday !== input.restDay && weekday !== input.reviewDay) {
      completedBanks += bankConfig.studyPaceBanksPerDay;
    }

    if (completedBanks < input.bankCount) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return {
    bankCount: input.bankCount,
    calendarDays,
    completionDate: cursor.toISOString().slice(0, 10),
    schedule: getStudyScheduleWeek(input),
    studyDays: input.bankCount,
    weeklyReviewDays: 1 as const,
    weeklyRestDays: 1 as const,
    weeklyStudyDays: 5 as const
  };
};
