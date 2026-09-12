import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getWeeklyStudyHourTarget } from "../profile/profileOptions";
import { HttpError } from "../../services/http";
import { profileService } from "../../services/profileService";
import { sessionService } from "../../services/sessionService";
import type {
  StudyProgressDay,
  StudyProgressPeriod,
  StudyProgressResponse
} from "../../types/session";
import type { StudentProfile } from "../../types/profile";

type ProgressView = "today" | "week" | "month";
type CalendarCellVariant = "month" | "today" | "week";

const progressViews: Array<{ label: string; value: ProgressView }> = [
  { label: "اليوم", value: "today" },
  { label: "الأسبوع", value: "week" },
  { label: "الشهر", value: "month" }
];

const weekdayLabels = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت"
];

const toArabicNumber = (value: number) => value.toLocaleString("ar-SA");

const toStudyMinutes = (seconds: number) => {
  if (seconds <= 0) {
    return `${toArabicNumber(0)} دقيقة`;
  }

  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${toArabicNumber(minutes)} دقيقة`;
};

const toStudyDuration = (seconds: number) => {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${toArabicNumber(totalMinutes)} دقيقة`;
  }

  if (minutes <= 0) {
    return `${toArabicNumber(hours)} ساعة`;
  }

  return `${toArabicNumber(hours)} ساعة و${toArabicNumber(minutes)} دقيقة`;
};

const toQuestionCount = (answeredQuestions: number) =>
  `${toArabicNumber(answeredQuestions)} سؤال`;

const toDate = (dateKey: string) => new Date(`${dateKey}T00:00:00.000Z`);

const getMonthKey = (dateKey: string) => dateKey.slice(0, 7);

const addDays = (dateKey: string, offset: number) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return date.toISOString().slice(0, 10);
};

const addMonths = (monthKey: string, offset: number) => {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
};

const formatDateParts = (dateKey: string) => {
  const date = toDate(dateKey);

  return {
    dayNumber: new Intl.DateTimeFormat("ar-SA", {
      calendar: "gregory",
      day: "numeric",
      timeZone: "UTC"
    }).format(date),
    fullDate: new Intl.DateTimeFormat("ar-SA", {
      calendar: "gregory",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
      weekday: "long",
      year: "numeric"
    }).format(date),
    monthDay: new Intl.DateTimeFormat("ar-SA", {
      calendar: "gregory",
      day: "numeric",
      month: "long",
      timeZone: "UTC"
    }).format(date),
    weekday: new Intl.DateTimeFormat("ar-SA", {
      calendar: "gregory",
      timeZone: "UTC",
      weekday: "long"
    }).format(date)
  };
};

const formatMonthTitle = (period: StudyProgressPeriod) => {
  const startDate = toDate(period.startDate);
  const endDate = toDate(period.endDate);
  const sameMonth =
    startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
    startDate.getUTCMonth() === endDate.getUTCMonth();

  if (sameMonth) {
    return new Intl.DateTimeFormat("ar-SA", {
      calendar: "gregory",
      month: "long",
      timeZone: "UTC",
      year: "numeric"
    }).format(startDate);
  }

  const startLabel = new Intl.DateTimeFormat("ar-SA", {
    calendar: "gregory",
    day: "numeric",
    month: "long",
    timeZone: "UTC"
  }).format(startDate);
  const endLabel = new Intl.DateTimeFormat("ar-SA", {
    calendar: "gregory",
    day: "numeric",
    month: "long",
    timeZone: "UTC"
  }).format(endDate);

  return `${startLabel} - ${endLabel}`;
};

const formatWeekRange = (period: StudyProgressPeriod) => {
  const startLabel = new Intl.DateTimeFormat("ar-SA", {
    calendar: "gregory",
    day: "numeric",
    month: "long",
    timeZone: "UTC"
  }).format(toDate(period.startDate));
  const endLabel = new Intl.DateTimeFormat("ar-SA", {
    calendar: "gregory",
    day: "numeric",
    month: "long",
    timeZone: "UTC"
  }).format(toDate(period.endDate));

  return `${startLabel} - ${endLabel}`;
};

const formatStreakLabel = (progress: StudyProgressResponse) =>
  `ستريك 🔥 الحالي ${toArabicNumber(progress.streak.current)} · الأعلى ${toArabicNumber(
    progress.streak.highest
  )}`;

