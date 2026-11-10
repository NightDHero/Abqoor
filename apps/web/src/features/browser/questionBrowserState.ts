import type { CorrectAnswer, Question } from "../../types/question";
import type { RouteSubject } from "../../utils/router";
import { matchesQuestionSearch } from "./browserUtils";

export type BrowserDisplayMode = "question" | "immersive";

export type QuestionBrowserState = {
  answersByQuestionId: Partial<Record<string, CorrectAnswer>>;
  correctAnswersByQuestionId: Partial<Record<string, CorrectAnswer>>;
  currentQuestionId: string | null;
  displayMode: BrowserDisplayMode;
  searchText: string;
};

export const getQuestionBrowserStateKey = (input: {
  subject: RouteSubject;
  subtopic?: string;
  topic: string;
}) =>
  `question-browser-state:${input.subject}:${input.topic}:${input.subtopic ?? ""}`;

export const getRestoredQuestionIndex = (
  questions: Question[],
  searchText: string,
  preferredQuestionId?: string | null
) => {
  if (!preferredQuestionId) return 0;
  const filteredQuestions = questions.filter((question) =>
    matchesQuestionSearch(question, searchText)
  );
  const index = filteredQuestions.findIndex(
    (question) => question.id === preferredQuestionId
  );
  return index >= 0 ? index : 0;
};
