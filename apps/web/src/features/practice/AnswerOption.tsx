import type { CorrectAnswer } from "../../types/session";
import { toArabicAnswerLabel } from "../../utils/answerLabels";

export function AnswerOption({
  answer,
  disabled,
  isCorrect,
  isSelected,
  isWrong,
  onSelect
}: {
  answer: CorrectAnswer;
  disabled: boolean;
  isCorrect: boolean;
  isSelected: boolean;
  isWrong: boolean;
  onSelect: (answer: CorrectAnswer) => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={[
        "answer-option",
        isSelected ? "selected" : "",
        isCorrect ? "answer-correct" : "",
        isWrong ? "answer-wrong" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
      type="button"
      onClick={() => onSelect(answer)}
    >
      {toArabicAnswerLabel(answer)}
    </button>
  );
}
