import type { CorrectAnswer, Question } from "../../types/question";
import { AnswerFeedback } from "../../components/ui/AnswerFeedback";
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

  return (
    <section className="solving-workspace browser-question-mode" aria-labelledby="browser-question-title">
      <header className="solving-workspace-toolbar">
        <div>
          <p className="question-progress">
            السؤال {currentIndex + 1} / {totalQuestions}
          </p>
          <h2 id="browser-question-title">
            {questionNumber ? `سؤال ${questionNumber}` : question.id}
          </h2>
          <span dir="ltr">{question.id}</span>
        </div>
        <ReviewButton isInReview={isInReview} onAdd={onAddReview} />
      </header>

      <div className="solving-workspace-grid">
        <figure className="solving-question-stage">
          <img
            alt={`Question ${question.id}`}
            className="question-image"
            src={toMediaSrc(question.questionImageUrl)}
          />
        </figure>

        <aside className="solving-answer-dock">
          <div className="answer-options" role="group" aria-label="خيارات الإجابة">
            {answers.map((answer) => {
              const answerImageUrl = getAnswerImageUrl(question, answer);
              const isSelected = selectedAnswer === answer;
              const answerLabel = toArabicAnswerLabel(answer);

              return (
                <button
                  aria-pressed={isSelected}
                  className={[
                    "answer-option",
                    isSelected ? "selected" : "",
                    isAnswered && answer === question.correctAnswer ? "answer-correct" : "",
                    isAnswered && isSelected && answer !== question.correctAnswer
                      ? "answer-wrong"
                      : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={isAnswered}
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
            <AnswerFeedback
              correctAnswer={question.correctAnswer}
              isCorrect={isCorrect}
              userAnswer={selectedAnswer!}
            />
          ) : null}

          <div className="browser-navigation-row">
            <button
              aria-label="السؤال السابق"
              className="question-previous-button"
              type="button"
              disabled={currentIndex === 0}
              onClick={onPrevious}
            >
              <img alt="" src="/assets/navigation/previous.png" />
            </button>
            <button
              className={[
                "question-next-button",
                isAnswered && isCorrect ? "answer-next-success" : "",
                isAnswered && !isCorrect ? "answer-next-error" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              disabled={currentIndex >= totalQuestions - 1}
              onClick={onNext}
            >
              التالي
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
