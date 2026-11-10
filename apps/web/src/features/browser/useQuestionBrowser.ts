import { useEffect, useMemo, useRef, useState } from "react";
import { HttpError } from "../../services/http";
import { questionService } from "../../services/questionService";
import { readQueryCache, writeQueryCache } from "../../services/queryCache";
import {
  recordPerformanceLoadingState,
  startPerformanceInteraction
} from "../../services/performanceTelemetry";
import type { CorrectAnswer, Question } from "../../types/question";
import type { RouteSubject } from "../../utils/router";
import { preloadQuestionWindow } from "../../utils/questionAssets";
import {
  matchesQuestionSearch,
  sortByImporterOrder,
  toMediaSrc
} from "./browserUtils";
import { evaluatePracticeAnswer } from "./practiceAnswer";
import {
  type BrowserDisplayMode,
  getQuestionBrowserStateKey,
  getRestoredQuestionIndex,
  type QuestionBrowserState
} from "./questionBrowserState";

export type { BrowserDisplayMode } from "./questionBrowserState";

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
  const stateKey = getQuestionBrowserStateKey({ subject, subtopic, topic });
  const initialState = readQueryCache<QuestionBrowserState>(
    stateKey,
    Number.POSITIVE_INFINITY
  )?.data;
  const initialCache = questionService.getCachedQuestions(query);
  const initialQuestions = sortByImporterOrder(initialCache?.data.questions ?? []);
  const initialSearchText = initialState?.searchText ?? "";
  const [questions, setQuestions] = useState<Question[]>(
    () => initialQuestions
  );
  const [currentIndex, setCurrentIndex] = useState(() =>
    getRestoredQuestionIndex(
      initialQuestions,
      initialSearchText,
      initialQuestionId ?? initialState?.currentQuestionId
    )
  );
  const [displayMode, setDisplayMode] = useState<BrowserDisplayMode>(
    initialState?.displayMode ?? "question"
  );
  const [searchText, setSearchText] = useState(initialSearchText);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<
    Partial<Record<string, CorrectAnswer>>
  >(initialState?.answersByQuestionId ?? {});
  const [correctAnswersByQuestionId, setCorrectAnswersByQuestionId] = useState<
    Partial<Record<string, CorrectAnswer>>
  >(() => ({
    ...getCorrectAnswers(initialQuestions),
    ...initialState?.correctAnswersByQuestionId
  }));
  const [submittingQuestionIds, setSubmittingQuestionIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(!initialCache);
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [hydratedStateKey, setHydratedStateKey] = useState(stateKey);
  const answeredQuestionIdsRef = useRef(
    new Set(Object.keys(initialState?.answersByQuestionId ?? {}))
  );
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
      const savedState = readQueryCache<QuestionBrowserState>(
        stateKey,
        Number.POSITIVE_INFINITY
      )?.data;
      const nextSearchText = savedState?.searchText ?? "";
      const preferredQuestionId =
        initialQuestionId ?? savedState?.currentQuestionId;
      setQuestions(cachedQuestions);
      setIsLoading(!cached);
      setError("");
      setSearchText(nextSearchText);
      setDisplayMode(savedState?.displayMode ?? "question");
      setCurrentIndex(
        getRestoredQuestionIndex(
          cachedQuestions,
          nextSearchText,
          preferredQuestionId
        )
      );
      setAnswersByQuestionId(savedState?.answersByQuestionId ?? {});
      setCorrectAnswersByQuestionId(
        {
          ...getCorrectAnswers(cachedQuestions),
          ...savedState?.correctAnswersByQuestionId
        }
      );
      setSubmittingQuestionIds(new Set());
      answeredQuestionIdsRef.current = new Set(
        Object.keys(savedState?.answersByQuestionId ?? {})
      );
      setHydratedStateKey(stateKey);

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

          setQuestions(sortedQuestions);
          setCorrectAnswersByQuestionId((existing) => ({
            ...getCorrectAnswers(sortedQuestions),
            ...existing
          }));
          setCurrentIndex(
            getRestoredQuestionIndex(
              sortedQuestions,
              nextSearchText,
              preferredQuestionId
            )
          );
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
  }, [initialQuestionId, reloadVersion, stateKey, subject, subtopic, topic]);

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
    if (isLoading) recordPerformanceLoadingState("question-browser");
  }, [isLoading]);

  useEffect(() => {
    if (hydratedStateKey !== stateKey || questions.length === 0) return;
    writeQueryCache<QuestionBrowserState>(stateKey, {
      answersByQuestionId,
      correctAnswersByQuestionId,
      currentQuestionId: currentQuestion?.id ?? null,
      displayMode,
      searchText
    });
  }, [
    answersByQuestionId,
    correctAnswersByQuestionId,
    currentQuestion?.id,
    displayMode,
    hydratedStateKey,
    questions.length,
    searchText,
    stateKey
  ]);

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

    startPerformanceInteraction("question", `${questionId}:answer`);
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
    const target = filteredQuestions[Math.max(currentIndex - 1, 0)];
    if (target) startPerformanceInteraction("question", target.id);
    setCurrentIndex((value) => Math.max(value - 1, 0));
  };

  const goToNext = () => {
    const target = filteredQuestions[
      Math.min(currentIndex + 1, Math.max(filteredQuestions.length - 1, 0))
    ];
    if (target) startPerformanceInteraction("question", target.id);
    setCurrentIndex((value) =>
      Math.min(value + 1, Math.max(filteredQuestions.length - 1, 0))
    );
  };

  const goToQuestion = (questionId: string) => {
    const index = filteredQuestions.findIndex(
      (question) => question.id === questionId
    );

    if (index >= 0) {
      startPerformanceInteraction("question", questionId);
      setCurrentIndex(index);
      setDisplayMode("question");
    }
  };

  const goToIndex = (index: number) => {
    const nextIndex = Math.min(
      Math.max(index, 0),
      Math.max(filteredQuestions.length - 1, 0)
    );
    const target = filteredQuestions[nextIndex];
    if (target) startPerformanceInteraction("question", target.id);
    setCurrentIndex(nextIndex);
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
