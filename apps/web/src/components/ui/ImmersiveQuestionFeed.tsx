import {
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent
} from "react";
import type { CorrectAnswer } from "../../types/question";
import { toArabicAnswerLabel } from "../../utils/answerLabels";
import { QuestionActionRail } from "./QuestionActionRail";

const answers: CorrectAnswer[] = ["A", "B", "C", "D"];

export type ImmersiveQuestionItem = {
  id: string;
  questionImageUrl: string;
  answerImageUrls?: Partial<Record<CorrectAnswer, string>>;
};

export type ImmersiveAnswerState = {
  correctAnswer?: CorrectAnswer;
  isSubmitting?: boolean;
  selectedAnswer?: CorrectAnswer;
};

export function ImmersiveQuestionFeed({
  activeIndex,
  getAnswerState,
  getImageSrc,
  isSaved,
  onActiveIndexChange,
  onAnswer,
  onFinish,
  onSave,
  onShare,
  questions,
  variant = "mixed"
}: {
  activeIndex: number;
  getAnswerState: (questionId: string) => ImmersiveAnswerState;
  getImageSrc: (path: string) => string;
  isSaved: (questionId: string) => boolean;
  onActiveIndexChange: (index: number) => void;
  onAnswer: (questionId: string, answer: CorrectAnswer) => void;
  onFinish?: () => void;
  onSave: (questionId: string) => void;
  onShare: (questionId: string) => void;
  questions: ImmersiveQuestionItem[];
  variant?: "arabic" | "math" | "mixed";
}) {
  const feedRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const activeIndexRef = useRef(activeIndex);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    document.body.classList.add("immersive-question-active");

    return () => {
      document.body.classList.remove("immersive-question-active");
    };
  }, []);

  useEffect(() => {
    const alignActiveQuestion = () => {
      const feed = feedRef.current;

      if (feed) {
        feed.scrollTo({
          behavior: "auto",
          top: activeIndexRef.current * feed.clientHeight
        });
      }
    };

    window.addEventListener("resize", alignActiveQuestion);

    return () => {
      window.removeEventListener("resize", alignActiveQuestion);
    };
  }, []);

  useLayoutEffect(() => {
    const feed = feedRef.current;

    if (!feed || feed.clientHeight === 0) {
      return;
    }

    const targetTop = activeIndex * feed.clientHeight;

    if (Math.abs(feed.scrollTop - targetTop) > 2) {
      feed.scrollTo({ behavior: "instant", top: targetTop });
    }
  }, [activeIndex]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    },
    []
  );

  const moveToQuestion = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), questions.length - 1);
    const feed = feedRef.current;

    if (!feed || nextIndex === activeIndexRef.current) {
      return;
    }

    feed.scrollTo({
      behavior: "smooth",
      top: nextIndex * feed.clientHeight
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      moveToQuestion(activeIndexRef.current + 1);
    }

    if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      moveToQuestion(activeIndexRef.current - 1);
    }
  };

  return (
    <div
      ref={feedRef}
      aria-label="تدفق الأسئلة"
      className={`immersive-question-feed immersive-question-feed-${variant}`}
      role="region"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onScroll={() => {
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
        }

        frameRef.current = requestAnimationFrame(() => {
          const feed = feedRef.current;

          if (!feed || feed.clientHeight === 0) {
            return;
          }

          const nextIndex = Math.min(
            Math.max(Math.round(feed.scrollTop / feed.clientHeight), 0),
            questions.length - 1
          );

          if (nextIndex !== activeIndexRef.current) {
            activeIndexRef.current = nextIndex;
            onActiveIndexChange(nextIndex);
          }
        });
      }}
    >
      {questions.map((question, index) => {
        const answerState = getAnswerState(question.id);
        const isAnswered = Boolean(answerState.selectedAnswer);
        const isLastQuestion = index === questions.length - 1;

        return (
          <section
            aria-label={`السؤال ${index + 1} من ${questions.length}`}
            className="immersive-question-slide"
            data-question-id={question.id}
            key={question.id}
          >
            <div className="immersive-question-content">
              <header className="immersive-question-progress">
                <strong>{index + 1}</strong>
                <span>/ {questions.length}</span>
              </header>

              <figure className="immersive-question-visual">
                <img
                  alt={`Question ${question.id}`}
                  className="immersive-question-image"
                  loading={Math.abs(index - activeIndex) > 1 ? "lazy" : "eager"}
                  src={getImageSrc(question.questionImageUrl)}
                />
              </figure>

              <div className="immersive-answer-area">
                <div
                  className="immersive-answer-options"
                  role="group"
                  aria-label="خيارات الإجابة"
                >
                  {answers.map((answer) => {
                    const isSelected =
                      answerState.selectedAnswer === answer;
                    const isCorrect =
                      isAnswered && answerState.correctAnswer === answer;
                    const isWrong =
                      isAnswered &&
                      isSelected &&
                      answerState.correctAnswer !== answer;
                    const answerImageUrl = question.answerImageUrls?.[answer];

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={[
                          "immersive-answer-option",
                          isSelected ? "selected" : "",
                          isCorrect ? "answer-correct" : "",
                          isWrong ? "answer-wrong" : ""
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={
                          isAnswered || Boolean(answerState.isSubmitting)
                        }
                        key={answer}
                        type="button"
                        onClick={() => onAnswer(question.id, answer)}
                      >
                        <span>{toArabicAnswerLabel(answer)}</span>
                        {answerImageUrl ? (
                          <img
                            alt={`Answer ${toArabicAnswerLabel(answer)}`}
                            className="immersive-answer-image"
                            src={getImageSrc(answerImageUrl)}
                          />
                        ) : null}
                        {isCorrect ? (
                          <img
                            alt=""
                            className="immersive-answer-outcome"
                            src="/assets/feedback/check.png"
                          />
                        ) : null}
                        {isWrong ? (
                          <img
                            alt=""
                            className="immersive-answer-outcome"
                            src="/assets/feedback/wrong.png"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {isLastQuestion && onFinish ? (
                  <button
                    className="immersive-finish-button"
                    type="button"
                    onClick={onFinish}
                  >
                    عرض النتائج
                  </button>
                ) : null}
              </div>

              <QuestionActionRail
                isSaved={isSaved(question.id)}
                onSave={() => onSave(question.id)}
                onShare={() => onShare(question.id)}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
