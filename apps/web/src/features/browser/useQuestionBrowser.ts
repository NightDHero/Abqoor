import { useEffect, useMemo, useState } from "react";
import { HttpError } from "../../services/http";
import { questionService } from "../../services/questionService";
import type { CorrectAnswer, Question } from "../../types/question";
import type { RouteSubject } from "../../utils/router";
import {
  matchesQuestionSearch,
  sortByImporterOrder
} from "./browserUtils";

export type BrowserDisplayMode = "question" | "gallery";

const readErrorMessage = (caughtError: unknown, fallback: string) =>
  caughtError instanceof HttpError ? caughtError.message : fallback;

export function useQuestionBrowser({
  initialQuestionId,
  subject,
  subtopic,
  topic
}: {
  initialQuestionId?: string;
  subject: RouteSubject;
  subtopic?: string;
  topic: string;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState<BrowserDisplayMode>("question");
  const [searchText, setSearchText] = useState("");
  const [answersByQuestionId, setAnswersByQuestionId] = useState<
    Partial<Record<string, CorrectAnswer>>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadQuestions = async () => {
      setIsLoading(true);
      setError("");
      setCurrentIndex(0);
      setAnswersByQuestionId({});

      try {
        const exact = await questionService.getQuestions({
          subjectId: subject,
          subtopicId: subtopic,
          topicId: topic
        });
        let nextQuestions = exact.questions;

        if (
          nextQuestions.length === 0 &&
          subject === "arabic" &&
          topic === "verbal-analogy"
        ) {
          const fallback = await questionService.getQuestions({
            subjectId: "arabic"
          });
          nextQuestions = fallback.questions;
        }

        if (isMounted) {
          const sortedQuestions = sortByImporterOrder(nextQuestions);
          const initialIndex =
            initialQuestionId === undefined
              ? 0
              : sortedQuestions.findIndex(
                  (question) => question.id === initialQuestionId
                );

          setQuestions(sortedQuestions);
          setCurrentIndex(initialIndex >= 0 ? initialIndex : 0);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(readErrorMessage(caughtError, "تعذر تحميل الأسئلة."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadQuestions();

    return () => {
      isMounted = false;
    };
  }, [initialQuestionId, subject, subtopic, topic]);

  const filteredQuestions = useMemo(
    () =>
      questions.filter((question) =>
        matchesQuestionSearch(question, searchText)
      ),
    [questions, searchText]
  );

  useEffect(() => {
    if (currentIndex >= filteredQuestions.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, filteredQuestions.length]);

  const currentQuestion = filteredQuestions[currentIndex] ?? null;

  const answerQuestion = (answer: CorrectAnswer) => {
    if (!currentQuestion) {
      return;
    }

    setAnswersByQuestionId((existing) => ({
      ...existing,
      [currentQuestion.id]: answer
    }));
  };

  const goToPrevious = () => {
    setCurrentIndex((value) => Math.max(value - 1, 0));
  };

  const goToNext = () => {
    setCurrentIndex((value) =>
      Math.min(value + 1, Math.max(filteredQuestions.length - 1, 0))
    );
  };

  const goToQuestion = (questionId: string) => {
    const index = filteredQuestions.findIndex(
      (question) => question.id === questionId
    );

    if (index >= 0) {
      setCurrentIndex(index);
      setDisplayMode("question");
    }
  };

  return {
    answerQuestion,
    answersByQuestionId,
    currentIndex,
    currentQuestion,
    displayMode,
    error,
    filteredQuestions,
    goToNext,
    goToPrevious,
    goToQuestion,
    isLoading,
    questions,
    searchText,
    setDisplayMode,
    setSearchText
  };
}