const emptyProgressDay = (date: string): StudyProgressDay => ({
  answeredQuestions: 0,
  approximateStudySeconds: 0,
  correctAnswers: 0,
  date,
  intensity: 0
});

const summarizeProgressDays = (days: StudyProgressDay[]): StudyProgressPeriod => {
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
    endDate: days.at(-1)?.date ?? "",
    startDate: days[0]?.date ?? ""
  };
};

const getWeekDatesForDay = (dateKey: string) => {
  const startDate = addDays(dateKey, -toDate(dateKey).getUTCDay());

  return Array.from({ length: 7 }, (_value, index) => addDays(startDate, index));
};

const getAvailableProgressDayMap = (progress: StudyProgressResponse) => {
  const entries = [
    progress.today,
    ...progress.week.days,
    ...progress.month.days,
    ...progress.monthWeeks.flatMap((week) => week.days),
    ...progress.year.days
  ];

  return new Map(entries.map((day) => [day.date, day]));
};

const getWeekForSelectedDay = (
  progress: StudyProgressResponse,
  selectedDay: StudyProgressDay
) => {
  const matchingMonthWeek = progress.monthWeeks.find((week) =>
    week.days.some((day) => day.date === selectedDay.date)
  );

  if (matchingMonthWeek) {
    return matchingMonthWeek;
  }

  const dayMap = getAvailableProgressDayMap(progress);

  return summarizeProgressDays(
    getWeekDatesForDay(selectedDay.date).map(
      (date) => dayMap.get(date) ?? emptyProgressDay(date)
    )
  );
};

const getDayIndexInWeek = (dateKey: string) => toDate(dateKey).getUTCDay();

const dailyPlanSegmentColors = ["cyan", "gold", "mint", "rose", "violet"] as const;

const getDailyPlanSegments = (
  studiedSeconds: number,
  dailyExpectedSeconds: number
) => {
  if (dailyExpectedSeconds <= 0) {
    return [];
  }

  const safeStudiedSeconds = Math.max(0, studiedSeconds);
  const rawSegmentRatio = safeStudiedSeconds / dailyExpectedSeconds;
  const nearestWholeSegment = Math.round(rawSegmentRatio);
  const segmentRatio =
    Math.abs(rawSegmentRatio - nearestWholeSegment) < 0.001
      ? nearestWholeSegment
      : rawSegmentRatio;
  const fullSegments = Math.floor(segmentRatio);
  const partialSegment = segmentRatio - fullSegments;
  const segmentCount = Math.max(1, fullSegments + (partialSegment > 0 ? 1 : 0));

  return Array.from({ length: segmentCount }, (_value, index) => ({
    color: dailyPlanSegmentColors[index % dailyPlanSegmentColors.length],
    fillPercent:
      index < fullSegments
        ? 100
        : Math.min(Math.max(partialSegment * 100, 0), 100)
  }));
};

const getPaceState = (actualSeconds: number, expectedSeconds: number) => {
  const difference = actualSeconds - expectedSeconds;

  if (Math.abs(difference) < 60) {
    return {
      label: "على وتيرة الأسبوع",
      state: "even"
    };
  }

  if (difference > 0) {
    return {
      label: "متقدم على وتيرة الأسبوع",
      state: "ahead"
    };
  }

  return {
    label: "يحتاج دفعة للحاق بالوتيرة",
    state: "behind"
  };
};

const getActivityFill = (day: StudyProgressDay) => {
  if (day.answeredQuestions <= 0) {
    return 0;
  }

  if (day.intensity === 1) {
    return 34;
  }

  if (day.intensity === 2) {
    return 68;
  }

  return 100;
};

const getDefaultDetailDay = (
  progress: StudyProgressResponse,
  view: ProgressView
) => {
  if (view === "today") {
    return progress.today;
  }

  const days = progress[view].days;
  return (
    [...days].reverse().find((day) => day.answeredQuestions > 0) ??
    days.at(-1) ??
    progress.today
  );
};

