import { useEffect, useState } from "react";
import { preloadQuestionWindow } from "../../utils/questionAssets";
import { ExamActionBar } from "./ExamActionBar";
import { ExamQuestionView } from "./ExamQuestionView";
import { ExamReferenceTopBar } from "./ExamReferenceTopBar";
import { ExamResultView } from "./ExamResultView";
import { ExamSidebar } from "./ExamSidebar";
import { SectionReviewPanel } from "./SectionReviewPanel";
import { toExamImageSrc } from "./examUtils";
import type { ExamModeState } from "./useExamMode";

export function ExamMode({
  exam,
  onExit,
  userEmail
}: {
  exam: ExamModeState;
  onExit: () => void;
  userEmail?: string;
}) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isExitConfirmationOpen, setIsExitConfirmationOpen] = useState(false);

  useEffect(() => {
    void preloadQuestionWindow(
      exam.currentSection?.questions ?? [],
      exam.currentIndex,
      toExamImageSrc,
      3
    );
  }, [exam.currentIndex, exam.currentSection?.questions]);

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

  if (!exam.exam || !exam.currentSection || !exam.currentQuestion) {
    return null;
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
        العودة إلى المركز
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
          structure={exam.exam.structure}
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
            <h2 id="exam-exit-title">العودة إلى المركز</h2>
            <p>سيبقى الاختبار محفوظًا ويمكنك العودة إليه من صفحة الاختبار.</p>
            <p>وقت القسم مستمر ولا يتوقف عند مغادرة الصفحة.</p>
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
                  setIsExitConfirmationOpen(false);
                  onExit();
                }}
              >
                العودة إلى المركز
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
