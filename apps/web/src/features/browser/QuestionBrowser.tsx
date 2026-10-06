import type { CareerWorld, SubtopicPillar, TopicPillar } from "../career/career.types";
import { ImmersiveQuestionFeed } from "../../components/ui/ImmersiveQuestionFeed";
import { getAnswerImageUrl, toMediaSrc } from "./browserUtils";
import { BrowserControls } from "./BrowserControls";
import { QuestionMode } from "./QuestionMode";
import { QuestionNavigator } from "./QuestionNavigator";
import { ReviewButton } from "./ReviewButton";
import { useQuestionBrowser } from "./useQuestionBrowser";
import { useReviewBank } from "./useReviewBank";

export function QuestionBrowser({
  initialQuestionId,
  subtopic,
  topic,
  world
}: {
  initialQuestionId?: string;
  subtopic?: SubtopicPillar;
  topic: TopicPillar;
  world: CareerWorld;
}) {
  const browser = useQuestionBrowser({
    initialQuestionId,
    subject: world.id,
    subtopic: subtopic?.routeSlug,
    topic: topic.routeSlug
  });
  const reviewBank = useReviewBank();
  const handleOpenQuestion = (questionId: string) => {
    if (browser.displayMode === "immersive") {
      const index = browser.filteredQuestions.findIndex(
        (question) => question.id === questionId
      );

      if (index >= 0) {
        browser.goToIndex(index);
      }

      return;
    }

    browser.goToQuestion(questionId);
  };
  const handleAnswer = async (
    questionId: string,
    answer: Parameters<typeof browser.answerQuestion>[0]
  ) => {
    const evaluation = await browser.answerQuestionById(questionId, answer);
    if (!evaluation) return false;
    if (!evaluation.isCorrect) void reviewBank.addQuestion(questionId, "wrong_answer");
    return true;
  };

  return (
    <section
      className={`question-browser question-browser-${world.id}`}
      aria-labelledby="browser-title"
    >
      <header className="browser-context">
        <div className="browser-title-strip">
          <h1 className="page-title" id="browser-title">
            {subtopic ? subtopic.name : topic.name}
          </h1>
          {!browser.isLoading && browser.filteredQuestions.length > 0 ? (
            <QuestionNavigator
              currentIndex={browser.currentIndex}
              currentQuestionId={browser.currentQuestion?.id}
              onOpenQuestion={handleOpenQuestion}
              questions={browser.filteredQuestions}
            />
          ) : null}
        </div>
        <div className="browser-context-actions">
          <BrowserControls
            displayMode={browser.displayMode}
            resultCount={browser.filteredQuestions.length}
            searchText={browser.searchText}
            setDisplayMode={browser.setDisplayMode}
            setSearchText={browser.setSearchText}
            totalCount={browser.questions.length}
          />
          {browser.displayMode === "question" && browser.currentQuestion ? (
            <ReviewButton
              isInReview={reviewBank.hasQuestion(browser.currentQuestion.id)}
              onAdd={() => {
                void reviewBank.addQuestion(browser.currentQuestion!.id);
              }}
            />
          ) : null}
        </div>
      </header>

      {browser.isLoading ? (
        <p className="status-message">جاري تحميل الأسئلة...</p>
      ) : null}
      {browser.error ? <p className="error-message">{browser.error}</p> : null}

      {!browser.isLoading && browser.filteredQuestions.length === 0 ? (
        <div className="workspace-empty-state">
          لا توجد أسئلة مطابقة لهذا المسار أو البحث الحالي.
        </div>
      ) : null}

      {browser.displayMode === "question" && browser.currentQuestion ? (
        <QuestionMode
          correctAnswer={browser.correctAnswersByQuestionId[browser.currentQuestion.id]}
          currentIndex={browser.currentIndex}
          isInReview={reviewBank.hasQuestion(browser.currentQuestion.id)}
          onAddReview={() => {
            void reviewBank.addQuestion(browser.currentQuestion.id);
          }}
          onAnswer={(answer) => handleAnswer(browser.currentQuestion!.id, answer)}
          onNext={browser.goToNext}
          onPrevious={browser.goToPrevious}
          question={browser.currentQuestion}
          selectedAnswer={
            browser.answersByQuestionId[browser.currentQuestion.id]
          }
          showToolbar={false}
          totalQuestions={browser.filteredQuestions.length}
        />
      ) : null}

      {browser.displayMode === "immersive" ? (
        <ImmersiveQuestionFeed
          activeIndex={browser.currentIndex}
          getAnswerState={(questionId) => {
            const question = browser.filteredQuestions.find(
              (candidate) => candidate.id === questionId
            );

            return {
              correctAnswer: browser.correctAnswersByQuestionId[questionId],
              isSubmitting: browser.submittingQuestionIds.has(questionId),
              selectedAnswer: browser.answersByQuestionId[questionId]
            };
          }}
          getImageSrc={toMediaSrc}
          isSaved={reviewBank.hasQuestion}
          onActiveIndexChange={browser.goToIndex}
          onAnswer={handleAnswer}
          onSave={(questionId) => {
            void reviewBank.addQuestion(questionId);
          }}
          onShare={(questionId) => {
            window.dispatchEvent(
              new CustomEvent("abqoor:share-question", {
                detail: { questionId }
              })
            );
          }}
          questions={browser.filteredQuestions.map((question) => ({
            answerImageUrls: {
              A: getAnswerImageUrl(question, "A") ?? undefined,
              B: getAnswerImageUrl(question, "B") ?? undefined,
              C: getAnswerImageUrl(question, "C") ?? undefined,
              D: getAnswerImageUrl(question, "D") ?? undefined
            },
            id: question.id,
            questionImageUrl: question.questionImageUrl
          }))}
          variant={world.id}
        />
      ) : null}

    </section>
  );
}
