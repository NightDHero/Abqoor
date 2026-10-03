import {
  bankConfig,
  getStudyScheduleDay,
  normalizeStoredStudyDays,
  type StudyScheduleDayKind,
  type StudyScheduleSubjectId
} from "../banks/bank-config.js";
import { findStudentProfileByUserId } from "../profile/profile.repository.js";
import { findUserProgressActivity } from "./session-progress.repository.js";
import { findActiveDailyPlanSession } from "./session.repository.js";
import type { SessionProgressActivityRecord } from "./session-progress.repository.js";

export type StudyProgressIntensity = 0 | 1 | 2 | 3;
export type StudyPlanDayKind = StudyScheduleDayKind;

export type StudyProgressDay = {
  date: string;
  answeredQuestions: number;
  correctAnswers: number;
  approximateStudySeconds: number;
  intensity: StudyProgressIntensity;
  planAnsweredQuestions: number;
  planKind: StudyPlanDayKind;
  planSubjectId: StudyScheduleSubjectId | null;
  planSubjectLabel: string | null;
  questionTarget: number | null;
};

export type StudyProgressPeriod = {
  startDate: string;
  endDate: string;
  answeredQuestions: number;
  correctAnswers: number;
  approximateStudySeconds: number;
  activeDays: number;
  days: StudyProgressDay[];
};

export type StudyProgressStreak = {
  current: number;
  highest: number;
};

export type StudyProgressResponse = {
  career: CareerProgress;
  generatedAt: string;
  timeZone: string;
  activeStudyDay: number;
  dailyPlanHasActiveSession: boolean;
  dailyQuestionTarget: number | null;
  streak: StudyProgressStreak;
  today: StudyProgressDay;
  week: StudyProgressPeriod;
  month: StudyProgressPeriod;
  monthWeeks: StudyProgressPeriod[];
  year: StudyProgressPeriod;
};

export type CareerSubjectProgress = {
  answeredQuestions: number;
  bankPercent: number;
  errorBankPercent: number;
  incorrectAnswers: number;
};

export type CareerProgress = {
  arabic: CareerSubjectProgress;
  math: CareerSubjectProgress;
};

export class SessionProgressError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

const defaultTimeZone = "Asia/Riyadh";
const monthKeyPattern = /^\d{4}-\d{2}$/;

const normalizeTimeZone = (value: unknown) => {
  if (value === undefined) {
    return defaultTimeZone;
  }

  if (typeof value !== "string") {
    throw new SessionProgressError("timeZone must be a valid IANA time zone.");
  }

  const timeZone = value.trim();

  if (!timeZone) {
    return defaultTimeZone;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    throw new SessionProgressError("timeZone must be a valid IANA time zone.");
  }

  return timeZone;
};

const normalizeMonthKey = (value: unknown, fallbackDateKey: string) => {
  if (value === undefined) {
    return fallbackDateKey.slice(0, 7);
  }

  if (typeof value !== "string") {
    throw new SessionProgressError("month must be formatted as YYYY-MM.");
  }

  const monthKey = value.trim();

  if (!monthKeyPattern.test(monthKey)) {
    throw new SessionProgressError("month must be formatted as YYYY-MM.");
  }

  const month = Number(monthKey.slice(5, 7));

  if (month < 1 || month > 12) {
    throw new SessionProgressError("month must be a valid calendar month.");
  }

  return monthKey;
};

const getDateKey = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new SessionProgressError("Unable to calculate study progress dates.", 500);
  }

  return `${year}-${month}-${day}`;
};

const addDays = (dateKey: string, offset: number) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return date.toISOString().slice(0, 10);
};

const getDateRange = (endDate: string, dayCount: number) => {
  return Array.from({ length: dayCount }, (_value, index) =>
    addDays(endDate, index - dayCount + 1)
  );
};

const getCalendarMonthRange = (dateKey: string) => {
  const [year, month] = dateKey.split("-").map(Number);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const endDate = addDays(nextMonthDate.toISOString().slice(0, 10), -1);
  const dayCount =
    Math.round(
      (new Date(`${endDate}T00:00:00.000Z`).getTime() -
        new Date(`${startDate}T00:00:00.000Z`).getTime()) /
        (24 * 60 * 60 * 1000)
    ) + 1;

  return getDateRange(endDate, dayCount);
};