function CalendarDayCell({
  day,
  isSelected,
  onSelect,
  showCount,
  variant
}: {
  day: StudyProgressDay;
  isSelected: boolean;
  onSelect: (day: StudyProgressDay) => void;
  showCount: boolean;
  variant: CalendarCellVariant;
}) {
  const dateParts = formatDateParts(day.date);
  const tooltipQuestions = toQuestionCount(day.answeredQuestions);
  const tooltipTime = toStudyMinutes(day.approximateStudySeconds);
  const ariaLabel = `${dateParts.fullDate}: ${tooltipQuestions}، ${tooltipTime}`;

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      className={`study-progress-day study-progress-day-${variant}${
        isSelected ? " selected" : ""
      }`}
      data-intensity={day.intensity}
      style={
        {
          "--study-progress-fill": `${getActivityFill(day)}%`
        } as CSSProperties
      }
      title={`${dateParts.monthDay}\n${tooltipQuestions}\n${tooltipTime}`}
      type="button"
      onClick={() => onSelect(day)}
    >
      <span className="study-progress-day-name">{dateParts.weekday}</span>
      <strong>{dateParts.dayNumber}</strong>
      <span className="study-progress-day-activity" aria-hidden="true">
        <span />
      </span>
      {showCount && day.answeredQuestions > 0 ? (
        <small>{toArabicNumber(day.answeredQuestions)}</small>
      ) : null}
      <span className="study-progress-day-tooltip" role="tooltip">
        <strong>{dateParts.monthDay}</strong>
        <span>{tooltipQuestions}</span>
        <span>{tooltipTime}</span>
      </span>
    </button>
  );
}

function SelectedDayDetail({ day }: { day: StudyProgressDay }) {
  const dateParts = formatDateParts(day.date);

  return (
    <p className="study-progress-selected-day" aria-live="polite">
      <strong>{dateParts.monthDay}</strong>
      <span>{toQuestionCount(day.answeredQuestions)}</span>
      <span>{toStudyMinutes(day.approximateStudySeconds)}</span>
    </p>
  );
}

function TodayView({
  day,
  onSelect,
  progress,
  selectedDay
}: {
  day: StudyProgressDay;
  onSelect: (day: StudyProgressDay) => void;
  progress: StudyProgressResponse;
  selectedDay: StudyProgressDay;
}) {
  const dateParts = formatDateParts(day.date);

  return (
    <div className="study-progress-today-view">
      <div className="study-progress-today-stack">
        <CalendarDayCell
          day={day}
          isSelected={selectedDay.date === day.date}
          onSelect={onSelect}
          showCount={false}
          variant="today"
        />
        <span className="study-progress-daily-connector" aria-hidden="true" />
      </div>
      <div className="study-progress-today-diary">
        <span>{dateParts.fullDate}</span>
        <strong>{toQuestionCount(day.answeredQuestions)}</strong>
        <p>{toStudyMinutes(day.approximateStudySeconds)}</p>
        <small>{formatStreakLabel(progress)}</small>
      </div>
    </div>
  );
}

function WeekView({
  onSelect,
  period,
  progress,
  selectedDay
}: {
  onSelect: (day: StudyProgressDay) => void;
  period: StudyProgressPeriod;
  progress: StudyProgressResponse;
  selectedDay: StudyProgressDay;
}) {
  return (
    <>
      <div className="study-progress-view-meta">
        <strong>{formatWeekRange(period)}</strong>
        <span>{formatStreakLabel(progress)}</span>
      </div>
      <div className="study-progress-week-calendar" aria-label="تقويم نشاط الأسبوع">
        {period.days.map((day) => (
          <CalendarDayCell
            day={day}
            isSelected={selectedDay.date === day.date}
            key={day.date}
            onSelect={onSelect}
            showCount
            variant="week"
          />
        ))}
      </div>
    </>
  );
}

