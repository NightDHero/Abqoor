import type { CorrectAnswer } from "../questions/question.types.js";

export const officialExamSectionCount = 5;
export const officialExamMathPerSection = 12;
export const officialExamArabicPerSection = 13;
export const officialExamQuestionsPerSection =
  officialExamMathPerSection + officialExamArabicPerSection;
export const officialExamSectionDurationSeconds = 30 * 60;
export const officialExamTestModeMessage =
  "وضع الاختبار التجريبي - سيتم استخدام أسئلة مؤقتة حتى اكتمال بنك الأسئلة";

export type OfficialExamStatus = "active" | "completed";
export type OfficialExamSectionStatus = "pending" | "active" | "completed";
export type OfficialExamCategory = "math" | "arabic";

export type OfficialExamRecord = {
  id: string;
  user_id: string;
  status: OfficialExamStatus;
  current_section: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OfficialExamSectionRecord = {
  exam_id: string;
  section_number: number;
  status: OfficialExamSectionStatus;
  started_at: string | null;
  completed_at: string | null;
};

export type OfficialExamQuestionRecord = {
  exam_id: string;
  section_number: number;
  position_in_section: number;
  global_position: number;
  category: OfficialExamCategory;
  question_id: string;
  user_answer: CorrectAnswer | null;
  flagged: 0 | 1;
  answered_at: string | null;
  updated_at: string;
  question_image_url: string;
  correct_answer: CorrectAnswer;
  subject: string;
  subject_id: string | null;
  topic: string;
  topic_id: string | null;
  subtopic: string | null;
  subtopic_id: string | null;
  difficulty: number;
  difficulty_score: number | null;
};

export type OfficialExamResultRecord = {
  id: string;
  exam_id: string;
  user_id: string;
  math_score: number;
  arabic_score: number;
  final_score: number;
  section_1_score: number;
  section_2_score: number;
  section_3_score: number;
  section_4_score: number;
  section_5_score: number;
  created_at: string;
};

export type OfficialExamQuestion = {
  questionId: string;
  questionImageUrl: string;
  sectionNumber: number;
  positionInSection: number;
  globalPosition: number;
  category: OfficialExamCategory;
  userAnswer?: CorrectAnswer;
  flagged: boolean;
  subject: string;
  subjectId?: string;
  topic: string;
  topicId?: string;
  subtopic?: string;
  subtopicId?: string;
  difficulty: number;
  difficultyScore?: number;
};

export type OfficialExamSection = {
  sectionNumber: number;
  status: OfficialExamSectionStatus;
  startedAt?: string;
  completedAt?: string;
  questions: OfficialExamQuestion[];
};

export type OfficialExam = {
  id: string;
  isTestMode: boolean;
  testModeMessage?: string;
  status: OfficialExamStatus;
  currentSection: number;
  sectionDurationSeconds: number;
  startedAt: string;
  completedAt?: string;
  sections: OfficialExamSection[];
  result?: OfficialExamResult;
};

export type OfficialExamResult = {
  id: string;
  examId: string;
  mathScore: number;
  arabicScore: number;
  finalScore: number;
  sectionScores: number[];
  topicScores?: OfficialExamTopicScore[];
  createdAt: string;
  created_at: string;
};

export type OfficialExamTopicScore = {
  subject: OfficialExamCategory;
  topicId: string;
  topicName: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
};

export const toOfficialExamQuestion = (
  record: OfficialExamQuestionRecord
): OfficialExamQuestion => ({
  questionId: record.question_id,
  questionImageUrl: record.question_image_url,
  sectionNumber: record.section_number,
  positionInSection: record.position_in_section,
  globalPosition: record.global_position,
  category: record.category,
  userAnswer: record.user_answer ?? undefined,
  flagged: record.flagged === 1,
  subject: record.subject,
  subjectId: record.subject_id ?? undefined,
  topic: record.topic,
  topicId: record.topic_id ?? undefined,
  subtopic: record.subtopic ?? undefined,
  subtopicId: record.subtopic_id ?? undefined,
  difficulty: record.difficulty,
  difficultyScore: record.difficulty_score ?? undefined
});

export const toOfficialExamResult = (
  record: OfficialExamResultRecord
): OfficialExamResult => ({
  id: record.id,
  examId: record.exam_id,
  mathScore: record.math_score,
  arabicScore: record.arabic_score,
  finalScore: record.final_score,
  sectionScores: [
    record.section_1_score,
    record.section_2_score,
    record.section_3_score,
    record.section_4_score,
    record.section_5_score
  ],
  createdAt: record.created_at,
  created_at: record.created_at
});
