import type { SubmitAnswerResponse } from "../../types/session";
import { toArabicAnswerLabel } from "../../utils/answerLabels";

export function FeedbackPanel({
  feedback
}: {
  feedback: SubmitAnswerResponse;
}) {
  return (
    <section className="feedback-panel" aria-live="polite">
      <strong>{feedback.isCorrect ? "الإجابة صحيحة" : "الإجابة غير صحيحة"}</strong>
      <span>إجابتك: {toArabicAnswerLabel(feedback.userAnswer)}</span>
      <span>الإجابة الصحيحة: {toArabicAnswerLabel(feedback.correctAnswer)}</span>
    </section>
  );
}
