import { useState } from "react";
import { ExamActionBar } from "./ExamActionBar";
import { ExamQuestionView } from "./ExamQuestionView";
import { ExamReferenceTopBar } from "./ExamReferenceTopBar";
import { ExamResultView } from "./ExamResultView";
import { ExamSidebar } from "./ExamSidebar";
import { SectionReviewPanel } from "./SectionReviewPanel";
import { useExamMode } from "./useExamMode";

export function ExamMode({ userEmail }: { userEmail?: string }) {
  const exam = useExamMode();
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  if (exam.result) {
    return (
      <section className="exam-reference-shell">
        <ExamReferenceTopBar />
        <main className="exam-result-wrap">
          <ExamResultView
            onStartNewExam={() => {
              void exam.startExam();
            }}
            result={exam.result}
          />
        </main>
      </section>
    );
  }

  if (exam.isLoadingSavedExam) {
    return (
      <section className="exam-reference-shell">
        <ExamReferenceTopBar />
        <p className="status-message">جاري تحميل الاختبار...</p>
      </section>
    );
  }

  if (!exam.exam || !exam.currentSection || !exam.currentQuestion) {
    return (
      <section className="exam-reference-shell">
        <ExamReferenceTopBar />
        <main className="exam-start-card" aria-labelledby="exam-start-title">
          <p className="page-eyebrow">وضع الاختبار</p>
          <h1 className="page-title" id="exam-start-title">
            محاكاة اختبار القدرات
          </h1>
          <p>
            يتكون الاختبار من 5 أقسام. كل قسم يحتوي على 12 سؤالًا كميًا و13
            سؤالًا لفظيًا، ولكل قسم مؤقت مستقل مدته 30 دقيقة.
          </p>

          {exam.error ? <p className="error-message">{exam.error}</p> : null}

          <div className="action-row">
            <button
              type="button"
              disabled={exam.isStarting}
              onClick={() => {
                void exam.startExam();
              }}
            >
              {exam.isStarting ? "جاري بدء الاختبار..." : "بدء الاختبار"}
            </button>
          </div>
        </main>
      </section>
    );
  }

  return (
    <section className="exam-reference-shell" aria-label="محاكاة اختبار القدرات">
      <ExamReferenceTopBar />

      {exam.exam.isTestMode ? (
        <div className="exam-test-mode-banner" role="status">
          {exam.exam.testModeMessage ??
            "وضع الاختبار التجريبي - سيتم استخدام أسئلة مؤقتة حتى اكتمال بنك الأسئلة"}
        </div>
      ) : null}

      {exam.error ? <p className="error-message">{exam.error}</p> : null}

      <div className="exam-reference-body">
        <ExamSidebar
          currentPosition={exam.currentQuestion.positionInSection}
          isCompleting={exam.isCompletingSection}
          onCompleteSection={() => setIsReviewOpen(true)}
          onJump={exam.jumpToQuestion}
          remainingSeconds={exam.remainingSeconds}
          section={exam.currentSection}
          userEmail={userEmail}
        />

        <main className="exam-reference-main">
          <ExamQuestionView
            onAnswer={(answer) => {
              void exam.answerQuestion(answer);
            }}
            question={exam.currentQuestion}
          />

          <ExamActionBar
            canGoNext={
              exam.currentIndex < exam.currentSection.questions.length - 1
            }
            canGoPrevious={exam.currentIndex > 0}
            isFlagged={exam.currentQuestion.flagged}
            onNext={exam.goToNext}
            onPrevious={exam.goToPrevious}
            onToggleFlag={() => {
              void exam.toggleFlag();
            }}
          />
        </main>
      </div>

      {isReviewOpen ? (
        <SectionReviewPanel
          currentPosition={exam.currentQuestion.positionInSection}
          isCompleting={exam.isCompletingSection}
          onClose={() => setIsReviewOpen(false)}
          onComplete={() => {
            void exam.completeSection().then(() => {
              setIsReviewOpen(false);
            });
          }}
          onJump={exam.jumpToQuestion}
          section={exam.currentSection}
        />
      ) : null}
    </section>
  );
}
