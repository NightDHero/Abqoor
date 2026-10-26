import type { CorrectAnswer } from "../types/question";
import { preloadImages } from "./preloadImages";

type QuestionAsset = {
  answerImageUrls?: Partial<Record<CorrectAnswer, string>>;
  optionImageUrls?: Partial<Record<CorrectAnswer, string>>;
  questionImageUrl: string;
};

const answerKeys: CorrectAnswer[] = ["A", "B", "C", "D"];

export const getQuestionAssetSources = (
  question: QuestionAsset,
  toSource: (path: string) => string
) => [
  toSource(question.questionImageUrl),
  ...answerKeys.flatMap((answer) => {
    const path =
      question.answerImageUrls?.[answer] ??
      question.optionImageUrls?.[answer];
    return path ? [toSource(path)] : [];
  })
];

export const getQuestionWindowAssetSources = (
  questions: QuestionAsset[],
  activeIndex: number,
  toSource: (path: string) => string,
  questionCount = 3
) => questions
  .slice(Math.max(0, activeIndex), Math.max(0, activeIndex) + questionCount)
  .flatMap((question) => getQuestionAssetSources(question, toSource));

export const preloadQuestionWindow = (
  questions: QuestionAsset[],
  activeIndex: number,
  toSource: (path: string) => string,
  questionCount = 3
) => {
  const sources = getQuestionWindowAssetSources(
    questions,
    activeIndex,
    toSource,
    questionCount
  );

  return preloadImages(sources, sources.length);
};

