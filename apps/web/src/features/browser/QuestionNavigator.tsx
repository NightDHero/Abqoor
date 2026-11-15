import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent
} from "react";
import { QuestionPosition } from "../../components/ui/QuestionPosition";
import type { Question } from "../../types/question";
const toArabicNumber = (value: number) => value.toLocaleString("ar-SA");

export function QuestionNavigator({
  currentIndex,
  currentQuestionId,
  onOpenQuestion,
  questions
}: {
  currentIndex: number;
  currentQuestionId?: string;
  onOpenQuestion: (questionId: string) => void;
  questions: Question[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(currentIndex);
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setFocusedIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    optionRefs.current[currentIndex]?.scrollIntoView({ block: "nearest" });

    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [currentIndex, isOpen]);

  const focusOption = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), questions.length - 1);
    setFocusedIndex(nextIndex);
    window.requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  };

  const closeAndRestoreFocus = () => {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const selectQuestion = (index: number) => {
    const question = questions[index];
    if (!question) return;
    onOpenQuestion(question.id);
    closeAndRestoreFocus();
  };

  const handleListboxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndRestoreFocus();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
      event.preventDefault();
      focusOption(focusedIndex + 1);
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowRight") {
      event.preventDefault();
      focusOption(focusedIndex - 1);
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusOption(event.key === "Home" ? 0 : questions.length - 1);
    }
  };

  return (
    <div
      aria-label="الانتقال بين الأسئلة"
      className="question-finder"
      dir="rtl"
      ref={rootRef}
    >
      <div className="question-finder-control">
        <button
          aria-label={`السؤال ${toArabicNumber(currentIndex + 1)} من ${toArabicNumber(questions.length)}، فتح قائمة الأسئلة`}
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className="question-finder-trigger"
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setIsOpen(true);
              focusOption(currentIndex);
            }
          }}
        >
          <QuestionPosition
            ariaHidden
            currentIndex={currentIndex}
            totalQuestions={questions.length}
          />
          <span aria-hidden="true" className="question-finder-chevron" />
        </button>

        {isOpen ? (
          <div
            aria-label="قائمة الأسئلة"
            className="question-finder-menu"
            id={listboxId}
            role="listbox"
            onKeyDown={handleListboxKeyDown}
          >
            {questions.map((question, index) => {
              const isSelected = question.id === currentQuestionId;

              return (
                <button
                  aria-selected={isSelected}
                  className={isSelected ? "selected" : undefined}
                  key={question.id}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  role="option"
                  tabIndex={index === focusedIndex ? 0 : -1}
                  type="button"
                  onClick={() => selectQuestion(index)}
                  onFocus={() => setFocusedIndex(index)}
                  onPointerEnter={() => setFocusedIndex(index)}
                >
                  <span>السؤال {toArabicNumber(index + 1)}</span>
                  {isSelected ? <span aria-hidden="true">✓</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
