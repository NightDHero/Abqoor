import { useEffect, useMemo, useRef, useState } from "react";
import { HttpError } from "../../services/http";
import { questionService } from "../../services/questionService";
import type { CorrectAnswer, Question } from "../../types/question";
import type { RouteSubject } from "../../utils/router";
import { preloadQuestionWindow } from "../../utils/questionAssets";
import {
  matchesQuestionSearch,
  sortByImporterOrder,
  toMediaSrc
} from "./browserUtils";
import { evaluatePracticeAnswer } from "./practiceAnswer";

export type BrowserDisplayMode = "question" | "immersive";

const readErrorMessage = (caughtError: unknown, fallback: string) =>
  caughtError instanceof HttpError ? caughtError.message : fallback;

const getCorrectAnswers = (questions: Question[]) => Object.fromEntries(
  questions.flatMap((question) =>
    question.correctAnswer ? [[question.id, question.correctAnswer]] : []
  )
) as Partial<Record<string, CorrectAnswer>>;

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
  const query = { subjectId: subject, subtopicId: subtopic, topicId: topic };
  const initialCache = questionService.getCachedQuestions(query);
  const [questions, setQuestions] = useState<Question[]>(
    () => initialCache?.data.questions ?? []
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState<BrowserDisplayMode>("question");
  const [searchText, setSearchText] = useState("");
  const [answersByQuestionId, setAnswersByQuestionId] = useState<
    Partial<Record<string, CorrectAnswer>>
  >({});
  const [correctAnswersByQuestionId, setCorrectAnswersByQuestionId] = useState<
    Partial<Record<string, CorrectAnswer>>
  >(() => getCorrectAnswers(initialCache?.data.questions ?? []));
  const [submittingQuestionIds, setSubmittingQuestionIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(!initialCache);
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const answeredQuestionIdsRef = useRef(new Set<string>());
  const requestVersionRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const requestVersion = ++requestVersionRef.current;
    const isCurrentRequest = () =>
      isMounted && requestVersionRef.current === requestVersion;

    const loadQuestions = async () => {
      const cached = questionService.getCachedQuestions({
        subjectId: subject,
        subtopicId: subtopic,
        topicId: topic
      });
      const cachedQuestions = sortByImporterOrder(cached?.data.questions ?? []);
      setQuestions(cachedQuestions);
      setIsLoading(!cached);
      setError("");
      setCurrentIndex(0);
      setAnswersByQuestionId({});
      setCorrectAnswersByQuestionId(
        getCorrectAnswers(cachedQuestions)
      );
      setSubmittingQuestionIds(new Set());
      answeredQuestionIdsRef.current.clear();

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

        if (isCurrentRequest()) {
          const sortedQuestions = sortByImporterOrder(nextQuestions);
          const initialIndex =
            initialQuestionId === undefined
              ? 0
              : sortedQuestions.findIndex(
                  (question) => question.id === initialQuestionId
                );

          setQuestions(sortedQuestions);
          setCorrectAnswersByQuestionId(getCorrectAnswers(sortedQuestions));
          setCurrentIndex(initialIndex >= 0 ? initialIndex : 0);
        }
      } catch (caughtError) {
        if (isCurrentRequest()) {
          setError(readErrorMessage(caughtError, "تعذر تحميل الأسئلة."));
        }
      } finally {
        if (isCurrentRequest()) {
          setIsLoading(false);
        }
      }
    };

    void loadQuestions();

    return () => {
      isMounted = false;
    };
  }, [initialQuestionId, reloadVersion, subject, subtopic, topic]);

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

  useEffect(() => {
    void preloadQuestionWindow(filteredQuestions, currentIndex, toMediaSrc, 3);
  }, [currentIndex, filteredQuestions]);

  const answerQuestionById = (
    questionId: string,
    answer: CorrectAnswer
  ) => {
    const question = filteredQuestions.find(
      (candidate) => candidate.id === questionId
    );
    if (!question || answeredQuestionIdsRef.current.has(questionId)) {
      return null;
    }

    answeredQuestionIdsRef.current.add(questionId);
    const applyEvaluation = (evaluation: {
      correctAnswer: CorrectAnswer;
      isCorrect: boolean;
    }) => {
      setAnswersByQuestionId((existing) => ({ ...existing, [questionId]: answer }));
      setCorrectAnswersByQuestionId((existing) => ({
        ...existing,
        [questionId]: evaluation.correctAnswer
      }));
      return evaluation;
    };

    const evaluation = evaluatePracticeAnswer(
      question,
      answer,
      () => questionService.evaluateAnswer(questionId, answer)
    );
    if (!(evaluation instanceof Promise)) {
      return applyEvaluation(evaluation);
    }

    setSubmittingQuestionIds((existing) => new Set(existing).add(questionId));
    return evaluation
      .then(applyEvaluation)
      .catch((caughtError: unknown) => {
        answeredQuestionIdsRef.current.delete(questionId);
        setError(readErrorMessage(caughtError, "تعذر تقييم الإجابة."));
        return null;
      })
      .finally(() => {
        setSubmittingQuestionIds((existing) => {
          const next = new Set(existing);
          next.delete(questionId);
          return next;
        });
      });
  };

  const answerQuestion = async (answer: CorrectAnswer) => {
    if (currentQuestion) {
      return answerQuestionById(currentQuestion.id, answer);
    }
    return null;
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

  const goToIndex = (index: number) => {
    setCurrentIndex(
      Math.min(Math.max(index, 0), Math.max(filteredQuestions.length - 1, 0))
    );
  };

  return {
    answerQuestion,
    answerQuestionById,
    answersByQuestionId,
    correctAnswersByQuestionId,
    currentIndex,
    currentQuestion,
    displayMode,
    error,
    filteredQuestions,
    goToNext,
    goToIndex,
    goToPrevious,
    goToQuestion,
    isLoading,
    questions,
    retry: () => setReloadVersion((value) => value + 1),
    searchText,
    setDisplayMode,
    setSearchText,
    submittingQuestionIds
  };
}
