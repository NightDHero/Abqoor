import { useState } from "react";
import type { StudyPlanPreview, StudyRestDay } from "../../types/profile";
import {
  formatPlanDate,
  getStudyDistribution,
  getTodayDate,
  temporaryAvailableSectionCount,
  weekdayOptions,
  type StudyDistribution
} from "./studyPlan";

export function StudyPlanDateField({
  isPlanLoading,
  plan,
  startDate,
  onChange
}: {
  isPlanLoading: boolean;
  plan: StudyPlanPreview | null;
  startDate: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="study-plan-date-field">
      <div className="form-field study-plan-section-count">
        <span>الأقسام المتاحة في خطتي</span>
        <strong>{temporaryAvailableSectionCount.toLocaleString("ar-SA")} قسماً</strong>
      </div>
      <label className="form-field">
        تاريخ بدء الخطة
        <input min={getTodayDate()} type="date" value={startDate} onChange={(event) => onChange(event.target.value)} />
      </label>
      <button className="secondary study-plan-today" type="button" onClick={() => onChange(getTodayDate())}>
        أبدأ اليوم
      </button>
      {isPlanLoading ? (
        <p className="study-plan-basis">جاري حساب مدة الخطة...</p>
      ) : plan ? (
        <p className="study-plan-basis">
          {temporaryAvailableSectionCount.toLocaleString("ar-SA")} قسماً في {plan.calendarDays.toLocaleString("ar-SA")} يوماً
        </p>
      ) : null}
      {plan ? (
        <p className="study-plan-inline-summary">
          ٥ أيام مذاكرة، يوم مراجعة، ويوم راحة. الانتهاء المتوقع {formatPlanDate(plan.completionDate)}
        </p>
      ) : null}
    </div>
  );
}

