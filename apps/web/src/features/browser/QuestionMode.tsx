import type { CorrectAnswer, Question } from "../../types/question";
import { toArabicAnswerLabel } from "../../utils/answerLabels";
import {
  answers,
  getAnswerImageUrl,
  toMediaSrc,
  toQuestionNumber
} from "./browserUtils";
import { ReviewButton } from "./ReviewButton";

export function QuestionMode({
  currentIndex,
  isInReview,
  onAddReview,
  onAnswer,
  onNext,
  onPrevious,
  question,
  selectedAnswer,
  totalQuestions
}: {
  currentIndex: number;
  isInReview: boolean;
  onAddReview: () => void;
  onAnswer: (answer: CorrectAnswer) => void;
  onNext: () => void;
  onPrevious: () => void;
  question: Question;
  selectedAnswer?: CorrectAnswer;
  totalQuestions: number;
}) {
  const isAnswered = Boolean(selectedAnswer);
  const isCorrect = selectedAnswer === question.correctAnswer;
  const questionNumber = toQuestionNumber(question.id);
  const selectedAnswerLabel = selectedAnswer
    ? toArabicAnswerLabel(selectedAnswer)
    : "";

  return (
    <section className="browser-question-mode" aria-labelledby="browser-question-title">
      <div className="browser-question-heading">
        <div>
          <p className="question-progress">
            السؤال {currentIndex + 1} / {totalQuestions}
          </p>
          <h2 id="browser-question-title" dir="ltr">
            {question.id}
          </h2>
          {questionNumber ? <span>رقم السؤال: {questionNumber}</span> : null}
        </div>
        <ReviewButton isInReview={isInReview} onAdd={onAddReview} />
      </div>

      <img
        alt={`Question ${question.id}`}
        className="question-image"
        src={toMediaSrc(question.questionImageUrl)}
      />

      <div className="answer-options" role="group" aria-label="خيارات الإجابة">
        {answers.map((answer) => {
          const answerImageUrl = getAnswerImageUrl(question, answer);
          const isSelected = selectedAnswer === answer;
          const answerLabel = toArabicAnswerLabel(answer);

          return (
            <button
              aria-pressed={isSelected}
              className={isSelected ? "answer-option selected" : "answer-option"}
              key={answer}
              type="button"
              onClick={() => onAnswer(answer)}
            >
              <span>{answerLabel}</span>
              {answerImageUrl ? (
                <img
                  alt={`Answer ${answerLabel}`}
                  className="answer-image"
                  src={toMediaSrc(answerImageUrl)}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {isAnswered ? (
        <section className="feedback-panel" aria-live="polite">
          <strong>{isCorrect ? "الإجابة صحيحة" : "الإجابة غير صحيحة"}</strong>
          <span>إجابتك: {selectedAnswerLabel}</span>
          <span>الإجابة الصحيحة: {toArabicAnswerLabel(question.correctAnswer)}</span>
        </section>
      ) : null}

      <div className="browser-navigation-row">
        <button type="button" disabled={currentIndex === 0} onClick={onPrevious}>
          السابق
        </button>
        <button
          type="button"
          disabled={currentIndex >= totalQuestions - 1}
          onClick={onNext}
        >
          التالي
        </button>
      </div>
    </section>
  );
}
