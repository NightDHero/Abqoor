import { env } from "../../config/env";
import type { CorrectAnswer, SessionQuestion } from "../../types/session";
import { AnswerOption } from "./AnswerOption";

const answers: CorrectAnswer[] = ["A", "B", "C", "D"];

const toImageSrc = (questionImageUrl: string) =>
  questionImageUrl.startsWith("http")
    ? questionImageUrl
    : `${env.apiUrl}${questionImageUrl}`;

export function QuestionCard({
  disabled,
  onSelectAnswer,
  question,
  selectedAnswer
}: {
  disabled: boolean;
  onSelectAnswer: (answer: CorrectAnswer) => void;
  question: SessionQuestion;
  selectedAnswer: CorrectAnswer | null;
}) {
  return (
    <section className="question-card" aria-labelledby="practice-question-id">
      <div className="question-card-heading">
        <h2 id="practice-question-id">{question.id}</h2>
        <span>الصعوبة: {question.difficultyScore ?? question.difficulty}</span>
      </div>

      <img
        alt={`Question ${question.id}`}
        className="question-image"
        src={toImageSrc(question.questionImageUrl)}
      />

      <div className="answer-options" role="group" aria-label="خيارات الإجابة">
        {answers.map((answer) => (
          <AnswerOption
            answer={answer}
            disabled={disabled}
            isSelected={selectedAnswer === answer}
            key={answer}
            onSelect={onSelectAnswer}
          />
        ))}
      </div>
    </section>
  );
}