export function StudyPlanScheduleField({
  initiallyCollapsed = false,
  isPlanLoading,
  plan,
  quantitativeStudyDays,
  restDay,
  reviewDay,
  verbalStudyDays,
  onScheduleChange,
  onStudyDaysChange
}: {
  initiallyCollapsed?: boolean;
  isPlanLoading: boolean;
  plan: StudyPlanPreview | null;
  quantitativeStudyDays: StudyRestDay[];
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  verbalStudyDays: StudyRestDay[];
  onScheduleChange: (value: {
    quantitativeStudyDays: StudyRestDay[];
    restDay: StudyRestDay;
    reviewDay: StudyRestDay;
    verbalStudyDays: StudyRestDay[];
  }) => void;
  onStudyDaysChange: (quantitativeDays: StudyRestDay[], verbalDays: StudyRestDay[]) => void;
}) {
  const [isEditing, setIsEditing] = useState(!initiallyCollapsed);
  const distribution = getStudyDistribution(quantitativeStudyDays);
  const quantitativeTarget = distribution === "quantitative-majority" ? 3 : 2;
  const verbalTarget = distribution === "verbal-majority" ? 3 : 2;
  const getDayLabel = (day: StudyRestDay) =>
    weekdayOptions.find((option) => option.value === day)?.label ?? "";
  const orderedLabels = (days: readonly StudyRestDay[]) =>
    weekdayOptions.filter((option) => days.includes(option.value)).map((option) => option.label).join(" · ");
  const toggleSubjectDay = (day: StudyRestDay, subject: "quantitative" | "verbal") => {
    const selectedDays = subject === "quantitative" ? quantitativeStudyDays : verbalStudyDays;
    const blockedDays = subject === "quantitative" ? verbalStudyDays : quantitativeStudyDays;
    const target = subject === "quantitative" ? quantitativeTarget : verbalTarget;
    if (selectedDays.includes(day)) {
      const next = selectedDays.filter((selectedDay) => selectedDay !== day);
      onStudyDaysChange(
        subject === "quantitative" ? next : quantitativeStudyDays,
        subject === "verbal" ? next : verbalStudyDays
      );
      return;
    }
    if (blockedDays.includes(day) || day === restDay || day === reviewDay || selectedDays.length >= target) return;
    const next = [...selectedDays, day].sort((left, right) => left - right);
    onStudyDaysChange(
      subject === "quantitative" ? next : quantitativeStudyDays,
      subject === "verbal" ? next : verbalStudyDays
    );
  };

  const changeDistribution = (next: StudyDistribution) => {
    if (next !== distribution) onStudyDaysChange(verbalStudyDays, quantitativeStudyDays);
  };

  const changeStandaloneDay = (
    role: "review" | "rest",
    day: StudyRestDay
  ) => {
    const previousDay = role === "review" ? reviewDay : restDay;
    const replaceSubjectDay = (days: StudyRestDay[]) =>
      days.includes(day)
        ? days.map((value) => value === day ? previousDay : value).sort((left, right) => left - right)
        : days;

    onScheduleChange({
      quantitativeStudyDays: replaceSubjectDay(quantitativeStudyDays),
      restDay: role === "rest"
        ? day
        : day === restDay ? previousDay : restDay,
      reviewDay: role === "review"
        ? day
        : day === reviewDay ? previousDay : reviewDay,
      verbalStudyDays: replaceSubjectDay(verbalStudyDays)
    });
  };

  const renderDayButtons = (
    role: "quantitative" | "verbal" | "review" | "rest"
  ) => weekdayOptions.map((day) => {
    const selected = role === "quantitative"
      ? quantitativeStudyDays.includes(day.value)
      : role === "verbal"
        ? verbalStudyDays.includes(day.value)
        : role === "review"
          ? reviewDay === day.value
          : restDay === day.value;
    const disabled = role === "quantitative"
      ? !selected && (verbalStudyDays.includes(day.value) || day.value === restDay || day.value === reviewDay || quantitativeStudyDays.length >= quantitativeTarget)
      : role === "verbal"
        ? !selected && (quantitativeStudyDays.includes(day.value) || day.value === restDay || day.value === reviewDay || verbalStudyDays.length >= verbalTarget)
        : false;
    const className = selected ? `selected ${role}-day` : undefined;
    return (
      <button
        aria-pressed={selected}
        className={className}
        disabled={disabled}
        key={day.value}
        type="button"
        onClick={() => {
          if (role === "quantitative" || role === "verbal") toggleSubjectDay(day.value, role);
          else changeStandaloneDay(role, day.value);
        }}
      >
        <span>{day.label}</span>
        {selected ? <b aria-hidden="true">✓</b> : null}
      </button>
    );
  });

  return (
    <div className="study-plan-rest-field">
      {initiallyCollapsed && !isEditing ? (
        <div className="study-plan-schedule-summary">
          <div><span>الكمي</span><strong>{orderedLabels(quantitativeStudyDays)}</strong></div>
          <div><span>اللفظي</span><strong>{orderedLabels(verbalStudyDays)}</strong></div>
          <div><span>المراجعة</span><strong>{getDayLabel(reviewDay)}</strong></div>
          <div><span>الراحة</span><strong>{getDayLabel(restDay)}</strong></div>
          <button className="secondary" type="button" onClick={() => setIsEditing(true)}>تعديل الجدول الأسبوعي</button>
        </div>
      ) : (
        <>
          <div className="study-plan-schedule-intro">
            <div><strong>جدول مذاكرتك الأسبوعي</strong><span>٥ أيام مذاكرة · يوم مراجعة مستقل · يوم راحة مستقل</span></div>
          </div>
          <div className="study-plan-distribution" role="group" aria-label="توزيع أيام الكمي واللفظي">
            <button aria-pressed={distribution === "quantitative-majority"} className={distribution === "quantitative-majority" ? "selected" : undefined} type="button" onClick={() => changeDistribution("quantitative-majority")}>٣ كمي + ٢ لفظي</button>
            <button aria-pressed={distribution === "verbal-majority"} className={distribution === "verbal-majority" ? "selected" : undefined} type="button" onClick={() => changeDistribution("verbal-majority")}>٢ كمي + ٣ لفظي</button>
          </div>
          <p className="study-plan-alternation-note">في الأسبوع التالي ينعكس توزيع الكمي واللفظي تلقائياً، بينما يبقى يوما المراجعة والراحة ثابتين.</p>

          <div className="study-plan-schedule-choice quantitative-days">
            <div className="study-plan-choice-heading"><strong>أيام الكمي</strong><span>{quantitativeStudyDays.length.toLocaleString("ar-SA")} / {quantitativeTarget.toLocaleString("ar-SA")}</span></div>
            <div className="study-plan-weekdays" role="group" aria-label="أيام الكمي">{renderDayButtons("quantitative")}</div>
          </div>
          <div className="study-plan-schedule-choice verbal-days">
            <div className="study-plan-choice-heading"><strong>أيام اللفظي</strong><span>{verbalStudyDays.length.toLocaleString("ar-SA")} / {verbalTarget.toLocaleString("ar-SA")}</span></div>
            <div className="study-plan-weekdays" role="group" aria-label="أيام اللفظي">{renderDayButtons("verbal")}</div>
          </div>
          <div className="study-plan-schedule-choice review-days">
            <div className="study-plan-choice-heading"><strong>يوم المراجعة</strong><span>يوم مستقل</span></div>
            <div className="study-plan-weekdays" role="group" aria-label="يوم المراجعة الأسبوعي">{renderDayButtons("review")}</div>
          </div>
          <div className="study-plan-schedule-choice rest-days">
            <div className="study-plan-choice-heading"><strong>يوم الراحة</strong><span>يوم مستقل</span></div>
            <div className="study-plan-weekdays" role="group" aria-label="يوم الراحة الأسبوعي">{renderDayButtons("rest")}</div>
          </div>

          {isPlanLoading ? <p className="study-plan-inline-summary">جاري تحديث توزيع الأسبوع...</p> : null}
          {plan ? (
            <div className="study-plan-result" aria-live="polite">
              <div className="study-plan-week-preview" aria-label="التوزيع الأسبوعي">
                {plan.schedule.map((day) => {
                  const weekday = weekdayOptions.find((option) => option.value === day.weekday);
                  const label = day.kind === "rest" ? "راحة" : day.kind === "review" ? "مراجعة" : `${day.subjectLabel} · ${day.questionTarget?.toLocaleString("ar-SA")}`;
                  return <div data-kind={day.kind} key={day.date}><span>{weekday?.label}</span><strong>{label}</strong></div>;
                })}
              </div>
              <strong>٥ أيام مذاكرة · يوم مراجعة · يوم راحة</strong>
              <span>تاريخ الانتهاء: {formatPlanDate(plan.completionDate)}</span>
            </div>
          ) : null}
          {initiallyCollapsed ? <button className="secondary study-plan-finish-edit" type="button" onClick={() => setIsEditing(false)}>تم</button> : null}
        </>
      )}
    </div>
  );
}
