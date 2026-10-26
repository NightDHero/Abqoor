import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HttpError } from "../../services/http";
import { reviewBankService } from "../../services/reviewBankService";
import { sessionService } from "../../services/sessionService";
import type {
  CorrectAnswer,
  SessionQuestion,
  SessionResult,
  SubmitAnswerResponse
} from "../../types/session";
import { getWeakTopics } from "./studyUtils";
import { createImmediateStudyAnswer } from "./studyAnswer";

const studyQuestionLimit = 15;
const maxActiveDurationSecondsPerAnswer = 24 * 60 * 60;
type StudyAnswerSubmission = {
  activeDurationSeconds: number;
  questionId: string;
  sessionId: string;
  userAnswer: CorrectAnswer;
};

const readErrorMessage = (caughtError: unknown, fallback: string) =>
  caughtError instanceof HttpError ? caughtError.message : fallback;

const getTimerNow = () =>
  typeof performance === "undefined" ? Date.now() : performance.now();

const isDocumentActive = () => {
  if (typeof document === "undefined") {
    return true;
  }

  return (
    document.visibilityState === "visible" &&
    (typeof document.hasFocus !== "function" || document.hasFocus())
  );
};

const useActiveQuestionTimer = (questionId: string | null) => {
  const questionIdRef = useRef(questionId);
  const activeQuestionIdRef = useRef<string | null>(null);
  const activeStartedAtRef = useRef<number | null>(null);
  const elapsedMsByQuestionIdRef = useRef(new Map<string, number>());

  const pause = useCallback(() => {
    const activeQuestionId = activeQuestionIdRef.current;
    const activeStartedAt = activeStartedAtRef.current;

    if (!activeQuestionId || activeStartedAt === null) {
      return;
    }

    const elapsed = Math.max(0, getTimerNow() - activeStartedAt);
    elapsedMsByQuestionIdRef.current.set(
      activeQuestionId,
      (elapsedMsByQuestionIdRef.current.get(activeQuestionId) ?? 0) + elapsed
    );
    activeQuestionIdRef.current = null;
    activeStartedAtRef.current = null;
  }, []);

  const resume = useCallback(() => {
    const activeQuestionId = questionIdRef.current;

    if (!activeQuestionId || !isDocumentActive()) {
      return;
    }

    if (
      activeQuestionIdRef.current === activeQuestionId &&
      activeStartedAtRef.current !== null
    ) {
      return;
    }

    pause();
    activeQuestionIdRef.current = activeQuestionId;
    activeStartedAtRef.current = getTimerNow();
  }, [pause]);

  useEffect(() => {
    questionIdRef.current = questionId;
    pause();
    resume();

    return pause;
  }, [pause, questionId, resume]);

  useEffect(() => {
    const syncActivity = () => {
      if (isDocumentActive()) {
        resume();
        return;
      }

      pause();
    };

    window.addEventListener("focus", syncActivity);
    window.addEventListener("blur", syncActivity);
    document.addEventListener("visibilitychange", syncActivity);
    syncActivity();

    return () => {
      window.removeEventListener("focus", syncActivity);
      window.removeEventListener("blur", syncActivity);
      document.removeEventListener("visibilitychange", syncActivity);
      pause();
    };
  }, [pause, resume]);

  const getDurationSeconds = useCallback((targetQuestionId: string) => {
    let elapsedMs = elapsedMsByQuestionIdRef.current.get(targetQuestionId) ?? 0;

    if (
      activeQuestionIdRef.current === targetQuestionId &&
      activeStartedAtRef.current !== null
    ) {
      elapsedMs += Math.max(0, getTimerNow() - activeStartedAtRef.current);
    }

    return Math.min(
      Math.round(elapsedMs / 1000),
      maxActiveDurationSecondsPerAnswer
    );
  }, []);

  const reset = useCallback(() => {
    activeQuestionIdRef.current = null;
    activeStartedAtRef.current = null;
    elapsedMsByQuestionIdRef.current.clear();
  }, []);

  return { getDurationSeconds, reset };
};

