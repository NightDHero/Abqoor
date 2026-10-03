export const bankConfig = Object.freeze({
  availableBankCount: 14,
  mathQuestionsPerBank: 55,
  verbalQuestionsPerBank: 65,
  studyPaceBanksPerDay: 1
});

export type StudyRestDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type StudyScheduleSubjectId = "math" | "arabic";
export type StudyScheduleDayKind = "study" | "review" | "rest";

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

export const defaultStartingStudySubject: StudyScheduleSubjectId = "math";

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

const getFirstStudyDate = (
  startDate: string,
  restDay: StudyRestDay,
  reviewDay: StudyRestDay
) => {
  let date = startDate;
  while (getDayKind(date, restDay, reviewDay) !== "study") {
    date = addDays(date, 1);
  }
  return date;
};

const countStudyDays = (
  startDate: string,
  endDate: string,
  restDay: StudyRestDay,
  reviewDay: StudyRestDay
) => {
  let count = 0;
  for (let date = startDate; date < endDate; date = addDays(date, 1)) {
    if (getDayKind(date, restDay, reviewDay) === "study") count += 1;
  }
  return count;
};

const positiveModulo = (value: number, divisor: number) =>
  ((value % divisor) + divisor) % divisor;

export const getStudyScheduleDay = (input: {
  date: string;
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  startDate: string;
  startingSubject?: StudyScheduleSubjectId;
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

  const firstStudyDate = getFirstStudyDate(
    input.startDate,
    input.restDay,
    input.reviewDay
  );
  const subjectOffset =
    input.date >= firstStudyDate
      ? countStudyDays(
          firstStudyDate,
          input.date,
          input.restDay,
          input.reviewDay
        )
      : -countStudyDays(
          input.date,
          firstStudyDate,
          input.restDay,
          input.reviewDay
        );
  const startingSubject = input.startingSubject ?? defaultStartingStudySubject;
  const alternatedSubject = startingSubject === "math" ? "arabic" : "math";
  const subjectId =
    positiveModulo(subjectOffset, 2) === 0
      ? startingSubject
      : alternatedSubject;

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
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  startDate: string;
  weekDate?: string;
  startingSubject?: StudyScheduleSubjectId;
}) => {
  const weekDate = input.weekDate ?? input.startDate;
  const weekStart = addDays(
    weekDate,
    -toUtcDate(weekDate).getUTCDay()
  );

  return Array.from({ length: 7 }, (_value, index) =>
    getStudyScheduleDay({
      ...input,
      date: addDays(weekStart, index)
    })
  );
};

export const calculateStudyPlan = (input: {
  bankCount: number;
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  startDate: string;
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
