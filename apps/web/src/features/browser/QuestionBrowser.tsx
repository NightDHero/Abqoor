import type { CareerWorld, SubtopicPillar, TopicPillar } from "../career/career.types";
import { BrowserControls } from "./BrowserControls";
import { GalleryMode } from "./GalleryMode";
import { QuestionMode } from "./QuestionMode";
import { QuestionNavigator } from "./QuestionNavigator";
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
  const handleAnswer = (answer: Parameters<typeof browser.answerQuestion>[0]) => {
    browser.answerQuestion(answer);

    if (browser.currentQuestion && answer !== browser.currentQuestion.correctAnswer) {
      void reviewBank.addQuestion(browser.currentQuestion.id, "wrong_answer");
    }
  };

  return (
    <section
      className={`question-browser question-browser-${world.id}`}
      aria-labelledby="browser-title"
    >
      <header className="browser-context">
        <div>
          <p className="page-eyebrow">{world.label}</p>
          <h1 className="page-title" id="browser-title">
            {subtopic ? subtopic.name : topic.name}
          </h1>
        </div>
        <BrowserControls
          displayMode={browser.displayMode}
          resultCount={browser.filteredQuestions.length}
          searchText={browser.searchText}
          setDisplayMode={browser.setDisplayMode}
          setSearchText={browser.setSearchText}
          totalCount={browser.questions.length}
        />
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

      {!browser.isLoading && browser.filteredQuestions.length > 0 ? (
        <QuestionNavigator
          currentQuestionId={browser.currentQuestion?.id}
          onOpenQuestion={browser.goToQuestion}
          questions={browser.filteredQuestions}
        />
      ) : null}

      {browser.displayMode === "question" && browser.currentQuestion ? (
        <QuestionMode
          currentIndex={browser.currentIndex}
          isInReview={reviewBank.hasQuestion(browser.currentQuestion.id)}
          onAddReview={() => {
            void reviewBank.addQuestion(browser.currentQuestion.id);
          }}
          onAnswer={handleAnswer}
          onNext={browser.goToNext}
          onPrevious={browser.goToPrevious}
          question={browser.currentQuestion}
          selectedAnswer={
            browser.answersByQuestionId[browser.currentQuestion.id]
          }
          totalQuestions={browser.filteredQuestions.length}
        />
      ) : null}

      {browser.displayMode === "gallery" ? (
        <GalleryMode
          isInReview={reviewBank.hasQuestion}
          onAddReview={(questionId) => {
            void reviewBank.addQuestion(questionId);
          }}
          onOpenQuestion={browser.goToQuestion}
          questions={browser.filteredQuestions}
        />
      ) : null}
    </section>
  );
}
