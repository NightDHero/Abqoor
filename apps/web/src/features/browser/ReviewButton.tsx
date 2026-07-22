export function ReviewButton({
  isInReview,
  onAdd
}: {
  isInReview: boolean;
  onAdd: () => void;
}) {
  return (
    <button type="button" disabled={isInReview} onClick={onAdd}>
      {isInReview ? "مضاف للمراجعة" : "أضف للمراجعة"}
    </button>
  );
}
