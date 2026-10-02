import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { HttpError } from "../../services/http";
import { sessionService } from "../../services/sessionService";
import type {
  StudyProgressDay,
  StudyProgressPeriod,
  StudyProgressResponse
} from "../../types/session";
import { navigateTo } from "../../utils/router";

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
  intensity: 0,
  planKind: "study"
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

function CalendarDayCell({
  day,
  showCount,
  variant
}: {
  day: StudyProgressDay;
  showCount: boolean;
  variant: CalendarCellVariant;
}) {
  const dateParts = formatDateParts(day.date);
  const tooltipQuestions = toQuestionCount(day.answeredQuestions);
  const tooltipTime = toStudyMinutes(day.approximateStudySeconds);
  const planLabel = day.planKind === "rest" ? "راحة" : day.planKind === "review" ? "مراجعة" : "مذاكرة";
  const ariaLabel = `${dateParts.fullDate}: ${planLabel}، ${tooltipQuestions}، ${tooltipTime}`;

  return (
    <div
      aria-label={ariaLabel}
      className={`study-progress-day study-progress-day-${variant}`}
      data-intensity={day.intensity}
      data-plan-kind={day.planKind}
      role="group"
      style={
        {
          "--study-progress-fill": `${getActivityFill(day)}%`
        } as CSSProperties
      }
      title={`${dateParts.monthDay}\n${planLabel}\n${tooltipQuestions}\n${tooltipTime}`}
    >
      <span className="study-progress-day-name">{dateParts.weekday}</span>
      <strong>{dateParts.dayNumber}</strong>
      <span className="study-progress-day-activity" aria-hidden="true">
        <span />
      </span>
      {showCount && day.answeredQuestions > 0 ? (
        <small>{toArabicNumber(day.answeredQuestions)}</small>
      ) : null}
      {day.planKind !== "study" ? (
        <span className="study-progress-day-kind">{planLabel}</span>
      ) : null}
      <span className="study-progress-day-tooltip" role="tooltip">
        <strong>{dateParts.monthDay}</strong>
        <span>{tooltipQuestions}</span>
        <span>{tooltipTime}</span>
      </span>
    </div>
  );
}

function TodayPlan({ progress }: { progress: StudyProgressResponse }) {
  const day = progress.today;
  const isRestDay = day.planKind === "rest";
  const isReviewDay = day.planKind === "review";
  const target = progress.dailyQuestionTarget;
  const percent = isRestDay
    ? 100
    : Math.min(100, Math.round((day.answeredQuestions / target) * 100));
  const title = isRestDay
    ? "يوم الراحة"
    : isReviewDay
      ? "مراجعة عامة"
      : "إكمال قسم اليوم";
  const description = isRestDay
    ? "خذ استراحة هادئة وعد غداً بطاقة جديدة."
    : isReviewDay
      ? "راجع الأسئلة المحفوظة وأخطاءك السابقة."
      : `${toQuestionCount(day.answeredQuestions)} من ${toArabicNumber(target)} سؤال`;

  return (
    <section className="study-progress-daily-plan" aria-labelledby="today-plan-title" data-plan-kind={day.planKind}>
      <div className="study-progress-daily-plan-header">
        <span>خطة اليوم</span>
        <strong id="today-plan-title">{title}</strong>
      </div>
      <div className="study-progress-daily-plan-details">
        <div>
          <span>{description}</span>
          {!isRestDay ? <strong>{toArabicNumber(percent)}٪</strong> : <strong>راحة</strong>}
        </div>
        {!isRestDay ? (
          <button
            className="study-progress-plan-action"
            type="button"
            onClick={() => navigateTo(isReviewDay ? "/review" : "/study")}
          >
            {isReviewDay ? "ابدأ المراجعة" : "ابدأ خطة اليوم"}
          </button>
        ) : null}
      </div>
      <div className="study-progress-daily-plan-track" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}

function TodayView({
  day,
  progress
}: {
  day: StudyProgressDay;
  progress: StudyProgressResponse;
}) {
  const dateParts = formatDateParts(day.date);

  return (
    <div className="study-progress-today-view">
      <div className="study-progress-today-stack">
        <CalendarDayCell
          day={day}
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
  period,
  progress
}: {
  period: StudyProgressPeriod;
  progress: StudyProgressResponse;
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
            key={day.date}
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
  period,
  progress
}: {
  isLoading: boolean;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  period: StudyProgressPeriod;
  progress: StudyProgressResponse;
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
            key={day.date}
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

export function StudyProgressTracker({
  onCareerProgressLoaded
}: {
  onCareerProgressLoaded?: (progress: StudyProgressResponse["career"]) => void;
}) {
  const [activeView, setActiveView] = useState<ProgressView>("week");
  const [displayedMonthKey, setDisplayedMonthKey] = useState<string | null>(null);
  const [progress, setProgress] = useState<StudyProgressResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMonthLoading, setIsMonthLoading] = useState(false);
  const [timeZone, setTimeZone] = useState("");

  useEffect(() => {
    const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let isMounted = true;

    setTimeZone(resolvedTimeZone);

    const progressRequest = sessionService.getProgress(resolvedTimeZone);
    void progressRequest
      .then((response) => {
        if (isMounted) {
          const defaultView =
            response.today.answeredQuestions > 0 ? "today" : "week";

          setProgress(response);
          onCareerProgressLoaded?.(response.career);
          setActiveView(defaultView);
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
  }, [onCareerProgressLoaded]);

  const currentSummary = useMemo(() => {
    if (!progress) {
      return "";
    }

    return `اليوم: ${toQuestionCount(progress.today.answeredQuestions)} · ${toStudyMinutes(
      progress.today.approximateStudySeconds
    )}`;
  }, [progress]);
  const loadDisplayedMonth = async (monthKey: string) => {
    const requestTimeZone =
      timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    setError("");
    setIsMonthLoading(true);

    try {
      const response = await sessionService.getProgress(requestTimeZone, monthKey);

      setProgress(response);
      onCareerProgressLoaded?.(response.career);
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
        void loadDisplayedMonth(currentMonthKey);
        return;
      }
      return;
    }

    setDisplayedMonthKey(null);
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

      {progress ? (
        <>
          <p className="study-progress-streak-summary">{formatStreakLabel(progress)}</p>
          <TodayPlan progress={progress} />
          <div
            className={`study-progress-body study-progress-body-${activeView}`}
            id={`study-progress-${activeView}`}
            role="tabpanel"
          >
          {activeView === "today" ? (
            <TodayView
              day={progress.today}
              progress={progress}
            />
          ) : null}

          {activeView === "week" ? (
            <WeekView
              period={progress.week}
              progress={progress}
            />
          ) : null}

          {activeView === "month" ? (
            <MonthView
              isLoading={isMonthLoading}
              onNextMonth={() => handleMonthNavigation(1)}
              onPreviousMonth={() => handleMonthNavigation(-1)}
              period={progress.month}
              progress={progress}
            />
          ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
