import { useEffect, useState, type CSSProperties } from "react";
import { HttpError } from "../../services/http";
import { sessionService } from "../../services/sessionService";
import type {
  PastUnfinishedStudyPlanDay,
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
  planAnsweredQuestions: 0,
  planKind: "study",
  planSubjectId: null,
  planSubjectLabel: null,
  questionTarget: null
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
  isToday = false,
  showCount,
  variant
}: {
  day: StudyProgressDay;
  isToday?: boolean;
  showCount: boolean;
  variant: CalendarCellVariant;
}) {
  const dateParts = formatDateParts(day.date);
  const tooltipQuestions = toQuestionCount(day.answeredQuestions);
  const tooltipTime = toStudyMinutes(day.approximateStudySeconds);
  const planLabel = day.planKind === "rest"
    ? "راحة"
    : day.planKind === "review"
      ? "مراجعة"
      : day.planSubjectLabel ?? "مذاكرة";
  const planProgress = day.planKind === "study" && day.questionTarget
    ? `${toArabicNumber(day.planAnsweredQuestions)} / ${toArabicNumber(day.questionTarget)}`
    : null;
  const ariaLabel = `${dateParts.fullDate}: ${planLabel}${planProgress ? `، ${planProgress}` : ""}، ${tooltipQuestions}، ${tooltipTime}`;

  return (
    <div
      aria-label={ariaLabel}
      className={`study-progress-day study-progress-day-${variant}`}
      data-intensity={day.intensity}
      data-plan-kind={day.planKind}
      data-today={isToday || undefined}
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
      <span className="study-progress-day-kind">{planLabel}</span>
      {planProgress ? <small>{planProgress}</small> : null}
      {showCount && day.answeredQuestions > day.planAnsweredQuestions ? (
        <small className="study-progress-day-total">إجمالي {toArabicNumber(day.answeredQuestions)}</small>
      ) : null}
      <span className="study-progress-day-tooltip" role="tooltip">
        <strong>{dateParts.monthDay}</strong>
        <span>{planLabel}{planProgress ? ` · ${planProgress}` : ""}</span>
        <span>{tooltipQuestions}</span>
        <span>{tooltipTime}</span>
      </span>
    </div>
  );
}

function TodayPlanAction({ progress }: { progress: StudyProgressResponse }) {
  const day = progress.today;
  const isRestDay = day.planKind === "rest";
  const isReviewDay = day.planKind === "review";
  const target = day.questionTarget;
  const isStudyDay = day.planKind === "study" && target !== null;
  const isComplete = isStudyDay && day.planAnsweredQuestions >= target;
  const hasStarted = progress.dailyPlanHasActiveSession || day.planAnsweredQuestions > 0;
  const percent = isStudyDay
    ? Math.min(100, Math.round((day.planAnsweredQuestions / target) * 100))
    : 0;
  const actionLabel = isReviewDay
    ? "ابدأ المراجعة"
    : hasStarted
      ? "استكمل خطة اليوم"
      : "ابدأ خطة اليوم";
  const actionDestination = isReviewDay
    ? "/review"
    : `/study?subject=${day.planSubjectId}&planDate=${day.date}`;
  const title = isRestDay
    ? "يوم الراحة"
    : isReviewDay
      ? "المراجعة"
      : day.planSubjectLabel ?? "خطة الدراسة";
  const progressLabel = isStudyDay
    ? `${toArabicNumber(day.planAnsweredQuestions)} من ${toArabicNumber(target)} سؤال`
    : isReviewDay
      ? "راجع الأسئلة المحفوظة وأخطاءك السابقة"
      : "استعد لخطة الغد بطاقة جديدة";

  const content = (
    <>
      <span className="study-progress-plan-eyebrow">خطة اليوم</span>
      <span className="study-progress-plan-main">
        <strong>{title}</strong>
        <span>{progressLabel}</span>
      </span>
      {isStudyDay ? (
        <span
          aria-label={`اكتمل ${toArabicNumber(percent)} بالمئة`}
          className="study-progress-plan-meter"
          role="progressbar"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={percent}
        >
          <span style={{ width: `${percent}%` }} />
        </span>
      ) : null}
    </>
  );

  if (isRestDay) {
    return (
      <section className="study-progress-today-plan-card" data-plan-kind="rest">
        {content}
        <strong className="study-progress-plan-state">راحة اليوم</strong>
      </section>
    );
  }

  if (isComplete) {
    return (
      <section className="study-progress-today-plan-card" data-plan-kind="complete">
        {content}
        <strong className="study-progress-plan-state">اكتملت خطة اليوم</strong>
      </section>
    );
  }

  return (
    <button
      aria-label={`${actionLabel}: ${title}، ${progressLabel}`}
      className="study-progress-today-plan-card study-progress-plan-action"
      data-plan-kind={day.planKind}
      type="button"
      onClick={() => navigateTo(actionDestination)}
    >
      {content}
      <span className="study-progress-plan-cta">
        <strong>{actionLabel}</strong>
        <span aria-hidden="true">←</span>
      </span>
    </button>
  );
}

