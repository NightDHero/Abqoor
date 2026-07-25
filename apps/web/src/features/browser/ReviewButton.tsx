export function ReviewButton({
  isInReview,
  onAdd
}: {
  isInReview: boolean;
  onAdd: () => void;
}) {
  return (
    <button
      className="review-toggle"
      type="button"
      disabled={isInReview}
      onClick={onAdd}
    >
      <img alt="" src="/assets/actions/save.png" />
      <span>{isInReview ? "محفوظ" : "حفظ"}</span>
    </button>
  );
}
