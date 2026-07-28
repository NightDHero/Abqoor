import {
  Fragment,
  type CSSProperties
} from "react";
import { env } from "../../config/env";
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
    <article
      className={`home-live-question home-live-question-${question.type}`}
    >
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

export function QuestionImageStage({
  label,
  questionId = "Q-001"
}: {
  label: string;
  questionId?: string;
}) {
  return (
    <figure className="home-question-image-stage">
      <figcaption>
        <span>من موسوعة عبقور</span>
        <strong>{label}</strong>
      </figcaption>
      <img
        alt={`معاينة سؤال قدرات: ${label}`}
        loading="lazy"
        src={toQuestionImage(questionId)}
      />
    </figure>
  );
}

const mathTopics = [
  "الحساب",
  "الجبر",
  "الهندسة",
  "الإحصاء والاحتمالات"
];

const verbalTopics = [
  "التناظر اللفظي",
  "إكمال الجمل",
  "الخطأ السياقي",
  "استيعاب المقروء"
];

export function TopicPathVisual() {
  return (
    <div className="home-topic-world" aria-label="رحلة داخل موسوعة الأسئلة">
      <div className="home-topic-rail home-topic-rail-math">
        <strong>الكمي</strong>
        {mathTopics.map((topic, index) => (
          <span className={index === 1 ? "active" : ""} key={topic}>
            {topic}
          </span>
        ))}
      </div>

      <div className="home-topic-route" aria-hidden="true">
        <span>الكمي</span>
        <i />
        <span>الجبر</span>
        <i />
        <span>المعادلات والمتباينات</span>
      </div>

      <QuestionImageStage
        label="الجبر · المعادلات والمتباينات"
        questionId="Q-002"
      />

      <div className="home-topic-rail home-topic-rail-verbal">
        <strong>اللفظي</strong>
        {verbalTopics.map((topic) => (
          <span key={topic}>{topic}</span>
        ))}
      </div>
    </div>
  );
}

const sessionSequence = [
  "خطأ سابق",
  "تثبيت",
  "تثبيت",
  "نقطة ضعف",
  "تثبيت",
  "خطأ سابق",
  "نقطة ضعف",
  "تثبيت",
  "تثبيت",
  "نقطة ضعف",
  "خطأ سابق",
  "تثبيت",
  "نقطة ضعف",
  "تثبيت",
  "تثبيت"
] as const;

export function AdaptiveSessionVisual() {
  return (
    <div
      className="home-adaptive-session"
      aria-label="حصة عبقور من خمسة عشر سؤالًا مختارًا"
    >
      <div className="home-session-core">
        <span>حصة عبقور</span>
        <strong>١٥ سؤال</strong>
        <p>اختيار مقصود من مستواك وإجاباتك السابقة.</p>
      </div>

      <ol className="home-session-path">
        {sessionSequence.map((label, index) => {
          const kind =
            label === "خطأ سابق"
              ? "mistake"
              : label === "نقطة ضعف"
                ? "focus"
                : "reinforce";

          return (
            <li
              className={`home-session-node home-session-node-${kind}`}
              key={`${label}-${index}`}
              style={{ "--node-index": index } as CSSProperties}
            >
              <span>{index + 1}</span>
              <small>{label}</small>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function MockExamJourneyVisual() {
  return (
    <div className="home-mock-exam" aria-label="معاينة الاختبار المحاكي">
      <header>
        <div>
          <span>القسم ٢ من ٥</span>
          <strong>اختبار محاكي</strong>
        </div>
        <time>٢٥:٠٠</time>
      </header>
      <div className="home-mock-exam-question">
        <img
          alt="معاينة سؤال داخل الاختبار المحاكي"
          loading="lazy"
          src={toQuestionImage("Q-003")}
        />
        <div aria-label="خيارات الإجابة">
          {["أ", "ب", "ج", "د"].map((answer) => (
            <span key={answer}>{answer}</span>
          ))}
        </div>
      </div>
      <footer>
        <span>١٢ كمي</span>
        <i />
        <span>١٣ لفظي</span>
      </footer>
    </div>
  );
}

const focusSignals = [
  ["الجبر", "يحتاج تركيز", "34%"],
  ["الهندسة", "تحت المراجعة", "56%"],
  ["التناظر اللفظي", "ثابت", "82%"],
  ["إكمال الجمل", "يحتاج تثبيت", "61%"]
] as const;

export function FocusMapVisual() {
  return (
    <div className="home-focus-map" aria-label="خريطة محاور التركيز">
      <div className="home-focus-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <header>
        <span>صورتك أوضح</span>
        <strong>وين تركز الجلسة الجاية؟</strong>
      </header>
      <div className="home-focus-signals">
        {focusSignals.map(([topic, label, strength]) => (
          <div className="home-focus-signal" key={topic}>
            <span>{topic}</span>
            <i style={{ "--focus-strength": strength } as CSSProperties}>
              <span />
            </i>
            <small>{label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuickExplanationVisual() {
  return (
    <div className="home-quick-explanation" aria-label="معاينة شرح مختصر">
      <div className="home-explanation-question">
        <HomeQuestionCard question={sentenceCompletionQuestions[9]} />
      </div>
      <div className="home-explanation-note">
        <span>الفكرة بسرعة</span>
        <strong>رتّب المعطيات، ثم قارن المطلوب بخطوة واحدة.</strong>
        <p>شرح صغير وقت الحاجة، من غير ما يقطع عليك الحل.</p>
      </div>
    </div>
  );
}

export const showcaseQuestions = {
  analogy: analogyQuestions[3],
  oddWord: oddWordQuestions[3],
  sentence: sentenceCompletionQuestions[7]
};
