import { useEffect, useState } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { SummaryMetric } from "../components/ui/SummaryMetric";
import { HttpError } from "../services/http";
import {
  emptyReviewBank,
  reviewBankService,
  type ReviewBankResponse,
  type ReviewItem
} from "../services/reviewBankService";
import { toQuestionNumber } from "../features/browser/browserUtils";
import { navigateTo } from "../utils/router";

const sourceLabels = {
  manual: "حفظ يدوي",
  wrong_answer: "إجابة خاطئة"
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ar-SA", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const getQuestionPath = (item: ReviewItem) => {
  const questionParam = `?question=${encodeURIComponent(item.questionId)}`;

  if (item.subjectId === "math" && item.topicId && item.subtopicId) {
    return `/browse/math/${item.topicId}/${item.subtopicId}${questionParam}`;
  }

  if (item.subjectId === "arabic" && item.topicId) {
    return `/browse/arabic/${item.topicId}${questionParam}`;
  }

  if (item.subjectId === "arabic" || item.subject === "verbal") {
    return `/browse/arabic/verbal-analogy${questionParam}`;
  }

  return `/career`;
};

function ReviewQuestionList({
  emptyMessage,
  items,
  onRemove,
  sectionId,
  title
}: {
  emptyMessage: string;
  items: ReviewItem[];
  onRemove: (reviewItemId: string) => void;
  sectionId: string;
  title: string;
}) {
  return (
    <section className="review-section" aria-labelledby={`${sectionId}-title`}>
      <div className="section-heading">
        <h2 id={`${sectionId}-title`}>{title}</h2>
        <span>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="status-message">{emptyMessage}</p>
      ) : (
        <div className="review-list">
          {items.map((item) => {
            const questionNumber = toQuestionNumber(item.questionId);

            return (
              <article className="review-item" key={item.id}>
                <header className="review-item-heading">
                  <div>
                    <span>السؤال {questionNumber ?? item.questionId}</span>
                    <strong dir="ltr">{item.questionId}</strong>
                  </div>
                  <span className={`review-source review-source-${item.source}`}>
                    {sourceLabels[item.source]}
                  </span>
                </header>
                <dl className="review-item-meta">
                  <div>
                    <dt>الموضوع</dt>
                    <dd>{item.topic}</dd>
                  </div>
                  {item.subtopic ? (
                    <div>
                      <dt>المهارة</dt>
                      <dd>{item.subtopic}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>آخر تفاعل</dt>
                    <dd>{formatDate(item.updatedAt)}</dd>
                  </div>
                </dl>
                <div className="review-item-actions">
                  <button
                    type="button"
                    onClick={() => navigateTo(getQuestionPath(item))}
                  >
                    فتح السؤال
                  </button>
                  <button className="secondary" type="button" onClick={() => onRemove(item.id)}>
                    إزالة من المراجعة
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ReviewPage() {
  const [reviewBank, setReviewBank] =
    useState<ReviewBankResponse>(emptyReviewBank);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReviewBank = async () => {
    setIsLoading(true);
    setError("");

    try {
      setReviewBank(await reviewBankService.getReviewBank());
    } catch (caughtError) {
      setError(
        caughtError instanceof HttpError
          ? caughtError.message
          : "تعذر تحميل بنك المراجعة."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReviewBank();
  }, []);

  const removeReviewItem = async (reviewItemId: string) => {
    try {
      await reviewBankService.removeQuestion(reviewItemId);
      await loadReviewBank();
    } catch (caughtError) {
      setError(
        caughtError instanceof HttpError
          ? caughtError.message
          : "تعذر إزالة السؤال من بنك المراجعة."
      );
    }
  };

  return (
    <PageContainer
      eyebrow="المراجعة"
      title="بنك الأخطاء"
    >
      {isLoading ? <p className="status-message">جاري تحميل بنك المراجعة...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <section className="review-overview" aria-label="ملخص بنك المراجعة">
        <SummaryMetric
          label="محفوظة يدويًا"
          value={reviewBank.savedQuestions.length}
        />
        <SummaryMetric
          label="إجابات خاطئة"
          tone="attention"
          value={reviewBank.wrongQuestions.length}
        />
        <SummaryMetric
          label="إجمالي المراجعة"
          value={reviewBank.savedQuestions.length + reviewBank.wrongQuestions.length}
        />
      </section>

      <div className="review-bank">
        <ReviewQuestionList
          emptyMessage="لا توجد أسئلة محفوظة يدويًا بعد."
          items={reviewBank.savedQuestions}
          onRemove={(reviewItemId) => {
            void removeReviewItem(reviewItemId);
          }}
          sectionId="saved-review-questions"
          title="الأسئلة المحفوظة"
        />
        <ReviewQuestionList
          emptyMessage="لا توجد أسئلة خاطئة بعد."
          items={reviewBank.wrongQuestions}
          onRemove={(reviewItemId) => {
            void removeReviewItem(reviewItemId);
          }}
          sectionId="wrong-review-questions"
          title="الأسئلة الخاطئة"
        />
      </div>
    </PageContainer>
  );
}
