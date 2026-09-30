import type { BankConfig, StudyRestDay } from "../../types/profile";
import {
  calculateStudyPlan,
  formatPlanDate,
  getTodayDate,
  weekdayOptions
} from "./studyPlan";

export function StudyPlanDateField({
  bankConfig,
  startDate,
  onChange
}: {
  bankConfig: BankConfig;
  startDate: string;
  onChange: (value: string) => void;
}) {
  const plan = calculateStudyPlan({
    bankCount: bankConfig.availableBankCount,
    restDays: [],
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

export function StudyPlanRestDaysField({
  bankConfig,
  restDays,
  startDate,
  onChange
}: {
  bankConfig: BankConfig;
  restDays: StudyRestDay[];
  startDate: string;
  onChange: (value: StudyRestDay[]) => void;
}) {
  const plan = calculateStudyPlan({
    bankCount: bankConfig.availableBankCount,
    restDays,
    startDate
  });
  const toggleDay = (day: StudyRestDay) => {
    onChange(
      restDays.includes(day)
        ? restDays.filter((value) => value !== day)
        : [...restDays, day].sort()
    );
  };

  return (
    <div className="study-plan-rest-field">
      <div className="study-plan-weekdays" role="group" aria-label="أيام الراحة الأسبوعية">
        {weekdayOptions.map((day) => (
          <button
            aria-pressed={restDays.includes(day.value)}
            className={restDays.includes(day.value) ? "selected" : undefined}
            key={day.value}
            type="button"
            onClick={() => toggleDay(day.value)}
          >
            {day.label}
          </button>
        ))}
      </div>
      {plan ? (
        <div className="study-plan-result" aria-live="polite">
          <strong>
            {plan.calendarDays.toLocaleString("ar-SA")} يوم مذاكرة من أصل {plan.studyDays.toLocaleString("ar-SA")} مذاكرة
          </strong>
          <span>تاريخ الانتهاء: {formatPlanDate(plan.completionDate)}</span>
        </div>
      ) : (
        <p className="error-message">يجب إبقاء يوم واحد على الأقل للمذاكرة.</p>
      )}
    </div>
  );
}
