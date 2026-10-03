import type {
  BankConfig,
  StudyPlanPreview,
  StudyRestDay
} from "../../types/profile";
import { formatPlanDate, getTodayDate, weekdayOptions } from "./studyPlan";

export function StudyPlanDateField({
  bankCount,
  bankConfig,
  isPlanLoading,
  plan,
  startDate,
  onBankCountChange,
  onChange
}: {
  bankCount: number;
  bankConfig: BankConfig;
  isPlanLoading: boolean;
  plan: StudyPlanPreview | null;
  startDate: string;
  onBankCountChange: (value: number) => void;
  onChange: (value: string) => void;
}) {
  const bankCountOptions = Array.from(
    { length: bankConfig.availableBankCount },
    (_value, index) => index + 1
  );

  return (
    <div className="study-plan-date-field">
      <label className="form-field">
        الأقسام المتاحة في خطتي
        <select
          value={bankCount}
          onChange={(event) => onBankCountChange(Number(event.target.value))}
        >
          {bankCountOptions.map((count) => (
            <option key={count} value={count}>
              {count.toLocaleString("ar-SA")} {count === 1 ? "قسم" : "أقسام"}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        تاريخ بدء الخطة
        <input
          min={getTodayDate()}
          type="date"
          value={startDate}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <button className="secondary study-plan-today" type="button" onClick={() => onChange(getTodayDate())}>
        أبدأ اليوم
      </button>
      <p className="study-plan-basis">
        {bankCount.toLocaleString("ar-SA")} قسماً في {bankCount.toLocaleString("ar-SA")} جلسة دراسة
      </p>
      {isPlanLoading ? <p className="study-plan-inline-summary">جاري حساب الخطة...</p> : null}
      {plan ? (
        <p className="study-plan-inline-summary">
          {plan.weeklyStudyDays.toLocaleString("ar-SA")} أيام دراسة أسبوعياً، يوم مراجعة، يوم راحة. الانتهاء المتوقع {formatPlanDate(plan.completionDate)}
        </p>
      ) : null}
    </div>
  );
}

export function StudyPlanScheduleField({
  isPlanLoading,
  plan,
  restDay,
  reviewDay,
  onConflict,
  onRestDayChange,
  onReviewDayChange
}: {
  isPlanLoading: boolean;
  plan: StudyPlanPreview | null;
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  onConflict: (message: string) => void;
  onRestDayChange: (value: StudyRestDay) => void;
  onReviewDayChange: (value: StudyRestDay) => void;
}) {
  const selectRestDay = (day: StudyRestDay) => {
    if (day === reviewDay) {
      onConflict("اليوم المختار للمراجعة لا يمكن اختياره كيوم راحة.");
      return;
    }
    onConflict("");
    onRestDayChange(day);
  };
  const selectReviewDay = (day: StudyRestDay) => {
    if (day === restDay) {
      onConflict("اليوم المختار للراحة لا يمكن اختياره كيوم مراجعة.");
      return;
    }
    onConflict("");
    onReviewDayChange(day);
  };

  return (
    <div className="study-plan-rest-field">
      <div className="study-plan-schedule-choice">
        <strong>يوم الراحة</strong>
        <div className="study-plan-weekdays" role="group" aria-label="يوم الراحة الأسبوعي">
          {weekdayOptions.map((day) => (
            <button
              aria-pressed={restDay === day.value}
              className={restDay === day.value ? "selected rest-day" : undefined}
              key={day.value}
              type="button"
              onClick={() => selectRestDay(day.value)}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>
      <div className="study-plan-schedule-choice">
        <strong>يوم المراجعة</strong>
        <div className="study-plan-weekdays" role="group" aria-label="يوم المراجعة الأسبوعي">
          {weekdayOptions.map((day) => (
            <button
              aria-pressed={reviewDay === day.value}
              className={reviewDay === day.value ? "selected review-day" : undefined}
              key={day.value}
              type="button"
              onClick={() => selectReviewDay(day.value)}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>
      {isPlanLoading ? <p className="study-plan-inline-summary">جاري تحديث توزيع الأسبوع...</p> : null}
      {plan ? (
        <div className="study-plan-result" aria-live="polite">
          <div className="study-plan-week-preview" aria-label="التوزيع الأسبوعي المشتق تلقائياً">
            {plan.schedule.map((day) => {
              const weekday = weekdayOptions.find((option) => option.value === day.weekday);
              const label = day.kind === "rest"
                ? "راحة"
                : day.kind === "review"
                  ? "مراجعة"
                  : `${day.subjectLabel} · ${day.questionTarget?.toLocaleString("ar-SA")}`;

              return (
                <div data-kind={day.kind} key={day.date}>
                  <span>{weekday?.label}</span>
                  <strong>{label}</strong>
                </div>
              );
            })}
          </div>
          <strong>٥ أيام دراسة · يوم مراجعة · يوم راحة</strong>
          <span>تاريخ الانتهاء: {formatPlanDate(plan.completionDate)}</span>
        </div>
      ) : null}
    </div>
  );
}
