import type { ExamSection } from "../../types/exam";
import { ExamNavigator } from "./ExamNavigator";
import {
  formatExamTimer,
  getSectionCounts,
  getTimerTone
} from "./examUtils";

export function ExamSidebar({
  currentPosition,
  isCompleting,
  onCompleteSection,
  onJump,
  remainingSeconds,
  section,
  userEmail
}: {
  currentPosition: number;
  isCompleting: boolean;
  onCompleteSection: () => void;
  onJump: (positionInSection: number) => void;
  remainingSeconds: number;
  section: ExamSection;
  userEmail?: string;
}) {
  const counts = getSectionCounts(section);
  const timerTone = getTimerTone(remainingSeconds);

  return (
    <aside className="exam-reference-sidebar" aria-label="لوحة حالة الاختبار">
      <section className="exam-time-card">
        <span>الوقت المتبقي</span>
        <strong className={`exam-reference-timer ${timerTone}`}>
          {formatExamTimer(remainingSeconds)}
        </strong>
      </section>

      <section className="exam-user-card">
        <div className="exam-avatar" aria-hidden="true" />
        <div>
          <p>اسم الطالب: {userEmail ?? "طالب عبقور"}</p>
          <p>المستخدم: ###</p>
        </div>
      </section>

      <section className="exam-side-stats">
        <p>القسم الحالي: {section.sectionNumber} / 5</p>
        <p>مجموع الأسئلة: 125</p>
        <div className="exam-stat-grid">
          <div>
            <strong className="answered">{counts.answered}</strong>
            <span>تمت الإجابة</span>
          </div>
          <div>
            <strong className="flagged">{counts.flagged}</strong>
            <span>للمراجعة</span>
          </div>
        </div>
      </section>

      <section className="exam-side-navigator">
        <ExamNavigator
          currentPosition={currentPosition}
          onJump={onJump}
          questions={section.questions}
        />
      </section>

      <section className="exam-side-actions">
        <button
          className="danger"
          type="button"
          disabled={isCompleting}
          onClick={onCompleteSection}
        >
          {isCompleting ? "جاري إنهاء القسم..." : "إنهاء القسم"}
        </button>
      </section>
    </aside>
  );
}
