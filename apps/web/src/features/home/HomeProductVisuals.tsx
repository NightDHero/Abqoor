import { Fragment, useState, type CSSProperties } from "react";
import { env } from "../../config/env";
import { SystemIcon } from "../../components/ui/SystemIcon";
import type { CorrectAnswer, SessionQuestion } from "../../types/session";
import { CareerTopicIcon } from "../career/CareerTopicIcon";
import { arabicTopics, mathTopics } from "../career/careerData";
import { StudyQuestion } from "../study/StudyQuestion";
import { navigateTo } from "../../utils/router";
import { homeContent } from "./homeContent";
import {
  analogyQuestions,
  oddWordQuestions,
  sentenceCompletionQuestions,
  type AnalogyQuestion,
  type FloatingQuestionPlacement,
  type HomeQuestion,
  type OddWordQuestion,
  type SentenceCompletionQuestion
} from "./homeQuestionData";

const toQuestionImage = (questionId: string) =>
  `${env.apiUrl}/question-images/${questionId}.png`;

const demoAnswerOptions = [
  { id: "A", label: "أ" },
  { id: "B", label: "ب" },
  { id: "C", label: "ج" },
  { id: "D", label: "د" }
] as const;

const miniExamQuestions = Array.from({ length: 16 }, (_, index) => ({
  id: `Q-${String(index + 1).padStart(3, "0")}`,
  subject: index % 2 === 0 ? "الكمي" : "اللفظي"
}));

const adaptiveSignals = [
  { label: "خطأ سابق", tone: "mistake" },
  { label: "تثبيت", tone: "reinforce" },
  { label: "نقطة ضعف", tone: "focus" },
  { label: "تثبيت", tone: "reinforce" },
  { label: "خطأ سابق", tone: "mistake" },
  { label: "نقطة ضعف", tone: "focus" },
  { label: "تثبيت", tone: "reinforce" },
  { label: "تثبيت", tone: "reinforce" },
  { label: "نقطة ضعف", tone: "focus" },
  { label: "تثبيت", tone: "reinforce" }
] as const;

const lockedExamSteps = Array.from({ length: 5 }, (_, index) => ({
  index,
  number: (index + 1).toLocaleString("ar-SA")
}));

const mockExamPreviewQuestion: SessionQuestion = {
  difficulty: 3,
  id: "Q-034",
  questionImageUrl: "/question-images/Q-034.png",
  subject: "الكمي",
  subjectId: "math",
  topic: "اختبار محاكي"
};

const ignorePreviewAction = () => {};
const ignorePreviewAnswer = (_answer: CorrectAnswer) => {};

function SentenceCompletionVisual({
  question
}: {
  question: SentenceCompletionQuestion;
}) {
  return (
    <p className="home-sentence-question">
      {question.parts.map((part, index) => (
        <Fragment key={`${question.id}-${index}`}>
          <span>{part}</span>
          {index < question.answers.length ? (
            <span className="home-answer-gap">
              <span>{question.answers[index]}</span>
            </span>
          ) : null}
        </Fragment>
      ))}
    </p>
  );
}

function AnalogyVisual({ question }: { question: AnalogyQuestion }) {
  return (
    <div className="home-analogy-question">
      <strong>{question.prompt}</strong>
      <span aria-hidden="true" />
      <strong>{question.answer}</strong>
    </div>
  );
}

function OddWordVisual({ question }: { question: OddWordQuestion }) {
  const [before = "", after = ""] = question.sentence.split(
    question.incorrectWord
  );

  return (
    <p className="home-odd-word-question">
      {before}
      <mark>{question.incorrectWord}</mark>
      {after}
    </p>
  );
}

