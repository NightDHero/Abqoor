export const correctAnswers = ["A", "B", "C", "D"] as const;
export const subjects = ["quantitative", "verbal"] as const;
export const questionSources = ["pdf", "excel", "manual"] as const;

export type CorrectAnswer = (typeof correctAnswers)[number];
export type Subject = (typeof subjects)[number];
export type QuestionSource = (typeof questionSources)[number];

export type QuestionRecord = {
  id: string;
  question_image_url: string;
  image_storage_key: string | null;
  source_pdf_id: string | null;
  source_page: number | null;
  correct_answer: CorrectAnswer;
  subject: Subject;
  subject_id: string | null;
  topic: string;
  topic_id: string | null;
  subtopic: string | null;
  subtopic_id: string | null;
  difficulty: number;
  difficulty_score: number | null;
  estimated_time_seconds: number | null;
  skill_tags: string | null;
  importance_weight: number | null;
  source: QuestionSource;
  version: number;
  explanation_video_url: string | null;
  import_job_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Question = {
  id: string;
  questionImageUrl: string;
  imageStorageKey?: string;
  sourcePdfId?: string;
  sourcePage?: number;
  correctAnswer: CorrectAnswer;
  subject: Subject;
  subjectId?: string;
  topic: string;
  topicId?: string;
  subtopic?: string;
  subtopicId?: string;
  difficulty: number;
  difficultyScore?: number;
  estimatedTimeSeconds?: number;
  skillTags?: string[];
  importanceWeight?: number;
  source: QuestionSource;
  version: number;
  explanationVideoUrl?: string;
  importJobId?: string;
  createdAt: string;
  updatedAt: string;
};

export type QuestionWriteInput = {
  id: string;
  questionImageUrl: string;
  imageStorageKey?: string;
  sourcePdfId?: string;
  sourcePage?: number;
  correctAnswer: CorrectAnswer;
  subject: Subject;
  subjectId?: string;
  topic: string;
  topicId?: string;
  subtopic?: string;
  subtopicId?: string;
  difficulty: number;
  difficultyScore?: number;
  source: QuestionSource;
  version: number;
  importJobId?: string;
};

export type QuestionFilters = {
  subject?: Subject;
  subjectId?: string;
  topic?: string;
  topicId?: string;
  subtopicId?: string;
  difficulty?: number;
  difficultyScore?: number;
};

export const toQuestion = (record: QuestionRecord): Question => ({
  id: record.id,
  questionImageUrl: record.question_image_url,
  imageStorageKey: record.image_storage_key ?? undefined,
  sourcePdfId: record.source_pdf_id ?? undefined,
  sourcePage: record.source_page ?? undefined,
  correctAnswer: record.correct_answer,
  subject: record.subject,
  subjectId: record.subject_id ?? undefined,
  topic: record.topic,
  topicId: record.topic_id ?? undefined,
  subtopic: record.subtopic ?? undefined,
  subtopicId: record.subtopic_id ?? undefined,
  difficulty: record.difficulty,
  difficultyScore: record.difficulty_score ?? undefined,
  estimatedTimeSeconds: record.estimated_time_seconds ?? undefined,
  skillTags: record.skill_tags ? JSON.parse(record.skill_tags) : undefined,
  importanceWeight: record.importance_weight ?? undefined,
  source: record.source,
  version: record.version,
  explanationVideoUrl: record.explanation_video_url ?? undefined,
  importJobId: record.import_job_id ?? undefined,
  createdAt: record.created_at,
  updatedAt: record.updated_at
});
