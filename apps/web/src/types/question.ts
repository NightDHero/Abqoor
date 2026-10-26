export type CorrectAnswer = "A" | "B" | "C" | "D";

export type Question = {
  correctAnswer?: CorrectAnswer;
  id: string;
  questionImageUrl: string;
  subject: "quantitative" | "verbal";
  subjectId?: "math" | "arabic";
  topic: string;
  topicId?: string;
  subtopic?: string;
  subtopicId?: string;
  difficulty: number;
  difficultyScore?: number;
  estimatedTimeSeconds?: number;
  explanationVideoUrl?: string;
  skillTags?: string[];
  importanceWeight?: number;
  answerImageUrls?: Partial<Record<CorrectAnswer, string>>;
  optionImageUrls?: Partial<Record<CorrectAnswer, string>>;
};

export type QuestionListResponse = {
  questions: Question[];
};

export type QuestionAnswerResponse = {
  correctAnswer: CorrectAnswer;
  isCorrect: boolean;
};
