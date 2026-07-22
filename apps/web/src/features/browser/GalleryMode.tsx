import type { Question } from "../../types/question";
import { toMediaSrc, toQuestionNumber } from "./browserUtils";
import { ReviewButton } from "./ReviewButton";

export function GalleryMode({
  isInReview,
  onAddReview,
  onOpenQuestion,
  questions
}: {
  isInReview: (questionId: string) => boolean;
  onAddReview: (questionId: string) => void;
  onOpenQuestion: (questionId: string) => void;
  questions: Question[];
}) {
  return (
    <section className="browser-gallery" aria-label="معرض الأسئلة">
      {questions.map((question) => {
        const questionNumber = toQuestionNumber(question.id);

        return (
          <article className="browser-gallery-item" key={question.id}>
            <div className="browser-gallery-heading">
              <strong dir="ltr">{question.id}</strong>
              {questionNumber ? <span>رقم {questionNumber}</span> : null}
            </div>
            <img
              alt={`Question ${question.id}`}
              className="browser-gallery-image"
              src={toMediaSrc(question.questionImageUrl)}
            />
            <div className="action-row">
              <button type="button" onClick={() => onOpenQuestion(question.id)}>
                فتح السؤال
              </button>
              <ReviewButton
                isInReview={isInReview(question.id)}
                onAdd={() => onAddReview(question.id)}
              />
            </div>
          </article>
        );
      })}
    </section>
  );
}
