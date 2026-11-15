import type {
  ReviewBankResponse,
  ReviewItem,
  ReviewSource
} from "../services/reviewBankService";

export type ReviewFilter = "all" | "saved" | "wrong";

export type ReviewDisplayItem = {
  item: ReviewItem;
  priority: number;
  reviewItemIds: string[];
  sources: ReviewSource[];
  updatedAt: string;
};

const newestFirst = (first: ReviewDisplayItem, second: ReviewDisplayItem) =>
  second.priority - first.priority ||
  Date.parse(second.updatedAt) - Date.parse(first.updatedAt);

export const buildReviewDisplayItems = (
  reviewBank: ReviewBankResponse,
  filter: ReviewFilter
) => {
  const sourceItems = filter === "saved"
    ? reviewBank.savedQuestions
    : filter === "wrong"
      ? reviewBank.wrongQuestions
      : [...reviewBank.wrongQuestions, ...reviewBank.savedQuestions];
  const byQuestionId = new Map<string, ReviewDisplayItem>();

  for (const item of sourceItems) {
    const existing = byQuestionId.get(item.questionId);

    if (!existing) {
      byQuestionId.set(item.questionId, {
        item,
        priority: item.priority,
        reviewItemIds: [item.id],
        sources: [item.source],
        updatedAt: item.updatedAt
      });
      continue;
    }

    const itemIsNewer = Date.parse(item.updatedAt) > Date.parse(existing.updatedAt);
    existing.item = itemIsNewer ? item : existing.item;
    existing.priority = Math.max(existing.priority, item.priority);
    existing.updatedAt = itemIsNewer ? item.updatedAt : existing.updatedAt;
    if (!existing.reviewItemIds.includes(item.id)) existing.reviewItemIds.push(item.id);
    if (!existing.sources.includes(item.source)) existing.sources.push(item.source);
  }

  return [...byQuestionId.values()].sort(newestFirst);
};
