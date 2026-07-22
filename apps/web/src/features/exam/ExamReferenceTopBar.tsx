import { getTodayIsoDate } from "./examUtils";

export function ExamReferenceTopBar() {
  return (
    <header className="exam-reference-topbar">
      <div className="exam-reference-brand" aria-label="قياس">
        قياس
      </div>
      <time dateTime={getTodayIsoDate()}>{getTodayIsoDate()}</time>
      <div className="exam-reference-title">
        <strong>اختبار</strong>
        <span>القدرات</span>
      </div>
    </header>
  );
}
