import type { BankConfig, StudyRestDay } from "../../types/profile";
import {
  calculateStudyPlan,
  formatPlanDate,
  getTodayDate,
  weekdayOptions
} from "./studyPlan";

export function StudyPlanDateField({
  bankConfig,
  restDay,
  reviewDay,
  startDate,
  onChange
}: {
  bankConfig: BankConfig;
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  startDate: string;
  onChange: (value: string) => void;
}) {
  const plan = calculateStudyPlan({
    bankCount: bankConfig.availableBankCount,
    restDay,
    reviewDay,
    startDate
  });

  return (
    <div className="study-plan-date-field">
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
        {bankConfig.availableBankCount.toLocaleString("ar-SA")} قسم متاح، قسم واحد يومياً
      </p>
      {plan ? (
        <p className="study-plan-inline-summary">
          {plan.studyDays.toLocaleString("ar-SA")} يوم مذاكرة، والانتهاء المتوقع {formatPlanDate(plan.completionDate)}
        </p>
      ) : null}
    </div>
  );
}

export function StudyPlanScheduleField({
  bankConfig,
  restDay,
  reviewDay,
  startDate,
  onConflict,
  onRestDayChange,
  onReviewDayChange
}: {
  bankConfig: BankConfig;
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  startDate: string;
  onConflict: (message: string) => void;
  onRestDayChange: (value: StudyRestDay) => void;
  onReviewDayChange: (value: StudyRestDay) => void;
}) {
  const plan = calculateStudyPlan({
    bankCount: bankConfig.availableBankCount,
    restDay,
    reviewDay,
    startDate
  });
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
      {plan ? (
        <div className="study-plan-result" aria-live="polite">
          <strong>
            {plan.calendarDays.toLocaleString("ar-SA")} يوم مذاكرة من أصل {plan.studyDays.toLocaleString("ar-SA")} مذاكرة
          </strong>
          <span>تاريخ الانتهاء: {formatPlanDate(plan.completionDate)}</span>
        </div>
      ) : null}
    </div>
  );
}
