import { useState } from "react";
import { sessionService } from "../../services/sessionService";
import type {
  CorrectAnswer,
  SessionQuestion,
  SessionResult,
  SubmitAnswerResponse
} from "../../types/session";
import { HttpError } from "../../services/http";

const practiceQuestionLimit = 10;

const readErrorMessage = (caughtError: unknown, fallback: string) =>
  caughtError instanceof HttpError ? caughtError.message : fallback;

export function usePracticeSession() {
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<CorrectAnswer | null>(null);
  const [feedback, setFeedback] = useState<SubmitAnswerResponse | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingResult, setIsLoadingResult] = useState(false);

  const currentQuestion = questions[currentIndex] ?? null;
  const isActive = Boolean(sessionId) && questions.length > 0 && !result;
  const isLastQuestion = currentIndex === questions.length - 1;

  const resetQuestionState = () => {
    setSelectedAnswer(null);
    setFeedback(null);
  };

  const start = async () => {
    setIsStarting(true);
    setError("");
    setResult(null);
    resetQuestionState();

    try {
      const response = await sessionService.startSession(practiceQuestionLimit);
      setSessionId(response.sessionId);
      setQuestions(response.questions);
      setCurrentIndex(0);
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, "تعذر بدء جلسة التدريب."));
    } finally {
      setIsStarting(false);
    }
  };

  const submit = async () => {
    if (!sessionId || !currentQuestion || !selectedAnswer || feedback) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await sessionService.submitAnswer({
        questionId: currentQuestion.id,
        sessionId,
        userAnswer: selectedAnswer
      });
      setFeedback(response);
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, "تعذر إرسال الإجابة."));
    } finally {
      setIsSubmitting(false);
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

  const goToNext = async () => {
    if (!feedback) {
      return;
    }

    if (isLastQuestion) {
      await loadResult();
      return;
    }

    setCurrentIndex((value) => value + 1);
    resetQuestionState();
  };

  return {
    currentIndex,
    currentQuestion,
    error,
    feedback,
    goToNext,
    isActive,
    isLastQuestion,
    isLoadingResult,
    isStarting,
    isSubmitting,
    questions,
    result,
    selectedAnswer,
    selectAnswer: setSelectedAnswer,
    start,
    submit
  };
}
