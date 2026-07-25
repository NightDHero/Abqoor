import { StudyQuestion } from "./StudyQuestion";
import { StudyResult } from "./StudyResult";
import { useStudySession } from "./useStudySession";

export function StudyMode() {
  const study = useStudySession();

  if (study.result) {
    return (
      <StudyResult
        onStartNextSession={() => {
          void study.start();
        }}
        result={study.result}
        weakTopics={study.weakTopics}
      />
    );
  }

  return (
    <section className="study-mode" aria-labelledby="study-title">
      {!study.isActive ? (
        <div className="study-launch">
          <div>
            <p className="page-eyebrow">حصة</p>
            <h1 className="page-title" id="study-title">
              ابدأ من حيث تحتاج
            </h1>
          </div>
          <div className="action-row">
            <button
              type="button"
              disabled={study.isStarting}
              onClick={() => {
                void study.start();
              }}
            >
              {study.isStarting ? "جاري البدء..." : "ابدأ الحصة"}
            </button>
          </div>
        </div>
      ) : null}

      {study.error ? <p className="error-message">{study.error}</p> : null}

      {study.isActive && study.currentQuestion ? (
        <StudyQuestion
          currentIndex={study.currentIndex}
          isInReview={study.isCurrentQuestionInManualReview}
          isLastQuestion={study.isLastQuestion}
          isSavingReview={study.isSavingReview}
          isSubmitting={study.isSubmitting}
          onAnswer={(answer) => {
            void study.answerQuestion(answer);
          }}
          onNext={() => {
            void study.goToNext();
          }}
          onPrevious={study.goToPrevious}
          onSaveReview={() => {
            void study.saveCurrentQuestion();
          }}
          question={study.currentQuestion}
          response={study.currentResponse}
          totalQuestions={study.questions.length}
        />
      ) : null}

      {study.isLoadingResult ? (
        <p className="status-message">جاري تحميل النتيجة...</p>
      ) : null}
    </section>
  );
}
