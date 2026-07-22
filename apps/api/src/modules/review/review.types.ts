export const reviewSources = ["manual", "wrong_answer"] as const;

export type ReviewSource = (typeof reviewSources)[number];

export type ReviewItemRecord = {
  id: string;
  user_id: string;
  question_id: string;
  source: ReviewSource;
  added_at: string;
  updated_at: string;
  priority: number;
  review_after: string | null;
  spaced_repetition_state: string | null;
  ai_schedule_metadata: string | null;
  question_image_url: string;
  correct_answer: string;
  subject: string;
  subject_id: string | null;
  topic: string;
  topic_id: string | null;
  subtopic: string | null;
  subtopic_id: string | null;
  difficulty: number;
  difficulty_score: number | null;
};

export type ReviewItem = {
  id: string;
  questionId: string;
  questionImageUrl: string;
  correctAnswer: string;
  source: ReviewSource;
  addedAt: string;
  updatedAt: string;
  priority: number;
  reviewAfter?: string;
  spacedRepetitionState?: string;
  aiScheduleMetadata?: string;
  subject: string;
  subjectId?: string;
  topic: string;
  topicId?: string;
  subtopic?: string;
  subtopicId?: string;
  difficulty: number;
  difficultyScore?: number;
};

export type ReviewBank = {
  savedQuestions: ReviewItem[];
  wrongQuestions: ReviewItem[];
};

export const isReviewSource = (value: unknown): value is ReviewSource => {
  return reviewSources.some((source) => source === value);
};

export const toReviewItem = (record: ReviewItemRecord): ReviewItem => ({
  id: record.id,
  questionId: record.question_id,
  questionImageUrl: record.question_image_url,
  correctAnswer: record.correct_answer,
  source: record.source,
  addedAt: record.added_at,
  updatedAt: record.updated_at,
  priority: record.priority,
  reviewAfter: record.review_after ?? undefined,
  spacedRepetitionState: record.spaced_repetition_state ?? undefined,
  aiScheduleMetadata: record.ai_schedule_metadata ?? undefined,
  subject: record.subject,
  subjectId: record.subject_id ?? undefined,
  topic: record.topic,
  topicId: record.topic_id ?? undefined,
  subtopic: record.subtopic ?? undefined,
  subtopicId: record.subtopic_id ?? undefined,
  difficulty: record.difficulty,
  difficultyScore: record.difficulty_score ?? undefined
});
