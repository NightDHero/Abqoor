import type { CorrectAnswer } from "../../types/session";
export function AnswerFeedback({
  isCorrect
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
      <img
        alt=""
        className="answer-feedback-icon"
        src={isCorrect ? "/assets/feedback/check.png" : "/assets/feedback/wrong.png"}
      />
      <strong>{isCorrect ? "إجابة صحيحة" : "راجع الإجابة الصحيحة"}</strong>
    </section>
  );
}
