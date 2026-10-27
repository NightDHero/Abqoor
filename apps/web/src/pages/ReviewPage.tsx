import { useEffect, useMemo, useState } from "react";
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
  removingItemId,
  sectionId,
  title
}: {
  emptyMessage: string;
  items: ReviewItem[];
  onRemove: (reviewItemId: string) => void;
  removingItemId?: string;
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
                    data-prefetch-route={getQuestionPath(item)}
                    type="button"
                    onClick={() => navigateTo(getQuestionPath(item))}
                  >
                    فتح السؤال
                  </button>
                  <button
                    className="secondary"
                    disabled={removingItemId === item.id}
                    type="button"
                    onClick={() => onRemove(item.id)}
                  >
                    {removingItemId === item.id ? "جاري الإزالة..." : "إزالة من المراجعة"}
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
  const initialCache = reviewBankService.getCachedReviewBank();
  const [reviewBank, setReviewBank] =
    useState<ReviewBankResponse>(initialCache?.data ?? emptyReviewBank);
  const [isLoading, setIsLoading] = useState(!initialCache);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "saved" | "wrong">("wrong");
  const [removingItemId, setRemovingItemId] = useState("");

  const loadReviewBank = async () => {
    const cached = reviewBankService.getCachedReviewBank();
    setIsLoading(!cached);
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
    setRemovingItemId(reviewItemId);
    try {
      await reviewBankService.removeQuestion(reviewItemId);
      const cached = reviewBankService.getCachedReviewBank();
      if (cached) setReviewBank(cached.data);
    } catch (caughtError) {
      setError(
        caughtError instanceof HttpError
          ? caughtError.message
          : "تعذر إزالة السؤال من بنك المراجعة."
      );
    } finally {
      setRemovingItemId("");
    }
  };

  const visibleItems = useMemo(() => {
    const items = activeFilter === "saved"
      ? reviewBank.savedQuestions
      : activeFilter === "wrong"
        ? reviewBank.wrongQuestions
        : [...reviewBank.wrongQuestions, ...reviewBank.savedQuestions];

    return [...items].sort((first, second) =>
      second.priority - first.priority ||
      Date.parse(second.updatedAt) - Date.parse(first.updatedAt)
    );
  }, [activeFilter, reviewBank]);

  const activeFilterLabel = activeFilter === "saved"
    ? "الأسئلة المحفوظة"
    : activeFilter === "wrong"
      ? "الأسئلة الخاطئة"
      : "كل أسئلة المراجعة";
  const emptyMessage = activeFilter === "saved"
    ? "لا توجد أسئلة محفوظة يدويًا بعد."
    : activeFilter === "wrong"
      ? "لا توجد إجابات خاطئة تحتاج إلى مراجعة الآن."
      : "بنك المراجعة فارغ حاليًا.";

  return (
    <PageContainer
      className="review-page"
      description="راجع ما أخطأت فيه وما حفظته، وابدأ من الأهم."
      eyebrow="المراجعة"
      title="بنك الأخطاء"
    >
      {isLoading ? (
        <div className="review-state" role="status">
          <span aria-hidden="true" />
          <p>جاري تحميل بنك المراجعة...</p>
        </div>
      ) : null}
      {error ? (
        <div className="error-message" role="alert">
          <span>{error}</span>
          <button className="secondary" type="button" onClick={() => void loadReviewBank()}>
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      {!isLoading ? <section className="review-overview" aria-label="ملخص بنك المراجعة">
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
      </section> : null}

      {!isLoading ? <div className="review-workspace">
        <div className="review-filters" role="group" aria-label="تصفية أسئلة المراجعة">
          <button
            aria-pressed={activeFilter === "wrong"}
            className={activeFilter === "wrong" ? "selected" : undefined}
            type="button"
            onClick={() => setActiveFilter("wrong")}
          >
            <span>إجابات خاطئة</span>
            <strong>{reviewBank.wrongQuestions.length}</strong>
          </button>
          <button
            aria-pressed={activeFilter === "saved"}
            className={activeFilter === "saved" ? "selected" : undefined}
            type="button"
            onClick={() => setActiveFilter("saved")}
          >
            <span>محفوظة يدويًا</span>
            <strong>{reviewBank.savedQuestions.length}</strong>
          </button>
          <button
            aria-pressed={activeFilter === "all"}
            className={activeFilter === "all" ? "selected" : undefined}
            type="button"
            onClick={() => setActiveFilter("all")}
          >
            <span>الكل</span>
            <strong>{reviewBank.savedQuestions.length + reviewBank.wrongQuestions.length}</strong>
          </button>
        </div>

        <ReviewQuestionList
          emptyMessage={emptyMessage}
          items={visibleItems}
          onRemove={(reviewItemId) => {
            void removeReviewItem(reviewItemId);
          }}
          removingItemId={removingItemId}
          sectionId="review-questions"
          title={activeFilterLabel}
        />
      </div> : null}
    </PageContainer>
  );
}
