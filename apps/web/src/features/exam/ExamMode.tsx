import { useEffect, useRef, useState } from "react";
import { ExamActionBar } from "./ExamActionBar";
import { ExamQuestionView } from "./ExamQuestionView";
import { ExamReferenceTopBar } from "./ExamReferenceTopBar";
import { ExamResultView } from "./ExamResultView";
import { ExamSidebar } from "./ExamSidebar";
import { SectionReviewPanel } from "./SectionReviewPanel";
import { useExamMode } from "./useExamMode";

export function ExamMode({
  autoStart = false,
  onAutoStartConsumed,
  onExit,
  userEmail
}: {
  autoStart?: boolean;
  onAutoStartConsumed?: () => void;
  onExit: () => void;
  userEmail?: string;
}) {
  const exam = useExamMode();
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isExitConfirmationOpen, setIsExitConfirmationOpen] = useState(false);
  const autoStartHandledRef = useRef(false);

  useEffect(() => {
    if (
      !autoStart ||
      autoStartHandledRef.current ||
      exam.isLoadingSavedExam ||
      exam.exam ||
      exam.result
    ) {
      return;
    }

    autoStartHandledRef.current = true;
    void exam.startExam().finally(() => {
      onAutoStartConsumed?.();
    });
  }, [
    autoStart,
    exam.exam,
    exam.isLoadingSavedExam,
    exam.result,
    onAutoStartConsumed
  ]);

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
    <section
      className="exam-reference-shell exam-reference-shell-entering"
      aria-label="محاكاة اختبار القدرات"
    >
      <ExamReferenceTopBar />

      <button
        className="exam-exit-button"
        type="button"
        onClick={() => setIsExitConfirmationOpen(true)}
      >
        إنهاء الاختبار
      </button>

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

      {isExitConfirmationOpen ? (
        <div className="exam-exit-overlay" role="dialog" aria-modal="true">
          <section className="exam-exit-dialog" aria-labelledby="exam-exit-title">
            <h2 id="exam-exit-title">إنهاء الاختبار</h2>
            <p>سيتم إنهاء الاختبار الحالي.</p>
            <p>لن يؤثر ذلك على مستوى مهاراتك أو تقدمك.</p>
            <p>هل أنت متأكد من رغبتك في الخروج؟</p>
            <div className="exam-exit-actions">
              <button
                className="secondary"
                type="button"
                onClick={() => setIsExitConfirmationOpen(false)}
              >
                العودة للاختبار
              </button>
              <button
                className="danger"
                type="button"
                onClick={() => {
                  exam.exitExam();
                  setIsExitConfirmationOpen(false);
                  onExit();
                }}
              >
                إنهاء الاختبار
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
