export type CorrectAnswer = "A" | "B" | "C" | "D";

export type Question = {
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
