import type { ExamQuestion } from "../../types/exam";
import type { CorrectAnswer } from "../../types/session";
import { toArabicAnswerLabel } from "../../utils/answerLabels";
import { examAnswerOptions, toExamImageSrc } from "./examUtils";

export function ExamQuestionView({
  onAnswer,
  question
}: {
  onAnswer: (answer: CorrectAnswer) => void;
  question: ExamQuestion;
}) {
  return (
    <section className="exam-reference-question" aria-label="سؤال الاختبار">
      <div className="exam-question-number">رقم السؤال {question.globalPosition}</div>

      <div className="exam-reference-image-panel">
        <img
          alt={`Question ${question.questionId}`}
          src={toExamImageSrc(question.questionImageUrl)}
        />
      </div>

      <div className="exam-reference-options" role="group" aria-label="خيارات الإجابة">
        {examAnswerOptions.map((answer) => {
          const label = toArabicAnswerLabel(answer);

          return (
            <button
              aria-pressed={question.userAnswer === answer}
              className={
                question.userAnswer === answer
                  ? "exam-reference-option selected"
                  : "exam-reference-option"
              }
              key={answer}
              type="button"
              onClick={() => onAnswer(answer)}
            >
              <span className="exam-option-letter">{label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
