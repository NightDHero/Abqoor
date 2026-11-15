const toArabicNumber = (value: number) => value.toLocaleString("ar-SA");

export function QuestionPosition({
  ariaHidden = false,
  currentIndex,
  totalQuestions
}: {
  ariaHidden?: boolean;
  currentIndex: number;
  totalQuestions: number;
}) {
  const currentQuestion = currentIndex + 1;

  return (
    <div
      aria-hidden={ariaHidden || undefined}
      aria-label={ariaHidden
        ? undefined
        : `السؤال ${toArabicNumber(currentQuestion)} من ${toArabicNumber(totalQuestions)}`}
      className="question-position"
    >
      <span>السؤال</span>
      <strong>{toArabicNumber(currentQuestion)}</strong>
      <small>من {toArabicNumber(totalQuestions)}</small>
    </div>
  );
}