export function HomeQuestionCard({
  question
}: {
  question: HomeQuestion;
}) {
  return (
    <article className={`home-live-question home-live-question-${question.type}`}>
      <span className="home-question-category">{question.category}</span>
      {question.type === "sentence-completion" ? (
        <SentenceCompletionVisual question={question} />
      ) : null}
      {question.type === "verbal-analogy" ? (
        <AnalogyVisual question={question} />
      ) : null}
      {question.type === "odd-word" ? (
        <OddWordVisual question={question} />
      ) : null}
    </article>
  );
}

export function FloatingQuestionField({
  className = "",
  placements
}: {
  className?: string;
  placements: FloatingQuestionPlacement[];
}) {
  return (
    <div
      aria-hidden="true"
      className={`home-floating-field ${className}`.trim()}
    >
      {placements.map((placement) => (
        <div
          className={`home-floating-question depth-${placement.depth}`}
          key={placement.question.id}
          style={
            {
              "--question-delay": placement.delay,
              "--question-duration": placement.duration,
              "--question-rotation": placement.rotation,
              "--question-width": placement.width,
              "--question-x": placement.x,
              "--question-y": placement.y
            } as CSSProperties
          }
        >
          <HomeQuestionCard question={placement.question} />
        </div>
      ))}
    </div>
  );
}

