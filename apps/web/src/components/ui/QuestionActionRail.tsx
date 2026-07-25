export function QuestionActionRail({
  isSaved,
  onSave,
  onShare
}: {
  isSaved: boolean;
  onSave: () => void;
  onShare: () => void;
}) {
  return (
    <div className="question-action-rail" aria-label="إجراءات السؤال">
      <button
        aria-label={isSaved ? "السؤال محفوظ" : "حفظ السؤال"}
        className={isSaved ? "question-action saved" : "question-action"}
        type="button"
        onClick={() => {
          if (!isSaved) {
            onSave();
          }
        }}
      >
        <img alt="" src="/assets/actions/save.png" />
        <span>{isSaved ? "محفوظ" : "حفظ"}</span>
      </button>
      <button
        aria-label="مشاركة السؤال"
        className="question-action"
        type="button"
        onClick={onShare}
      >
        <img alt="" src="/assets/actions/share.png" />
        <span>مشاركة</span>
      </button>
    </div>
  );
}