const getCalendarWeekRange = (dateKey: string) => {
  const dayIndex = toUTCDate(dateKey).getUTCDay();
  const startDate = addDays(dateKey, -dayIndex);

  return getDateRange(addDays(startDate, 6), 7);
};

const getCalendarWeeksForMonth = (monthDates: string[]) => {
  const firstDate = monthDates[0];
  const lastDate = monthDates.at(-1);

  if (!firstDate || !lastDate) {
    return [];
  }

  const firstWeekStart = getCalendarWeekRange(firstDate)[0] ?? firstDate;
  const lastWeekEnd = getCalendarWeekRange(lastDate).at(-1) ?? lastDate;
  const weeks: string[][] = [];

  for (
    let weekStart = firstWeekStart;
    weekStart <= lastWeekEnd;
    weekStart = addDays(weekStart, 7)
  ) {
    weeks.push(getDateRange(addDays(weekStart, 6), 7));
  }

  return weeks;
};

const getCalendarYearRange = (dateKey: string) => {
  const [year] = dateKey.split("-").map(Number);
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const dayCount =
    Math.round(
      (new Date(`${endDate}T00:00:00.000Z`).getTime() -
        new Date(`${startDate}T00:00:00.000Z`).getTime()) /
        (24 * 60 * 60 * 1000)
    ) + 1;

  return getDateRange(endDate, dayCount);
};

const toUTCDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
};

const getActiveStudySeconds = (record: SessionProgressActivityRecord) => {
  return record.active_duration_seconds && record.active_duration_seconds > 0
    ? record.active_duration_seconds
    : 0;
};

const getIntensity = (answeredQuestions: number): StudyProgressIntensity => {
  if (answeredQuestions <= 0) {
    return 0;
  }

  if (answeredQuestions < 5) {
    return 1;
  }

  if (answeredQuestions < 12) {
    return 2;
  }

  return 3;
};

const emptyDay = (
  schedule: ReturnType<typeof getStudyScheduleDay>
): StudyProgressDay => ({
  approximateStudySeconds: 0,
  answeredQuestions: 0,
  correctAnswers: 0,
  date: schedule.date,
  intensity: 0,
  planAnsweredQuestions: 0,
  planKind: schedule.kind,
  planSubjectId: schedule.subjectId,
  planSubjectLabel: schedule.subjectLabel,
  questionTarget: schedule.questionTarget
});

const toPercent = (value: number, maximum: number) =>
  Math.min(100, Math.round((value / maximum) * 100));

const createCareerProgress = (
  activity: SessionProgressActivityRecord[]
): CareerProgress => {
  const answeredQuestionIds = {
    arabic: new Set<string>(),
    math: new Set<string>()
  };
  const incorrectAnswers = { arabic: 0, math: 0 };

  for (const record of activity) {
    const subject =
      record.subject_id ??
      (record.subject === "quantitative" ? "math" : "arabic");

    if (subject !== "math" && subject !== "arabic") {
      continue;
    }

    answeredQuestionIds[subject].add(record.question_id);
    if (record.is_correct === 0) {
      incorrectAnswers[subject] += 1;
    }
  }

  const toSubjectProgress = (
    subject: "math" | "arabic",
    questionsPerBank: number
  ): CareerSubjectProgress => ({
    answeredQuestions: answeredQuestionIds[subject].size,
    bankPercent: toPercent(answeredQuestionIds[subject].size, questionsPerBank),
    errorBankPercent: toPercent(
      incorrectAnswers[subject],
      questionsPerBank * 2
    ),
    incorrectAnswers: incorrectAnswers[subject]
  });

  return {
    arabic: toSubjectProgress("arabic", bankConfig.verbalQuestionsPerBank),
    math: toSubjectProgress("math", bankConfig.mathQuestionsPerBank)
  };
};

const summarizeDays = (days: StudyProgressDay[]): StudyProgressPeriod => {
  const answeredQuestions = days.reduce(
    (total, day) => total + day.answeredQuestions,
    0
  );
  const correctAnswers = days.reduce(
    (total, day) => total + day.correctAnswers,
    0
  );
  const approximateStudySeconds = days.reduce(
    (total, day) => total + day.approximateStudySeconds,
    0
  );

  return {
    activeDays: days.filter((day) => day.answeredQuestions > 0).length,
    answeredQuestions,
    approximateStudySeconds,
    correctAnswers,
    days,
    endDate: days[days.length - 1]?.date ?? "",
    startDate: days[0]?.date ?? ""
  };
};