function PastUnfinishedPlans({ progress }: { progress: StudyProgressResponse }) {
  const days = progress.pastUnfinishedDays ?? [];

  return (
    <section
      aria-labelledby="past-unfinished-plans-title"
      className="study-progress-past-plans"
      data-empty={days.length === 0}
    >
      <header className="study-progress-past-plans-header">
        <h3 id="past-unfinished-plans-title">أقسام سابقة تحتاج إكمال</h3>
      </header>

      {days.length === 0 ? (
        <p className="study-progress-past-plans-empty">
          <span aria-hidden="true">✓</span>
          ما عندك أقسام سابقة غير مكتملة
        </p>
      ) : (
        <div
          aria-label="الأقسام السابقة غير المكتملة"
          className="study-progress-past-plans-list"
          tabIndex={0}
        >
          {days.map((day) => (
            <PastUnfinishedPlan key={`${day.date}:${day.planSubjectId}`} day={day} />
          ))}
          {progress.pastUnfinishedHasMore ? (
            <p className="study-progress-past-plans-more">
              توجد أقسام أقدم أيضاً
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function PastUnfinishedPlan({ day }: { day: PastUnfinishedStudyPlanDay }) {
  const dateParts = formatDateParts(day.date);
  const status = day.hasStarted ? "غير مكتمل" : "لم يبدأ";
  const progressLabel = `${toArabicNumber(day.planAnsweredQuestions)} / ${toArabicNumber(
    day.questionTarget
  )} سؤال`;

  return (
    <button
      aria-label={`${dateParts.fullDate}، ${day.planSubjectLabel}، ${status}، ${progressLabel}`}
      className="study-progress-past-plan"
      type="button"
      onClick={() =>
        navigateTo(`/study?subject=${day.planSubjectId}&planDate=${day.date}`)
      }
    >
      <span className="study-progress-past-plan-date">
        <strong>{dateParts.weekday}</strong>
        <small>{dateParts.monthDay}</small>
      </span>
      <span className="study-progress-past-plan-content">
        <strong>{day.planSubjectLabel}</strong>
        <small>{progressLabel}</small>
      </span>
      <span className="study-progress-past-plan-status" data-started={day.hasStarted}>
        {status}
      </span>
      <span className="study-progress-past-plan-arrow" aria-hidden="true">←</span>
    </button>
  );
}

function TodayView({ day }: { day: StudyProgressDay }) {
  const dateParts = formatDateParts(day.date);

  return (
    <div className="study-progress-today-view">
      <div className="study-progress-today-stack">
        <CalendarDayCell
          day={day}
          isToday
          showCount={false}
          variant="today"
        />
        <span className="study-progress-daily-connector" aria-hidden="true" />
      </div>
      <div className="study-progress-today-diary">
        <span>{dateParts.fullDate}</span>
        <strong>{toQuestionCount(day.answeredQuestions)}</strong>
        <p>{toStudyMinutes(day.approximateStudySeconds)}</p>
      </div>
    </div>
  );
}

function WeekView({ period, todayDate }: { period: StudyProgressPeriod; todayDate: string }) {
  return (
    <>
      <div className="study-progress-view-meta">
        <strong>{formatWeekRange(period)}</strong>
      </div>
      <div className="study-progress-week-calendar" aria-label="تقويم نشاط الأسبوع">
        {period.days.map((day) => (
          <CalendarDayCell
            day={day}
            isToday={day.date === todayDate}
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
  todayDate
}: {
  isLoading: boolean;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  period: StudyProgressPeriod;
  todayDate: string;
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
            isToday={day.date === todayDate}
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
  onCareerProgressLoaded,
  username
}: {
  onCareerProgressLoaded?: (progress: StudyProgressResponse["career"]) => void;
  username?: string | null;
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
    <section className="study-progress-overview" aria-label="ملخص خطة الدراسة">
      {progress ? (
        <>
          <div className="study-progress-plan-intro">
            <span className="study-progress-welcome-mark" aria-hidden="true">
              <img alt="" src="/assets/brand/abqoor-logo.png" />
            </span>
            <div className="study-progress-welcome-content">
              <span className="study-progress-welcome-kicker">مرحباً بعودتك</span>
              <p className="study-progress-welcome">
                <span>أهلاً بك يا</span>
                <strong>{username?.trim() || "مستخدم عبقور"}</strong>
              </p>
            </div>
            <p className="study-progress-streak-summary">{formatStreakLabel(progress)}</p>
          </div>
          <div className="study-progress-overview-grid">
            <section
              className="study-progress-journey study-progress-journey-plan"
              aria-label="خطة اليوم والأقسام السابقة"
            >
              <div className="study-progress-plan-action-row">
                <TodayPlanAction progress={progress} />
              </div>
              <PastUnfinishedPlans progress={progress} />
            </section>
            <section
              className="study-progress-journey study-progress-journey-progress"
              aria-labelledby="study-progress-title"
            >
              <header className="study-progress-header">
                <h2 id="study-progress-title">تقدم الدراسة</h2>

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

              <div
                className={`study-progress-body study-progress-body-${activeView}`}
                id={`study-progress-${activeView}`}
                role="tabpanel"
              >
                {activeView === "today" ? (
                  <TodayView day={progress.today} />
                ) : null}

                {activeView === "week" ? (
                  <WeekView period={progress.week} todayDate={progress.today.date} />
                ) : null}

                {activeView === "month" ? (
                  <MonthView
                    isLoading={isMonthLoading}
                    onNextMonth={() => handleMonthNavigation(1)}
                    onPreviousMonth={() => handleMonthNavigation(-1)}
                    period={progress.month}
                    todayDate={progress.today.date}
                  />
                ) : null}
              </div>
            </section>
          </div>
        </>
      ) : (
        <section
          className="study-progress-journey study-progress-journey-progress"
          aria-labelledby="study-progress-title"
        >
          <header className="study-progress-header">
            <h2 id="study-progress-title">تقدم الدراسة</h2>
          </header>
          {isLoading ? <p className="study-progress-empty">جاري تحميل التقدم...</p> : null}
          {error ? <p className="study-progress-empty">{error}</p> : null}
        </section>
      )}
    </section>
  );
}
