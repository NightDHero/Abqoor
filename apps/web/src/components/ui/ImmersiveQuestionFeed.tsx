import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type TouchEvent,
  type WheelEvent
} from "react";
import type { CorrectAnswer } from "../../types/question";
import { toArabicAnswerLabel } from "../../utils/answerLabels";
import { QuestionActionRail } from "./QuestionActionRail";

const answers: CorrectAnswer[] = ["A", "B", "C", "D"];
const gestureCooldownMs = 520;
const minWheelDistance = 36;
const minTouchDistance = 48;

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
  const gestureTimeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeIndexRef = useRef(activeIndex);
  const [slideHeight, setSlideHeight] = useState(0);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    document.body.classList.add("immersive-question-active");

    return () => {
      document.body.classList.remove("immersive-question-active");
    };
  }, []);

  useLayoutEffect(() => {
    const measureSlide = () => {
      const feed = feedRef.current;

      if (!feed) {
        return;
      }

      setSlideHeight(feed.clientHeight || window.innerHeight);
    };

    measureSlide();
    window.addEventListener("resize", measureSlide);
    window.addEventListener("orientationchange", measureSlide);

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measureSlide);

    if (feedRef.current) {
      resizeObserver?.observe(feedRef.current);
    }

    return () => {
      window.removeEventListener("resize", measureSlide);
      window.removeEventListener("orientationchange", measureSlide);
      resizeObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (gestureTimeoutRef.current !== null) {
        window.clearTimeout(gestureTimeoutRef.current);
      }
    };
  }, []);

  const moveToQuestion = (index: number) => {
    if (questions.length === 0 || !canAcceptGesture()) {
      return;
    }

    const nextIndex = Math.min(Math.max(index, 0), questions.length - 1);

    if (nextIndex === activeIndexRef.current) {
      return;
    }

    onActiveIndexChange(nextIndex);
    activeIndexRef.current = nextIndex;

    if (gestureTimeoutRef.current !== null) {
      window.clearTimeout(gestureTimeoutRef.current);
    }

    gestureTimeoutRef.current = window.setTimeout(() => {
      gestureTimeoutRef.current = null;
    }, gestureCooldownMs);
  };

  const canAcceptGesture = () => gestureTimeoutRef.current === null;

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const absDeltaY = Math.abs(event.deltaY);

    if (absDeltaY < minWheelDistance || absDeltaY < Math.abs(event.deltaX)) {
      return;
    }

    event.preventDefault();

    if (!canAcceptGesture()) {
      return;
    }

    moveToQuestion(activeIndexRef.current + (event.deltaY > 0 ? 1 : -1));
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;

    if (!start || !touch || !canAcceptGesture()) {
      return;
    }

    const deltaY = start.y - touch.clientY;
    const deltaX = Math.abs(start.x - touch.clientX);

    if (Math.abs(deltaY) < minTouchDistance || Math.abs(deltaY) < deltaX * 1.1) {
      return;
    }

    moveToQuestion(activeIndexRef.current + (deltaY > 0 ? 1 : -1));
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
      aria-label="سحب الأسئلة"
      className={`immersive-question-feed immersive-question-feed-${variant}`}
      role="region"
      style={
        {
          "--immersive-slide-height": slideHeight
            ? `${slideHeight}px`
            : "100svh"
        } as CSSProperties
      }
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onWheel={handleWheel}
    >
      <div
        className="immersive-question-track"
        style={{
          transform: `translate3d(0, -${Math.max(activeIndex, 0) * slideHeight}px, 0)`
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
    </div>
  );
}
