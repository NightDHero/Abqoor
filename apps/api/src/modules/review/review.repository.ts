import { randomUUID } from "node:crypto";
import { db } from "../../database/client.js";
import type { ReviewItemRecord, ReviewSource } from "./review.types.js";

const reviewItemSelect = `
  SELECT
    review_items.id,
    review_items.user_id,
    review_items.question_id,
    review_items.source,
    review_items.added_at,
    review_items.updated_at,
    review_items.priority,
    review_items.review_after,
    review_items.spaced_repetition_state,
    review_items.ai_schedule_metadata,
    questions.question_image_url,
    questions.correct_answer,
    questions.subject,
    questions.subject_id,
    questions.topic,
    questions.topic_id,
    questions.subtopic,
    questions.subtopic_id,
    questions.difficulty,
    questions.difficulty_score
  FROM review_items
  INNER JOIN questions ON questions.id = review_items.question_id
`;

const findReviewItemByUniqueStatement = db.prepare<
  [string, string, ReviewSource],
  ReviewItemRecord
>(`
  ${reviewItemSelect}
  WHERE review_items.user_id = ?
    AND review_items.question_id = ?
    AND review_items.source = ?
`);

const findReviewItemByIdStatement = db.prepare<[string, string], ReviewItemRecord>(`
  ${reviewItemSelect}
  WHERE review_items.user_id = ?
    AND review_items.id = ?
`);

const listReviewItemsStatement = db.prepare<string, ReviewItemRecord>(`
  ${reviewItemSelect}
  WHERE review_items.user_id = ?
  ORDER BY review_items.updated_at DESC, review_items.added_at DESC
`);

const upsertReviewItemStatement = db.prepare(`
  INSERT INTO review_items (
    id,
    user_id,
    question_id,
    source,
    added_at,
    updated_at
  )
  VALUES (
    @id,
    @userId,
    @questionId,
    @source,
    @now,
    @now
  )
  ON CONFLICT(user_id, question_id, source) DO UPDATE SET
    updated_at = excluded.updated_at
`);

const deleteReviewItemStatement = db.prepare(`
  DELETE FROM review_items
  WHERE user_id = ?
    AND id = ?
`);

export const findReviewItem = (
  userId: string,
  questionId: string,
  source: ReviewSource
) => {
  return findReviewItemByUniqueStatement.get(userId, questionId, source) ?? null;
};

export const findReviewItemById = (userId: string, reviewItemId: string) => {
  return findReviewItemByIdStatement.get(userId, reviewItemId) ?? null;
};

export const listReviewItems = (userId: string) => {
  return listReviewItemsStatement.all(userId) as ReviewItemRecord[];
};

export const upsertReviewItem = (input: {
  userId: string;
  questionId: string;
  source: ReviewSource;
}) => {
  const now = new Date().toISOString();

  upsertReviewItemStatement.run({
    id: randomUUID(),
    now,
    ...input
  });

  return findReviewItem(input.userId, input.questionId, input.source);
};

export const deleteReviewItem = (userId: string, reviewItemId: string) => {
  return deleteReviewItemStatement.run(userId, reviewItemId).changes;
};
