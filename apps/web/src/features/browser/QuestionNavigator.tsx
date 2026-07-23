import type { Question } from "../../types/question";
import { toQuestionNumber } from "./browserUtils";

export function QuestionNavigator({
  currentQuestionId,
  onOpenQuestion,
  questions
}: {
  currentQuestionId?: string;
  onOpenQuestion: (questionId: string) => void;
  questions: Question[];
}) {
  return (
    <nav className="question-finder" aria-label="الانتقال بين الأسئلة">
      <div className="question-finder-heading">
        <div>
          <strong>انتقل إلى سؤال</strong>
          <span>الأسئلة مرتبة حسب ترتيب الاستيراد</span>
        </div>
        <span>{questions.length} سؤال</span>
      </div>
      <div className="question-finder-list">
        {questions.map((question) => {
          const number = toQuestionNumber(question.id);
          const isCurrent = question.id === currentQuestionId;

          return (
            <button
              aria-current={isCurrent ? "true" : undefined}
              className={isCurrent ? "question-finder-item current" : "question-finder-item"}
              key={question.id}
              title={question.id}
              type="button"
              onClick={() => onOpenQuestion(question.id)}
            >
              {number ?? question.id}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
