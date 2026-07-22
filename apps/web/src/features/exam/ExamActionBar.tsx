export function ExamActionBar({
  canGoNext,
  canGoPrevious,
  isFlagged,
  onNext,
  onPrevious,
  onToggleFlag
}: {
  canGoNext: boolean;
  canGoPrevious: boolean;
  isFlagged: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onToggleFlag: () => void;
}) {
  return (
    <footer className="exam-reference-actions">
      <button type="button" disabled={!canGoPrevious} onClick={onPrevious}>
        السابق
      </button>
      <label className="exam-review-checkbox">
        <input
          checked={isFlagged}
          type="checkbox"
          onChange={onToggleFlag}
        />
        <span>تمييز السؤال للمراجعة</span>
      </label>
      <button type="button" disabled={!canGoNext} onClick={onNext}>
        حفظ والتالي
      </button>
    </footer>
  );
}
