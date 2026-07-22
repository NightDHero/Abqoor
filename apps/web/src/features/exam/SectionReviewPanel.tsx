import type { ExamSection } from "../../types/exam";
import { ExamNavigator } from "./ExamNavigator";
import { getSectionCounts } from "./examUtils";

export function SectionReviewPanel({
  currentPosition,
  isCompleting,
  onClose,
  onComplete,
  onJump,
  section
}: {
  currentPosition: number;
  isCompleting: boolean;
  onClose: () => void;
  onComplete: () => void;
  onJump: (positionInSection: number) => void;
  section: ExamSection;
}) {
  const counts = getSectionCounts(section);

  return (
    <div className="exam-review-overlay" role="dialog" aria-modal="true">
      <section className="exam-review-panel" aria-labelledby="section-review-title">
        <h2 id="section-review-title">مراجعة القسم {section.sectionNumber}</h2>

        <dl className="exam-counts">
          <div>
            <dt>تمت الإجابة</dt>
            <dd>{counts.answered}</dd>
          </div>
          <div>
            <dt>للمراجعة</dt>
            <dd>{counts.flagged}</dd>
          </div>
          <div>
            <dt>غير محلولة</dt>
            <dd>{counts.unanswered}</dd>
          </div>
        </dl>

        <ExamNavigator
          currentPosition={currentPosition}
          onJump={(position) => {
            onJump(position);
            onClose();
          }}
          questions={section.questions}
        />

        <div className="action-row">
          <button type="button" onClick={onClose}>
            العودة للقسم
          </button>
          <button type="button" disabled={isCompleting} onClick={onComplete}>
            {isCompleting ? "جاري إنهاء القسم..." : "إنهاء القسم"}
          </button>
        </div>
      </section>
    </div>
  );
}
