import { findQuestionById } from "../questions/question.repository.js";
import {
  deleteReviewItem,
  findReviewItemById,
  listReviewItems,
  upsertReviewItem
} from "./review.repository.js";
import type { ReviewBank, ReviewSource } from "./review.types.js";
import { toReviewItem } from "./review.types.js";

export class ReviewError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

export const addReviewQuestion = async (
  userId: string,
  questionId: string,
  source: ReviewSource
) => {
  if (!userId.trim()) {
    throw new ReviewError("Authentication required.", 401);
  }

  if (!questionId.trim()) {
    throw new ReviewError("questionId is required.");
  }

  const question = await findQuestionById(questionId);

  if (!question) {
    throw new ReviewError("Question not found.", 404);
  }

  const reviewItem = await upsertReviewItem({
    questionId,
    source,
    userId
  });

  if (!reviewItem) {
    throw new ReviewError("Review item could not be saved.", 500);
  }

  return toReviewItem(reviewItem);
};

export const getReviewBank = async (userId: string): Promise<ReviewBank> => {
  const reviewItems = (await listReviewItems(userId)).map(toReviewItem);

  return {
    savedQuestions: reviewItems.filter((item) => item.source === "manual"),
    wrongQuestions: reviewItems.filter((item) => item.source === "wrong_answer")
  };
};

export const removeReviewQuestion = async (userId: string, reviewItemId: string) => {
  if (!reviewItemId.trim()) {
    throw new ReviewError("reviewItemId is required.");
  }

  const existing = await findReviewItemById(userId, reviewItemId);

  if (!existing) {
    throw new ReviewError("Review item not found.", 404);
  }

  await deleteReviewItem(userId, reviewItemId);
};

export const recordWrongAnswerReview = async (userId: string, questionId: string) => {
  return addReviewQuestion(userId, questionId, "wrong_answer");
};
