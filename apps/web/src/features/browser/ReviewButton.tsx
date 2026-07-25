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
      {isInReview ? "محفوظ" : "حفظ للمراجعة"}
    </button>
  );
}
