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
  return (
    <label className="question-finder" aria-label="الانتقال بين الأسئلة">
      <span className="question-finder-current">
        السؤال
      </span>
      <select
        dir="rtl"
        value={currentQuestionId ?? ""}
        onChange={(event) => onOpenQuestion(event.target.value)}
      >
        {questions.map((question, index) => (
          <option key={question.id} value={question.id}>
            السؤال {toArabicNumber(index + 1)} / {toArabicNumber(questions.length)}
          </option>
        ))}
      </select>
    </label>
  );
}