export function HomepageMiniExamDemo() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({
    0: "B",
    2: "A",
    4: "D"
  });
  const currentQuestion = miniExamQuestions[currentIndex];
  const selectedAnswer = answers[currentIndex];
  const progressPercent =
    ((currentIndex + 1) / miniExamQuestions.length) * 100;

  const goToQuestion = (index: number) => {
    setCurrentIndex(Math.min(Math.max(index, 0), miniExamQuestions.length - 1));
  };

  return (
    <section className="home-mini-exam" aria-label="كيف شكل واجهة الاختبار الحقيقي">
      <aside className="home-mini-exam-sidebar">
        <div className="home-mini-exam-brand">
          <img alt="" src={homeContent.logoPath} />
          <span>عبقور</span>
        </div>
        <div className="home-mini-exam-position">
          <span>رقم السؤال</span>
          <strong>{(currentIndex + 1).toLocaleString("ar-SA")}</strong>
        </div>
        <div className="home-mini-exam-grid" aria-label="أسئلة العرض">
          {miniExamQuestions.map((question, index) => {
            const isCurrent = index === currentIndex;
            const isAnswered = Boolean(answers[index]);

            return (
              <button
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`السؤال ${(index + 1).toLocaleString("ar-SA")}`}
                className={[
                  "home-mini-exam-cell",
                  isCurrent ? "current" : "",
                  isAnswered ? "answered" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={question.id}
                type="button"
                onClick={() => goToQuestion(index)}
              >
                {(index + 1).toLocaleString("ar-SA")}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="home-mini-exam-main">
        <header className="home-mini-exam-topbar">
          <div>
            <span>{homeContent.program.learningItems[0]}</span>
            <strong>{currentQuestion.subject}</strong>
          </div>
          <time>٢٥:٠٠</time>
        </header>

        <div className="home-mini-exam-image-panel">
          <img
            alt={`Question ${currentQuestion.id}`}
            loading="lazy"
            src={toQuestionImage(currentQuestion.id)}
          />
        </div>

        <div className="home-mini-exam-options" role="group" aria-label="خيارات الإجابة">
          {demoAnswerOptions.map((answer) => (
            <button
              aria-pressed={selectedAnswer === answer.id}
              className={
                selectedAnswer === answer.id
                  ? "home-mini-exam-option selected"
                  : "home-mini-exam-option"
              }
              key={answer.id}
              type="button"
              onClick={() =>
                setAnswers((currentAnswers) => ({
                  ...currentAnswers,
                  [currentIndex]: answer.id
                }))
              }
            >
              <span>{answer.label}</span>
            </button>
          ))}
        </div>

        <footer className="home-mini-exam-actions">
          <button
            className="home-mini-exam-previous"
            disabled={currentIndex === 0}
            type="button"
            onClick={() => goToQuestion(currentIndex - 1)}
          >
            السابق
          </button>
          <div className="home-mini-exam-progress" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <button
            className="home-mini-exam-next"
            disabled={currentIndex === miniExamQuestions.length - 1}
            type="button"
            onClick={() => goToQuestion(currentIndex + 1)}
          >
            حفظ والتالي
          </button>
        </footer>
      </div>
    </section>
  );
}

export function HomeBrowserShowcase() {
  return (
    <div className="home-browser-showcase" aria-label="الكتابين الكمي واللفظي">
      <section className="home-browser-world home-browser-world-math">
        <header>
          <h3>الكمي</h3>
        </header>
        <div className="home-browser-topic-grid">
          {mathTopics.map((topic, index) => (
            <a
              className="home-browser-topic"
              href={topic.route}
              key={topic.id}
              onClick={(event) => {
                event.preventDefault();
                navigateTo(topic.route);
              }}
              style={{ "--topic-index": index } as CSSProperties}
            >
              <CareerTopicIcon subject="math" topicSlug={topic.routeSlug} />
              <span>{topic.name}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="home-browser-world home-browser-world-verbal">
        <header>
          <h3>اللفظي</h3>
        </header>
        <div className="home-browser-topic-grid">
          {arabicTopics.map((topic, index) => (
            <a
              className="home-browser-topic"
              href={topic.practiceRoute}
              key={topic.id}
              onClick={(event) => {
                event.preventDefault();
                navigateTo(topic.practiceRoute);
              }}
              style={{ "--topic-index": index } as CSSProperties}
            >
              <CareerTopicIcon subject="arabic" topicSlug={topic.routeSlug} />
              <span>{topic.name}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

export function HomeAdaptiveShowcase() {
  return (
    <div className="home-adaptive-showcase" aria-label="سَائِل">
      <div className="home-adaptive-core">
        <h3>سَائِل</h3>
        <p>{homeContent.systems.adaptive}</p>
      </div>
      <ol className="home-adaptive-path">
        {adaptiveSignals.map((signal, index) => (
          <li
            className={`home-adaptive-node home-adaptive-node-${signal.tone}`}
            key={`${signal.label}-${index}`}
            style={{ "--node-index": index } as CSSProperties}
          >
            <span>{(index + 1).toLocaleString("ar-SA")}</span>
            <small>{signal.label}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function HomeMockExamShowcase() {
  return (
    <div className="home-mock-exam" aria-label={homeContent.systems.mockExam}>
      <header>
        <div>
          <h3>اختبار محاكي</h3>
          <p>{homeContent.systems.mockExam}</p>
        </div>
        <time>٢٥:٠٠</time>
      </header>
      <div className="home-mock-exam-preview-shell product-app-shell" aria-hidden="true">
        <div className="home-mock-exam-preview-scale">
          <StudyQuestion
            currentIndex={12}
            isInReview={false}
            isLastQuestion={false}
            isSavingReview={false}
            isSubmitting={false}
            onAnswer={ignorePreviewAnswer}
            onNext={ignorePreviewAction}
            onPrevious={ignorePreviewAction}
            onSaveReview={ignorePreviewAction}
            question={mockExamPreviewQuestion}
            totalQuestions={15}
          />
        </div>
      </div>
    </div>
  );
}

export function HomeAdviceUnlockVisual() {
  return (
    <div className="home-advice-unlock" aria-hidden="true">
      <div className="home-advice-exams">
        {lockedExamSteps.map((exam) => (
          <span
            key={exam.index}
            style={{ "--exam-index": exam.index } as CSSProperties}
          >
            <b>{exam.number}</b>
            <SystemIcon className="home-advice-lock-icon" name="lock" />
          </span>
        ))}
      </div>
      <div className="home-advice-assistant">
        <i />
        <strong>سَائِل</strong>
      </div>
    </div>
  );
}

export const showcaseQuestions = {
  analogy: analogyQuestions[3],
  oddWord: oddWordQuestions[3],
  sentence: sentenceCompletionQuestions[7]
};
