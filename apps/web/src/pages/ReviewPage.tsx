import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { SummaryMetric } from "../components/ui/SummaryMetric";
import { SystemIcon } from "../components/ui/SystemIcon";
import { toQuestionNumber } from "../features/browser/browserUtils";
import { HttpError } from "../services/http";
import {
  emptyReviewBank,
  reviewBankService,
  type ReviewBankResponse,
  type ReviewItem,
  type ReviewSource
} from "../services/reviewBankService";
import { navigateTo } from "../utils/router";
import {
  buildReviewDisplayItems,
  type ReviewDisplayItem,
  type ReviewFilter
} from "./reviewDisplay";

const sourceLabels: Record<ReviewSource, string> = {
  manual: "حفظ يدوي",
  wrong_answer: "إجابة خاطئة"
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

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

  if (item.subjectId === "math" && item.topicId) {
    const destination = item.subtopicId
      ? `/browse/math/${item.topicId}/${item.subtopicId}`
      : `/browse/math/${item.topicId}`;
    return `${destination}${questionParam}`;
  }

  if (item.subjectId === "arabic" && item.topicId) {
    return `/browse/arabic/${item.topicId}${questionParam}`;
  }

  if (item.subjectId === "arabic" || item.subject === "verbal") {
    return `/browse/arabic/verbal-analogy${questionParam}`;
  }

  return "/career";
};

const stopEntryNavigation = (event: MouseEvent<HTMLElement>) => {
  event.stopPropagation();
};

