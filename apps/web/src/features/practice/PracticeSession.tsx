import type { CareerWorld, SubtopicPillar, TopicPillar } from "../career/career.types";
import { FeedbackPanel } from "./FeedbackPanel";
import { PracticeResult } from "./PracticeResult";
import { QuestionCard } from "./QuestionCard";
import { QuestionProgress } from "./QuestionProgress";
import { usePracticeSession } from "./usePracticeSession";

export function PracticeSession({
  subtopic,
  topic,
  world
}: {
  subtopic?: SubtopicPillar;
  topic: TopicPillar;
  world: CareerWorld;
}) {
  const practice = usePracticeSession();

  if (practice.result) {
    return <PracticeResult result={practice.result} />;
  }

  return (
    <section className="practice-session" aria-labelledby="practice-title">
      <div className="practice-panel">
        <p className="page-eyebrow">{world.label}</p>
        <h1 className="page-title" id="practice-title">
          {subtopic ? subtopic.name : topic.name}
        </h1>
        <p className="page-description">
          جلسة تدريب من 10 أسئلة. الأسئلة غير مؤقتة، وتظهر التغذية الراجعة بعد
          تأكيد كل إجابة.
        </p>
      </div>

      {!practice.isActive ? (
        <div className="practice-panel">
          <button
            type="button"
            disabled={practice.isStarting}
            onClick={() => void practice.start()}
          >
            {practice.isStarting ? "جاري بدء الجلسة..." : "ابدأ جلسة التدريب"}
          </button>
        </div>
      ) : null}

      {practice.error ? <p className="error-message">{practice.error}</p> : null}

      {practice.isActive && practice.currentQuestion ? (
        <div className="practice-panel">
          <QuestionProgress
            currentIndex={practice.currentIndex}
            totalQuestions={practice.questions.length}
          />

          <QuestionCard
            disabled={Boolean(practice.feedback) || practice.isSubmitting}
            feedback={practice.feedback}
            onSelectAnswer={practice.selectAnswer}
            question={practice.currentQuestion}
            selectedAnswer={practice.selectedAnswer}
          />

          {practice.feedback ? (
            <FeedbackPanel feedback={practice.feedback} />
          ) : null}

          <div className="practice-actions">
            {!practice.feedback ? (
              <button
                type="button"
                disabled={!practice.selectedAnswer || practice.isSubmitting}
                onClick={() => void practice.submit()}
              >
                {practice.isSubmitting ? "جاري التأكيد..." : "تأكيد الإجابة"}
              </button>
            ) : (
              <button
                type="button"
                disabled={practice.isLoadingResult}
                onClick={() => void practice.goToNext()}
              >
                {practice.isLastQuestion ? "عرض النتيجة" : "السؤال التالي"}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
