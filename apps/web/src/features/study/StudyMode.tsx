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
      <div className="study-panel">
        <p className="page-eyebrow">وضع الدراسة</p>
        <h1 className="page-title" id="study-title">
          جلسة دراسة تكيفية
        </h1>
        <p className="page-description">
          يختار النظام الأسئلة لك بناءً على سجل الإجابات السابق، والأخطاء،
          والأسئلة التي لم تتم الإجابة عنها.
        </p>
        {!study.isActive ? (
          <div className="action-row">
            <button
              type="button"
              disabled={study.isStarting}
              onClick={() => {
                void study.start();
              }}
            >
              {study.isStarting ? "جاري البدء..." : "ابدأ جلسة دراسة"}
            </button>
          </div>
        ) : null}
      </div>

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
        <p className="status-message">جاري تحميل نتيجة الجلسة...</p>
      ) : null}
    </section>
  );
}
