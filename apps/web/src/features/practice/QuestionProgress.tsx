export function QuestionProgress({
  currentIndex,
  totalQuestions
}: {
  currentIndex: number;
  totalQuestions: number;
}) {
  return (
    <p className="question-progress">
      السؤال {currentIndex + 1} / {totalQuestions}
    </p>
  );
}
