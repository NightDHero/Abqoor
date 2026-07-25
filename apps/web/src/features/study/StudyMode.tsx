import { useState } from "react";
import { ImmersiveQuestionFeed } from "../../components/ui/ImmersiveQuestionFeed";
import { StudyQuestion } from "./StudyQuestion";
import { StudyResult } from "./StudyResult";
import { StudyWorldSelector } from "./StudyWorldSelector";
import { useStudySession } from "./useStudySession";
import { toStudyImageSrc } from "./studyUtils";

export function StudyMode() {
  const study = useStudySession();
  const [isImmersive, setIsImmersive] = useState(false);

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
        <StudyWorldSelector
          isStarting={study.isStarting}
          onSelect={() => {
            void study.start();
          }}
        />
      ) : null}

      {study.error ? <p className="error-message">{study.error}</p> : null}

      {study.isActive && study.currentQuestion ? (
        <>
          <div className="study-view-switch" aria-label="طريقة عرض الحصة">
            <button
              aria-pressed={!isImmersive}
              className={!isImmersive ? "selected" : undefined}
              type="button"
              onClick={() => setIsImmersive(false)}
            >
              عادي
            </button>
            <button
              aria-pressed={isImmersive}
              className={isImmersive ? "selected" : undefined}
              type="button"
              onClick={() => setIsImmersive(true)}
            >
              <img alt="" src="/assets/modes/immersive-scroll.png" />
              تدفق
            </button>
          </div>
          {isImmersive ? (
            <ImmersiveQuestionFeed
              activeIndex={study.currentIndex}
              getAnswerState={(questionId) => {
                const response = study.responsesByQuestionId[questionId];

                return {
                  correctAnswer: response?.correctAnswer,
                  isSubmitting: study.isSubmitting,
                  selectedAnswer: response?.userAnswer
                };
              }}
              getImageSrc={toStudyImageSrc}
              isSaved={(questionId) =>
                study.manualReviewQuestionIds.includes(questionId)
              }
              onActiveIndexChange={study.goToIndex}
              onAnswer={(questionId, answer) => {
                void study.answerQuestionById(questionId, answer);
              }}
              onFinish={() => {
                void study.loadResult();
              }}
              onSave={(questionId) => {
                void study.saveQuestion(questionId);
              }}
              onShare={(questionId) => {
                window.dispatchEvent(
                  new CustomEvent("abqoor:share-question", {
                    detail: { questionId }
                  })
                );
              }}
              questions={study.questions}
            />
          ) : (
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
          )}
        </>
      ) : null}

      {study.isLoadingResult ? (
        <p className="status-message">جاري تحميل النتيجة...</p>
      ) : null}
    </section>
  );
}
