import type { CorrectAnswer } from "../../types/session";
import { toArabicAnswerLabel } from "../../utils/answerLabels";

export function AnswerFeedback({
  correctAnswer,
  isCorrect,
  userAnswer
}: {
  correctAnswer: CorrectAnswer;
  isCorrect: boolean;
  userAnswer: CorrectAnswer;
}) {
  return (
    <section
      className={`answer-feedback ${isCorrect ? "answer-feedback-correct" : "answer-feedback-incorrect"}`}
      aria-live="polite"
    >
      {isCorrect ? (
        <span className="answer-feedback-particles" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <i key={index} />
          ))}
        </span>
      ) : null}
      <span className="answer-feedback-mark" aria-hidden="true">
        {isCorrect ? "✓" : "×"}
      </span>
      <div>
        <strong>{isCorrect ? "إجابة صحيحة" : "ليست الإجابة الصحيحة"}</strong>
        <p>
          {isCorrect
            ? `أحسنت، الإجابة ${toArabicAnswerLabel(correctAnswer)} صحيحة.`
            : `اخترت ${toArabicAnswerLabel(userAnswer)}، والإجابة الصحيحة هي ${toArabicAnswerLabel(correctAnswer)}.`}
        </p>
      </div>
    </section>
  );
}
