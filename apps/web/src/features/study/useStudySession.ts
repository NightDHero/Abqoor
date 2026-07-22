import { useMemo, useState } from "react";
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

const studyQuestionLimit = 15;

const readErrorMessage = (caughtError: unknown, fallback: string) =>
  caughtError instanceof HttpError ? caughtError.message : fallback;

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);

  const currentQuestion = questions[currentIndex] ?? null;
  const currentResponse = currentQuestion
    ? responsesByQuestionId[currentQuestion.id]
    : undefined;
  const isActive = Boolean(sessionId) && questions.length > 0 && !result;
  const isLastQuestion = currentIndex >= questions.length - 1;

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

  const start = async () => {
    setIsStarting(true);
    setError("");
    setResult(null);
    setCurrentIndex(0);
    setQuestions([]);
    setResponsesByQuestionId({});
    setManualReviewQuestionIds([]);

    try {
      const response = await sessionService.startSession(studyQuestionLimit);
      setSessionId(response.sessionId);
      setQuestions(response.questions);
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, "تعذر بدء جلسة الدراسة."));
    } finally {
      setIsStarting(false);
    }
  };

  const answerQuestion = async (answer: CorrectAnswer) => {
    if (
      !sessionId ||
      !currentQuestion ||
      responsesByQuestionId[currentQuestion.id]
    ) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await sessionService.submitAnswer({
        questionId: currentQuestion.id,
        sessionId,
        userAnswer: answer
      });

      setResponsesByQuestionId((existing) => ({
        ...existing,
        [currentQuestion.id]: response
      }));
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, "تعذر إرسال الإجابة."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveCurrentQuestion = async () => {
    if (!currentQuestion) {
      return;
    }

    setIsSavingReview(true);
    setError("");

    try {
      await reviewBankService.addQuestion(currentQuestion.id, "manual");
      setManualReviewQuestionIds((existing) =>
        existing.includes(currentQuestion.id)
          ? existing
          : [...existing, currentQuestion.id]
      );
    } catch (caughtError) {
      setError(
        readErrorMessage(caughtError, "تعذر إضافة السؤال إلى بنك المراجعة.")
      );
    } finally {
      setIsSavingReview(false);
    }
  };

  const loadResult = async () => {
    if (!sessionId) {
      return;
    }

    setIsLoadingResult(true);
    setError("");

    try {
      setResult(await sessionService.getResult(sessionId));
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, "تعذر تحميل نتيجة الجلسة."));
    } finally {
      setIsLoadingResult(false);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((value) => Math.max(value - 1, 0));
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
    currentIndex,
    currentQuestion,
    currentResponse,
    error,
    goToNext,
    goToPrevious,
    isActive,
    isCurrentQuestionInManualReview,
    isLastQuestion,
    isLoadingResult,
    isSavingReview,
    isStarting,
    isSubmitting,
    manualReviewQuestionIds,
    questions,
    responsesByQuestionId,
    result,
    saveCurrentQuestion,
    start,
    weakTopics
  };
}
