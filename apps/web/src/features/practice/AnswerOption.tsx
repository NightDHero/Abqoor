import type { CorrectAnswer } from "../../types/session";
import { toArabicAnswerLabel } from "../../utils/answerLabels";

export function AnswerOption({
  answer,
  disabled,
  isSelected,
  onSelect
}: {
  answer: CorrectAnswer;
  disabled: boolean;
  isSelected: boolean;
  onSelect: (answer: CorrectAnswer) => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={isSelected ? "answer-option selected" : "answer-option"}
      disabled={disabled}
      type="button"
      onClick={() => onSelect(answer)}
    >
      {toArabicAnswerLabel(answer)}
    </button>
  );
}