const calculateStreaks = (
  activityByDate: Map<string, StudyProgressDay>,
  todayDate: string
): StudyProgressStreak => {
  const activeDates = [...activityByDate.values()]
    .filter((day) => day.answeredQuestions > 0 && day.date <= todayDate)
    .map((day) => day.date)
    .sort();

  let currentRun = 0;
  let highest = 0;
  let previousDate: string | null = null;

  for (const date of activeDates) {
    currentRun =
      previousDate && addDays(previousDate, 1) === date ? currentRun + 1 : 1;
    highest = Math.max(highest, currentRun);
    previousDate = date;
  }

  let current = 0;
  for (
    let date = todayDate;
    activityByDate.get(date)?.answeredQuestions;
    date = addDays(date, -1)
  ) {
    current += 1;
  }

  return {
    current,
    highest
  };
};

export const getStudyProgress = async (
  userId: string,
  input: { month?: unknown; timeZone?: unknown } = {}
): Promise<StudyProgressResponse> => {
  const timeZone = normalizeTimeZone(input.timeZone);
  const todayDate = getDateKey(new Date(), timeZone);
  const displayedMonthKey = normalizeMonthKey(input.month, todayDate);
  const displayedMonthDates = getCalendarMonthRange(`${displayedMonthKey}-01`);
  const activityByDate = new Map<string, StudyProgressDay>();
  const currentActivity: SessionProgressActivityRecord[] = [];
  const profile = await findStudentProfileByUserId(userId);
  const { restDay, reviewDay } = normalizeStoredStudyDays({
    restDay: profile?.weekly_rest_day,
    reviewDay: profile?.weekly_review_day
  });
  const studyPlanStartDate = profile?.study_plan_start_date ?? todayDate;
  const getSchedule = (date: string) =>
    getStudyScheduleDay({
      date,
      restDay,
      reviewDay,
      startDate: studyPlanStartDate
    });

  for (const record of await findUserProgressActivity(userId)) {
    const date = getDateKey(new Date(record.answered_at), timeZone);

    if (date > todayDate) {
      continue;
    }

    currentActivity.push(record);

    const existing = activityByDate.get(date) ?? emptyDay(getSchedule(date));
    const subjectId =
      record.subject_id ??
      (record.subject === "quantitative" ? "math" : "arabic");

    existing.answeredQuestions += 1;
    existing.correctAnswers += record.is_correct === 1 ? 1 : 0;
    existing.approximateStudySeconds += getActiveStudySeconds(record);
    existing.intensity = getIntensity(existing.answeredQuestions);
    if (existing.planSubjectId === subjectId) {
      existing.planAnsweredQuestions += 1;
    }

    activityByDate.set(date, existing);
  }

  const buildDays = (dayCount: number) =>
    getDateRange(todayDate, dayCount).map(
      (date) => activityByDate.get(date) ?? emptyDay(getSchedule(date))
    );
  const buildRange = (dates: string[]) =>
    summarizeDays(
      dates.map((date) => activityByDate.get(date) ?? emptyDay(getSchedule(date)))
    );
  const today = activityByDate.get(todayDate) ?? emptyDay(getSchedule(todayDate));
  const activeDailyPlanSession = today.planSubjectId
    ? await findActiveDailyPlanSession({
        planDate: today.date,
        subjectId: today.planSubjectId,
        userId
      })
    : null;

  return {
    activeStudyDay: [...activityByDate.values()].filter(
      (day) => day.answeredQuestions > 0
    ).length,
    career: createCareerProgress(currentActivity),
    dailyPlanHasActiveSession: Boolean(activeDailyPlanSession),
    dailyQuestionTarget: today.questionTarget,
    generatedAt: new Date().toISOString(),
    month: buildRange(displayedMonthDates),
    monthWeeks: getCalendarWeeksForMonth(displayedMonthDates).map(buildRange),
    streak: calculateStreaks(activityByDate, todayDate),
    timeZone,
    today,
    week: summarizeDays(buildDays(7)),
    year: buildRange(getCalendarYearRange(`${displayedMonthKey.slice(0, 4)}-01-01`))
  };
};