function MonthView({
  isLoading,
  onNextMonth,
  onPreviousMonth,
  onSelect,
  period,
  progress,
  selectedDay
}: {
  isLoading: boolean;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onSelect: (day: StudyProgressDay) => void;
  period: StudyProgressPeriod;
  progress: StudyProgressResponse;
  selectedDay: StudyProgressDay;
}) {
  const leadingBlankDays = period.days[0] ? toDate(period.days[0].date).getUTCDay() : 0;
  const trailingBlankDays =
    (7 - ((leadingBlankDays + period.days.length) % 7)) % 7;

  return (
    <>
      <div className="study-progress-view-meta">
        <div className="study-progress-month-heading">
          <button
            aria-label="الشهر السابق"
            className="study-progress-month-nav"
            disabled={isLoading}
            type="button"
            onClick={onPreviousMonth}
          >
            &lt;
          </button>
          <strong>{formatMonthTitle(period)}</strong>
          <button
            aria-label="الشهر التالي"
            className="study-progress-month-nav"
            disabled={isLoading}
            type="button"
            onClick={onNextMonth}
          >
            &gt;
          </button>
        </div>
        <span>{formatStreakLabel(progress)}</span>
      </div>
      <div className="study-progress-month-weekdays" aria-hidden="true">
        {weekdayLabels.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="study-progress-month-calendar" aria-label="تقويم نشاط الشهر">
        {Array.from({ length: leadingBlankDays }).map((_value, index) => (
          <span className="study-progress-month-blank" key={`start-${index}`} />
        ))}
        {period.days.map((day) => (
          <CalendarDayCell
            day={day}
            isSelected={selectedDay.date === day.date}
            key={day.date}
            onSelect={onSelect}
            showCount={false}
            variant="month"
          />
        ))}
        {Array.from({ length: trailingBlankDays }).map((_value, index) => (
          <span className="study-progress-month-blank" key={`end-${index}`} />
        ))}
      </div>
    </>
  );
}

function DailyStudyTimePlan({
  profile,
  selectedDay,
  selectedWeek
}: {
  profile: StudentProfile | null;
  selectedDay: StudyProgressDay;
  selectedWeek: StudyProgressPeriod;
}) {
  const targetHours = getWeeklyStudyHourTarget(profile?.weeklyStudyHours ?? null);

  if (!targetHours || !profile?.weeklyStudyHours) {
    return null;
  }

  const targetSeconds = targetHours * 60 * 60;
  const dailyExpectedSeconds = targetSeconds / 7;
  const studiedSeconds = Math.max(0, selectedDay.approximateStudySeconds);
  const dailySegments = getDailyPlanSegments(studiedSeconds, dailyExpectedSeconds);
  const expectedWeekSeconds =
    dailyExpectedSeconds * (getDayIndexInWeek(selectedDay.date) + 1);
  const pace = getPaceState(
    selectedWeek.approximateStudySeconds,
    expectedWeekSeconds
  );
  const visibleSegments = Math.min(Math.max(dailySegments.length, 1), 4);
  const stripWidthPercent = Math.max(
    100,
    (dailySegments.length / visibleSegments) * 100
  );
  const selectedDateParts = formatDateParts(selectedDay.date);

  return (
    <div
      className="study-progress-daily-plan"
      aria-label={`تقدم وقت الدراسة في ${selectedDateParts.fullDate}: ${toStudyDuration(
        studiedSeconds
      )} من المتوقع ${toStudyDuration(dailyExpectedSeconds)}`}
    >
      <div className="study-progress-daily-plan-header">
        <span>وقت الدراسة</span>
        <strong>
          {toStudyDuration(studiedSeconds)} في {selectedDateParts.monthDay}
        </strong>
      </div>

      <div className="study-progress-daily-plan-track">
        <div
          className="study-progress-daily-plan-strip"
          style={
            {
              "--study-daily-segment-count": dailySegments.length,
              "--study-daily-strip-width": `${stripWidthPercent}%`
            } as CSSProperties
          }
        >
          {dailySegments.map((segment, index) => (
            <span
              aria-hidden="true"
              className={`study-progress-daily-plan-segment study-progress-daily-plan-segment-${segment.color}`}
              key={`${segment.color}-${index}`}
              style={
                {
                  "--study-daily-segment-fill": `${segment.fillPercent}%`
                } as CSSProperties
              }
            >
              <span />
            </span>
          ))}
        </div>
      </div>

      <div className="study-progress-daily-plan-details">
        <span>المتوقع لهذا اليوم {toStudyDuration(dailyExpectedSeconds)}</span>
        <div>
          <span>
            هذا الأسبوع: {toStudyDuration(selectedWeek.approximateStudySeconds)} /{" "}
            {toStudyDuration(targetSeconds)}
          </span>
          <strong data-pace={pace.state}>{pace.label}</strong>
        </div>
      </div>
    </div>
  );
}

export function StudyProgressTracker() {
  const [activeView, setActiveView] = useState<ProgressView>("week");
  const [displayedMonthKey, setDisplayedMonthKey] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<StudyProgressDay | null>(null);
  const [progress, setProgress] = useState<StudyProgressResponse | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMonthLoading, setIsMonthLoading] = useState(false);
  const [timeZone, setTimeZone] = useState("");

  useEffect(() => {
    const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let isMounted = true;

    setTimeZone(resolvedTimeZone);

    const progressRequest = sessionService.getProgress(resolvedTimeZone);
    const profileRequest = profileService
      .getProfile()
      .then((response) => response.profile)
      .catch(() => null);

    void Promise.all([progressRequest, profileRequest])
      .then(([response, profileResponse]) => {
        if (isMounted) {
          const defaultView =
            response.today.answeredQuestions > 0 ? "today" : "week";

          setProfile(profileResponse);
          setProgress(response);
          setActiveView(defaultView);
          setSelectedDay(getDefaultDetailDay(response, defaultView));
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof HttpError
              ? caughtError.message
              : "تعذر تحميل تقدم الدراسة."
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentSummary = useMemo(() => {
    if (!progress) {
      return "";
    }

    return `اليوم: ${toQuestionCount(progress.today.answeredQuestions)} · ${toStudyMinutes(
      progress.today.approximateStudySeconds
    )}`;
  }, [progress]);
  const selectedWeek =
    progress && selectedDay ? getWeekForSelectedDay(progress, selectedDay) : null;

  const loadDisplayedMonth = async (monthKey: string) => {
    const requestTimeZone =
      timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    setError("");
    setIsMonthLoading(true);

    try {
      const response = await sessionService.getProgress(requestTimeZone, monthKey);

      setProgress(response);
      setSelectedDay(getDefaultDetailDay(response, "month"));
    } catch (caughtError) {
      setError(
        caughtError instanceof HttpError
          ? caughtError.message
          : "تعذر تحميل تقدم الدراسة."
      );
    } finally {
      setIsMonthLoading(false);
    }
  };

  const handleMonthNavigation = (offset: number) => {
    if (!progress) {
      return;
    }

    const currentMonthKey =
      displayedMonthKey ?? getMonthKey(progress.month.startDate);
    const nextMonthKey = addMonths(currentMonthKey, offset);

    setDisplayedMonthKey(nextMonthKey);
    void loadDisplayedMonth(nextMonthKey);
  };

  const handleViewChange = (view: ProgressView) => {
    setActiveView(view);

    if (!progress) {
      return;
    }

    if (view === "month") {
      const currentMonthKey = getMonthKey(progress.today.date);

      setDisplayedMonthKey(currentMonthKey);

      if (getMonthKey(progress.month.startDate) !== currentMonthKey) {
        setSelectedDay(progress.today);
        void loadDisplayedMonth(currentMonthKey);
        return;
      }

      setSelectedDay(getDefaultDetailDay(progress, "month"));
      return;
    }

    setDisplayedMonthKey(null);
    setSelectedDay(getDefaultDetailDay(progress, view));
  };

  return (
    <section className="study-progress-journey" aria-labelledby="study-progress-title">
      <header className="study-progress-header">
        <div>
          <h2 id="study-progress-title">تقدم الدراسة</h2>
          {currentSummary ? <p>{currentSummary}</p> : null}
        </div>

        <div className="study-progress-switch" role="tablist" aria-label="نطاق تقدم الدراسة">
          {progressViews.map((view) => (
            <button
              aria-controls={`study-progress-${view.value}`}
              aria-selected={activeView === view.value}
              className={activeView === view.value ? "selected" : undefined}
              key={view.value}
              role="tab"
              type="button"
              onClick={() => handleViewChange(view.value)}
            >
              {view.label}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? <p className="study-progress-empty">جاري تحميل التقدم...</p> : null}
      {error ? <p className="study-progress-empty">{error}</p> : null}

      {progress && selectedDay ? (
        <div
          className={`study-progress-body study-progress-body-${activeView}`}
          id={`study-progress-${activeView}`}
          role="tabpanel"
        >
          {activeView === "today" ? (
            <TodayView
              day={progress.today}
              onSelect={setSelectedDay}
              progress={progress}
              selectedDay={selectedDay}
            />
          ) : null}

          {activeView === "week" ? (
            <WeekView
              onSelect={setSelectedDay}
              period={progress.week}
              progress={progress}
              selectedDay={selectedDay}
            />
          ) : null}

          {activeView === "month" ? (
            <MonthView
              isLoading={isMonthLoading}
              onNextMonth={() => handleMonthNavigation(1)}
              onPreviousMonth={() => handleMonthNavigation(-1)}
              onSelect={setSelectedDay}
              period={progress.month}
              progress={progress}
              selectedDay={selectedDay}
            />
          ) : null}

          <div className="study-progress-selected-summary">
            <SelectedDayDetail day={selectedDay} />
            {selectedWeek ? (
              <DailyStudyTimePlan
                profile={profile}
                selectedDay={selectedDay}
                selectedWeek={selectedWeek}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