export function useStudySession() {
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responsesByQuestionId, setResponsesByQuestionId] = useState<
    Partial<Record<string, SubmitAnswerResponse>>
  >({});
  const [manualReviewQuestionIds, setManualReviewQuestionIds] = useState<
    string[]
  >([]);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [submittingQuestionIds, setSubmittingQuestionIds] = useState<Set<string>>(
    new Set()
  );
  const [failedAnswerQuestionIds, setFailedAnswerQuestionIds] = useState<string[]>([]);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const answeredQuestionIdsRef = useRef(new Set<string>());
  const failedSubmissionsRef = useRef(new Map<string, StudyAnswerSubmission>());
  const pendingSubmissionsRef = useRef(new Map<string, Promise<boolean>>());
  const sessionGenerationRef = useRef(0);

  const currentQuestion = questions[currentIndex] ?? null;
  const currentResponse = currentQuestion
    ? responsesByQuestionId[currentQuestion.id]
    : undefined;
  const isActive = Boolean(sessionId) && questions.length > 0 && !result;
  const isLastQuestion = currentIndex >= questions.length - 1;
  const activeQuestionTimer = useActiveQuestionTimer(
    isActive && currentQuestion && !responsesByQuestionId[currentQuestion.id]
      ? currentQuestion.id
      : null
  );

  const weakTopics = useMemo(
    () =>
      getWeakTopics(
        questions,
        Object.values(responsesByQuestionId)
          .filter((response): response is SubmitAnswerResponse =>
            Boolean(response && !response.isCorrect)
          )
          .map((response) => response.questionId)
      ),
    [questions, responsesByQuestionId]
  );

  const start = async (
    subjectId?: "math" | "arabic",
    planDate?: string
  ) => {
    sessionGenerationRef.current += 1;
    setIsStarting(true);
    setError("");
    setResult(null);
    setCurrentIndex(0);
    setQuestions([]);
    setResponsesByQuestionId({});
    setManualReviewQuestionIds([]);
    setSubmittingQuestionIds(new Set());
    setFailedAnswerQuestionIds([]);
    answeredQuestionIdsRef.current.clear();
    failedSubmissionsRef.current.clear();
    pendingSubmissionsRef.current.clear();
    activeQuestionTimer.reset();

    try {
      const response = await sessionService.startSession({
        planDate,
        questionLimit: studyQuestionLimit,
        subjectId
      });
      setSessionId(response.sessionId);
      setQuestions(response.questions);
      const restoredResponses = Object.fromEntries(
        response.answers.map((answer) => [answer.questionId, answer])
      );
      answeredQuestionIdsRef.current = new Set(
        response.answers.map((answer) => answer.questionId)
      );
      setResponsesByQuestionId(restoredResponses);
      const firstUnansweredIndex = response.questions.findIndex(
        (question) => !restoredResponses[question.id]
      );
      setCurrentIndex(firstUnansweredIndex >= 0 ? firstUnansweredIndex : 0);
      if (response.status === "completed") {
        setResult(await sessionService.getResult(response.sessionId));
      }
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, "تعذر بدء جلسة الدراسة."));
    } finally {
      setIsStarting(false);
    }
  };

  const persistAnswer = (input: StudyAnswerSubmission) => {
    const existing = pendingSubmissionsRef.current.get(input.questionId);
    if (existing) return existing;

    const generation = sessionGenerationRef.current;
    failedSubmissionsRef.current.delete(input.questionId);
    setFailedAnswerQuestionIds((existingIds) =>
      existingIds.filter((questionId) => questionId !== input.questionId)
    );
    setError("");
    setSubmittingQuestionIds((existingIds) =>
      new Set(existingIds).add(input.questionId)
    );

    const request = sessionService.submitAnswer(input)
      .then((response) => {
        if (sessionGenerationRef.current === generation) {
          setResponsesByQuestionId((existingResponses) => ({
            ...existingResponses,
            [input.questionId]: response
          }));
        }
        return true;
      })
      .catch((caughtError: unknown) => {
        if (sessionGenerationRef.current === generation) {
          failedSubmissionsRef.current.set(input.questionId, input);
          setFailedAnswerQuestionIds((existingIds) =>
            existingIds.includes(input.questionId)
              ? existingIds
              : [...existingIds, input.questionId]
          );
          setError(readErrorMessage(
            caughtError,
            "ظهرت الإجابة، لكن تعذر حفظها. أعد المحاولة قبل إنهاء الجلسة."
          ));
        }
        return false;
      })
      .finally(() => {
        if (pendingSubmissionsRef.current.get(input.questionId) === request) {
          pendingSubmissionsRef.current.delete(input.questionId);
        }
        if (sessionGenerationRef.current === generation) {
          setSubmittingQuestionIds((existingIds) => {
            const next = new Set(existingIds);
            next.delete(input.questionId);
            return next;
          });
        }
      });

    pendingSubmissionsRef.current.set(input.questionId, request);
    return request;
  };

  const answerQuestionById = (
    questionId: string,
    answer: CorrectAnswer
  ) => {
    const question = questions.find((candidate) => candidate.id === questionId);

    if (
      !sessionId ||
      !question ||
      answeredQuestionIdsRef.current.has(question.id)
    ) {
      return false;
    }

    answeredQuestionIdsRef.current.add(question.id);
    setError("");
    const submission: StudyAnswerSubmission = {
      activeDurationSeconds: activeQuestionTimer.getDurationSeconds(question.id),
      questionId: question.id,
      sessionId,
      userAnswer: answer
    };

    const optimisticResponse = createImmediateStudyAnswer({
      activeDurationSeconds: submission.activeDurationSeconds,
      answer,
      question,
      sessionId
    });
    if (optimisticResponse) {
      setResponsesByQuestionId((existing) => ({
        ...existing,
        [question.id]: optimisticResponse
      }));
      void persistAnswer(submission);
      return true;
    }

    return persistAnswer(submission);
  };

  const answerQuestion = async (answer: CorrectAnswer) => {
    if (currentQuestion) {
      return answerQuestionById(currentQuestion.id, answer);
    }

    return false;
  };

  const saveQuestion = async (questionId: string) => {
    if (!questions.some((question) => question.id === questionId)) {
      return;
    }

    setIsSavingReview(true);
    setError("");

    try {
      await reviewBankService.addQuestion(questionId, "manual");
      setManualReviewQuestionIds((existing) =>
        existing.includes(questionId)
          ? existing
          : [...existing, questionId]
      );
    } catch (caughtError) {
      setError(
        readErrorMessage(caughtError, "تعذر إضافة السؤال إلى بنك المراجعة.")
      );
    } finally {
      setIsSavingReview(false);
    }
  };

  const saveCurrentQuestion = async () => {
    if (currentQuestion) {
      await saveQuestion(currentQuestion.id);
    }
  };

  const loadResult = async () => {
    if (!sessionId) {
      return;
    }

    setIsLoadingResult(true);
    setError("");

    try {
      await Promise.allSettled([...pendingSubmissionsRef.current.values()]);
      if (failedSubmissionsRef.current.size > 0) {
        setError("تعذر حفظ بعض الإجابات. أعد المحاولة قبل عرض النتيجة.");
        return;
      }
      setResult(await sessionService.getResult(sessionId));
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, "تعذر تحميل نتيجة الجلسة."));
    } finally {
      setIsLoadingResult(false);
    }
  };

  const retryAnswer = (questionId: string) => {
    const submission = failedSubmissionsRef.current.get(questionId);
    return submission ? persistAnswer(submission) : Promise.resolve(true);
  };

  const goToPrevious = () => {
    setCurrentIndex((value) => Math.max(value - 1, 0));
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(
      Math.min(Math.max(index, 0), Math.max(questions.length - 1, 0))
    );
  };

  const goToNext = async () => {
    if (isLastQuestion) {
      await loadResult();
      return;
    }

    setCurrentIndex((value) => Math.min(value + 1, questions.length - 1));
  };

  const isCurrentQuestionInManualReview = currentQuestion
    ? manualReviewQuestionIds.includes(currentQuestion.id)
    : false;

  return {
    answerQuestion,
    answerQuestionById,
    currentIndex,
    currentQuestion,
    currentResponse,
    error,
    goToNext,
    goToIndex,
    goToPrevious,
    isActive,
    isCurrentQuestionInManualReview,
    isLastQuestion,
    isLoadingResult,
    isSavingReview,
    isStarting,
    isSubmitting: submittingQuestionIds.size > 0,
    isCurrentQuestionSubmitting: currentQuestion
      ? submittingQuestionIds.has(currentQuestion.id)
      : false,
    manualReviewQuestionIds,
    failedAnswerQuestionIds,
    questions,
    responsesByQuestionId,
    result,
    loadResult,
    saveQuestion,
    saveCurrentQuestion,
    retryAnswer,
    start,
    submittingQuestionIds,
    weakTopics
  };
}
