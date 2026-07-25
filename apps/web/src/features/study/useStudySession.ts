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

  const answerQuestionById = async (
    questionId: string,
    answer: CorrectAnswer
  ) => {
    const question = questions.find((candidate) => candidate.id === questionId);

    if (
      !sessionId ||
      !question ||
      responsesByQuestionId[question.id]
    ) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await sessionService.submitAnswer({
        questionId: question.id,
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

  const answerQuestion = async (answer: CorrectAnswer) => {
    if (currentQuestion) {
      await answerQuestionById(currentQuestion.id, answer);
    }
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
    isSubmitting,
    manualReviewQuestionIds,
    questions,
    responsesByQuestionId,
    result,
    loadResult,
    saveQuestion,
    saveCurrentQuestion,
    start,
    weakTopics
  };
}
