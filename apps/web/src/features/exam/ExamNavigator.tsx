import type { ExamQuestion } from "../../types/exam";
import { getNavigatorTone } from "./examUtils";

export function ExamNavigator({
  currentPosition,
  onJump,
  questions
}: {
  currentPosition: number;
  onJump: (positionInSection: number) => void;
  questions: ExamQuestion[];
}) {
  return (
    <div className="exam-navigator-grid" aria-label="قائمة أسئلة القسم">
      {questions.map((question) => {
        const isCurrent = currentPosition === question.positionInSection;
        const tone = getNavigatorTone(question);

        return (
          <button
            aria-current={isCurrent ? "true" : undefined}
            className={`exam-nav-cell ${tone}${isCurrent ? " current-question" : ""}`}
            key={question.positionInSection}
            type="button"
            onClick={() => onJump(question.positionInSection)}
          >
            {question.positionInSection}
          </button>
        );
      })}
    </div>
  );
}
