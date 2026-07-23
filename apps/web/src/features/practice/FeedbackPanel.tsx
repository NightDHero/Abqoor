import type { SubmitAnswerResponse } from "../../types/session";
import { AnswerFeedback } from "../../components/ui/AnswerFeedback";

export function FeedbackPanel({
  feedback
}: {
  feedback: SubmitAnswerResponse;
}) {
  return (
    <AnswerFeedback
      correctAnswer={feedback.correctAnswer}
      isCorrect={feedback.isCorrect}
      userAnswer={feedback.userAnswer}
    />
  );
}