function ReviewQuestionList({
  emptyMessage,
  items,
  onRemove,
  removingItemKey,
  sectionId,
  title
}: {
  emptyMessage: string;
  items: ReviewDisplayItem[];
  onRemove: (item: ReviewDisplayItem) => void;
  removingItemKey?: string;
  sectionId: string;
  title: string;
}) {
  const [confirmingItemKey, setConfirmingItemKey] = useState("");
  const [openInfoKey, setOpenInfoKey] = useState("");

  const openQuestion = (item: ReviewItem) => navigateTo(getQuestionPath(item));
  const handleEntryKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    item: ReviewItem
  ) => {
    if (event.currentTarget !== event.target) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openQuestion(item);
    }
  };

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
          {items.map((displayItem) => {
            const { item } = displayItem;
            const questionNumber =
              item.sourceQuestionNumber ?? toQuestionNumber(item.questionId);
            const itemKey = item.questionId;
            const questionPath = getQuestionPath(item);
            const tooltipId = `review-date-${item.id}`;
            const isConfirming = confirmingItemKey === itemKey;
            const isRemoving = removingItemKey === itemKey;

            return (
              <article
                aria-label={`فتح السؤال ${questionNumber ?? ""}`.trim()}
                className="review-item review-item-interactive"
                data-info-open={openInfoKey === itemKey}
                data-prefetch-route={questionPath}
                key={itemKey}
                role="link"
                tabIndex={0}
                onClick={() => openQuestion(item)}
                onKeyDown={(event) => handleEntryKeyDown(event, item)}
              >
                <header className="review-item-heading">
                  <strong>
                    {questionNumber === null || questionNumber === undefined
                      ? "السؤال"
                      : `السؤال ${questionNumber.toLocaleString("ar-SA")}`}
                  </strong>
                  <span className="review-source-list">
                    {displayItem.sources.map((source) => (
                      <span className={`review-source review-source-${source}`} key={source}>
                        {sourceLabels[source]}
                      </span>
                    ))}
                  </span>
                </header>

                <dl className="review-item-meta">
                  <div>
                    <dt>الموضوع:</dt>
                    <dd>{item.topic}</dd>
                  </div>
                  {item.subtopic ? (
                    <div>
                      <dt>المهارة:</dt>
                      <dd>{item.subtopic}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="review-item-controls" onClick={stopEntryNavigation}>
                  <span className="review-info-control">
                    <button
                      aria-describedby={openInfoKey === itemKey ? tooltipId : undefined}
                      aria-expanded={openInfoKey === itemKey}
                      aria-label="عرض تاريخ آخر تفاعل"
                      className="review-icon-button review-info-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenInfoKey((current) => current === itemKey ? "" : itemKey);
                      }}
                    >
                      <SystemIcon name="info" />
                    </button>
                    <span
                      className="review-date-tooltip"
                      data-open={openInfoKey === itemKey}
                      id={tooltipId}
                      role="tooltip"
                    >
                      آخر تفاعل: {formatDate(displayItem.updatedAt)}
                    </span>
                  </span>
                  <button
                    aria-label="إزالة السؤال من المراجعة"
                    className="review-icon-button review-delete-button"
                    disabled={isRemoving}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setConfirmingItemKey(itemKey);
                    }}
                  >
                    <SystemIcon name="trash" />
                  </button>
                </div>

                {isConfirming ? (
                  <div
                    className="review-removal-confirmation"
                    role="alertdialog"
                    aria-label="تأكيد إزالة السؤال"
                    onClick={stopEntryNavigation}
                  >
                    <span>إزالة السؤال من قائمة المراجعة؟</span>
                    <button
                      className="secondary"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmingItemKey("");
                      }}
                    >
                      إلغاء
                    </button>
                    <button
                      disabled={isRemoving}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemove(displayItem);
                        setConfirmingItemKey("");
                      }}
                    >
                      {isRemoving ? "جاري الإزالة..." : "تأكيد الإزالة"}
                    </button>
                  </div>
                ) : null}
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
  const [feedback, setFeedback] = useState("");
  const [activeFilter, setActiveFilter] = useState<ReviewFilter>("all");
  const [removingItemKey, setRemovingItemKey] = useState("");

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

  const removeReviewItem = async (displayItem: ReviewDisplayItem) => {
    setRemovingItemKey(displayItem.item.questionId);
    setError("");
    setFeedback("");
    try {
      for (const reviewItemId of displayItem.reviewItemIds) {
        await reviewBankService.removeQuestion(reviewItemId);
      }
      const cached = reviewBankService.getCachedReviewBank();
      if (cached) setReviewBank(cached.data);
      setFeedback("تمت إزالة السؤال من قائمة المراجعة.");
    } catch (caughtError) {
      const cached = reviewBankService.getCachedReviewBank();
      if (cached) setReviewBank(cached.data);
      setError(
        caughtError instanceof HttpError
          ? caughtError.message
          : "تعذر إزالة السؤال من بنك المراجعة."
      );
    } finally {
      setRemovingItemKey("");
    }
  };

  const allReviewItems = useMemo(
    () => buildReviewDisplayItems(reviewBank, "all"),
    [reviewBank]
  );
  const visibleItems = useMemo(
    () => buildReviewDisplayItems(reviewBank, activeFilter),
    [activeFilter, reviewBank]
  );
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
      {feedback ? <p className="review-feedback" role="status">{feedback}</p> : null}

      {!isLoading ? <section className="review-overview" aria-label="ملخص بنك المراجعة">
        <SummaryMetric label="محفوظة يدويًا" value={reviewBank.savedQuestions.length} />
        <SummaryMetric
          label="إجابات خاطئة"
          tone="attention"
          value={reviewBank.wrongQuestions.length}
        />
        <SummaryMetric label="إجمالي المراجعة" value={allReviewItems.length} />
      </section> : null}

      {!isLoading ? <div className="review-workspace">
        <div className="review-filters" role="group" aria-label="تصفية أسئلة المراجعة">
          <button
            aria-pressed={activeFilter === "all"}
            className={activeFilter === "all" ? "selected" : undefined}
            type="button"
            onClick={() => setActiveFilter("all")}
          >
            <span>كل أسئلة المراجعة</span>
            <strong>{allReviewItems.length}</strong>
          </button>
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
        </div>

        <ReviewQuestionList
          emptyMessage={emptyMessage}
          items={visibleItems}
          onRemove={(item) => void removeReviewItem(item)}
          removingItemKey={removingItemKey}
          sectionId="review-questions"
          title={activeFilterLabel}
        />
      </div> : null}
    </PageContainer>
  );
}
