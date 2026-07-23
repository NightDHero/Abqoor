import type {
  CorrectAnswer,
  SessionQuestion,
  SubmitAnswerResponse
} from "../../types/session";
import { AnswerFeedback } from "../../components/ui/AnswerFeedback";
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
    <section className="study-question" aria-labelledby="study-question-title">
      <div className="study-question-heading">
        <div>
          <p className="question-progress">
            السؤال {currentIndex + 1} / {totalQuestions}
          </p>
          <h2 id="study-question-title" dir="ltr">
            {question.id}
          </h2>
          <span>الموضوع: {question.topic}</span>
        </div>
        <button
          type="button"
          disabled={isInReview || isSavingReview}
          onClick={onSaveReview}
        >
          {isInReview ? "مضاف للمراجعة" : "أضف للمراجعة"}
        </button>
      </div>

      <img
        alt={`Question ${question.id}`}
        className="question-image"
        src={toStudyImageSrc(question.questionImageUrl)}
      />

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
            </button>
          );
        })}
      </div>

      {response ? (
        <AnswerFeedback
          correctAnswer={response.correctAnswer}
          isCorrect={response.isCorrect}
          userAnswer={response.userAnswer}
        />
      ) : (
        <p className="status-message">يمكنك الإجابة الآن أو تخطي السؤال والعودة لاحقًا.</p>
      )}

      <div className="browser-navigation-row">
        <button type="button" disabled={currentIndex === 0} onClick={onPrevious}>
          السابق
        </button>
        <button type="button" onClick={onNext}>
          {isLastQuestion ? "عرض النتائج" : "التالي"}
        </button>
      </div>
    </section>
  );
}
