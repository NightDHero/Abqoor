import type {
  CorrectAnswer,
  SessionQuestion,
  SubmitAnswerResponse
} from "../../types/session";
import { toArabicAnswerLabel } from "../../utils/answerLabels";
import { studyAnswers, toStudyImageSrc } from "./studyUtils";

export function StudyQuestion({
  currentIndex,
  isInReview,
  isLastQuestion,
  isSavingReview,
  isSubmitting,
  onAnswer,
  onNext,
  onPrevious,
  onSaveReview,
  question,
  response,
  totalQuestions
}: {
  currentIndex: number;
  isInReview: boolean;
  isLastQuestion: boolean;
  isSavingReview: boolean;
  isSubmitting: boolean;
  onAnswer: (answer: CorrectAnswer) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSaveReview: () => void;
  question: SessionQuestion;
  response?: SubmitAnswerResponse;
  totalQuestions: number;
}) {
  return (
    <section
      className="solving-workspace study-question"
      aria-labelledby="study-question-title"
    >
      <header className="solving-workspace-toolbar">
        <div>
          <p className="question-progress">
            السؤال {currentIndex + 1} / {totalQuestions}
          </p>
          <h2 id="study-question-title">حصة</h2>
          <span dir="ltr">{question.id}</span>
        </div>
        <button
          className="review-toggle"
          type="button"
          disabled={isInReview || isSavingReview}
          onClick={onSaveReview}
        >
          <img alt="" src="/assets/actions/save.png" />
          <span>{isInReview ? "محفوظ" : "حفظ"}</span>
        </button>
      </header>

      <div className="solving-workspace-grid">
        <figure className="solving-question-stage">
          <img
            alt={`Question ${question.id}`}
            className="question-image"
            src={toStudyImageSrc(question.questionImageUrl)}
          />
        </figure>

        <aside className="solving-answer-dock">
          <div className="answer-options" role="group" aria-label="خيارات الإجابة">
            {studyAnswers.map((answer) => {
              const isSelected = response?.userAnswer === answer;
              const isAnswered = Boolean(response);

              return (
                <button
                  aria-pressed={isSelected}
                  className={[
                    "answer-option",
                    isSelected ? "selected" : "",
                    isAnswered && answer === response?.correctAnswer ? "answer-correct" : "",
                    isAnswered && isSelected && answer !== response?.correctAnswer
                      ? "answer-wrong"
                      : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={Boolean(response) || isSubmitting}
                  key={answer}
                  type="button"
                  onClick={() => onAnswer(answer)}
                >
                  {toArabicAnswerLabel(answer)}
                  {isAnswered && answer === response?.correctAnswer ? (
                    <img
                      alt=""
                      className="answer-outcome-icon"
                      src="/assets/feedback/check.png"
                    />
                  ) : null}
                  {isAnswered &&
                  isSelected &&
                  answer !== response?.correctAnswer ? (
                    <img
                      alt=""
                      className="answer-outcome-icon"
                      src="/assets/feedback/wrong.png"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="browser-navigation-row">
            <button
              aria-label="السؤال السابق"
              className="question-previous-button"
              type="button"
              disabled={currentIndex === 0}
              onClick={onPrevious}
            >
              <img alt="" src="/assets/actions/previous.png" />
            </button>
            <button
              className={[
                "question-next-button",
                response?.isCorrect ? "answer-next-success" : "",
                response && !response.isCorrect ? "answer-next-error" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              onClick={onNext}
            >
              {isLastQuestion ? "عرض النتائج" : "التالي"}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
