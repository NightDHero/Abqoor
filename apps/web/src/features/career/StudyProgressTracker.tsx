import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { HttpError } from "../../services/http";
import { sessionService } from "../../services/sessionService";
import type {
  StudyProgressDay,
  StudyProgressPeriod,
  StudyProgressResponse
} from "../../types/session";

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
      weekday: "long"
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
  selectedDay
}: {
  day: StudyProgressDay;
  onSelect: (day: StudyProgressDay) => void;
  selectedDay: StudyProgressDay;
}) {
  const dateParts = formatDateParts(day.date);

  return (
    <div className="study-progress-today-view">
      <CalendarDayCell
        day={day}
        isSelected={selectedDay.date === day.date}
        onSelect={onSelect}
        showCount={false}
        variant="today"
      />
      <div className="study-progress-today-diary">
        <span>{dateParts.fullDate}</span>
        <strong>{toQuestionCount(day.answeredQuestions)}</strong>
        <p>{toStudyMinutes(day.approximateStudySeconds)}</p>
      </div>
    </div>
  );
}

function WeekView({
  onSelect,
  period,
  selectedDay
}: {
  onSelect: (day: StudyProgressDay) => void;
  period: StudyProgressPeriod;
  selectedDay: StudyProgressDay;
}) {
  return (
    <>
      <div className="study-progress-view-meta">
        <strong>{formatWeekRange(period)}</strong>
        <span>{`${toArabicNumber(period.activeDays)} يوم نشط`}</span>
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
  onSelect,
  period,
  selectedDay
}: {
  onSelect: (day: StudyProgressDay) => void;
  period: StudyProgressPeriod;
  selectedDay: StudyProgressDay;
}) {
  const leadingBlankDays = period.days[0] ? toDate(period.days[0].date).getUTCDay() : 0;
  const trailingBlankDays =
    (7 - ((leadingBlankDays + period.days.length) % 7)) % 7;

  return (
    <>
      <div className="study-progress-view-meta">
        <strong>{formatMonthTitle(period)}</strong>
        <span>{`${toArabicNumber(period.activeDays)} يوم نشط`}</span>
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

export function StudyProgressTracker() {
  const [activeView, setActiveView] = useState<ProgressView>("week");
  const [selectedDay, setSelectedDay] = useState<StudyProgressDay | null>(null);
  const [progress, setProgress] = useState<StudyProgressResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let isMounted = true;

    void sessionService
      .getProgress(timeZone)
      .then((response) => {
        if (isMounted) {
          const defaultView =
            response.today.answeredQuestions > 0 ? "today" : "week";

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

  const handleViewChange = (view: ProgressView) => {
    setActiveView(view);

    if (progress) {
      setSelectedDay(getDefaultDetailDay(progress, view));
    }
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
              selectedDay={selectedDay}
            />
          ) : null}

          {activeView === "week" ? (
            <WeekView
              onSelect={setSelectedDay}
              period={progress.week}
              selectedDay={selectedDay}
            />
          ) : null}

          {activeView === "month" ? (
            <MonthView
              onSelect={setSelectedDay}
              period={progress.month}
              selectedDay={selectedDay}
            />
          ) : null}

          <SelectedDayDetail day={selectedDay} />
        </div>
      ) : null}
    </section>
  );
}
