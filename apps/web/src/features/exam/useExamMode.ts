import { useEffect, useMemo, useRef, useState } from "react";
import { HttpError } from "../../services/http";
import { examService } from "../../services/examService";
import type { ExamAttempt, ExamQuestion, ExamResult } from "../../types/exam";
import type { CorrectAnswer } from "../../types/session";
import {
  clearSavedActiveExamId,
  getSavedActiveExamId,
  saveActiveExamId
} from "./examStorage";

const readErrorMessage = (caughtError: unknown, fallback: string) =>
  caughtError instanceof HttpError ? caughtError.message : fallback;

const updateQuestionInExam = (
  exam: ExamAttempt,
  question: ExamQuestion,
  patch: Partial<ExamQuestion>
): ExamAttempt => ({
  ...exam,
  sections: exam.sections.map((section) =>
    section.sectionNumber === question.sectionNumber
      ? {
          ...section,
          questions: section.questions.map((candidate) =>
            candidate.positionInSection === question.positionInSection
              ? { ...candidate, ...patch }
              : candidate
          )
        }
      : section
  )
});

export function useExamMode() {
  const [exam, setExam] = useState<ExamAttempt | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(30 * 60);
  const [isStarting, setIsStarting] = useState(false);
  const [isLoadingSavedExam, setIsLoadingSavedExam] = useState(true);
  const [isCompletingSection, setIsCompletingSection] = useState(false);
  const [error, setError] = useState("");
  const autoCompleteSectionRef = useRef(false);

  const currentSection = useMemo(
    () =>
      exam?.sections.find(
        (section) => section.sectionNumber === exam.currentSection
      ) ?? null,
    [exam]
  );
  const currentQuestion = currentSection?.questions[currentIndex] ?? null;

  const loadExam = async (examId: string) => {
    try {
      const response = await examService.getAttempt(examId);
      setExam(response.exam);
      setResult(response.exam.result ?? null);

      if (response.exam.status === "completed") {
        clearSavedActiveExamId();
      }
    } catch {
      clearSavedActiveExamId();
    }
  };

  useEffect(() => {
    const savedExamId = getSavedActiveExamId();

    if (!savedExamId) {
      setIsLoadingSavedExam(false);
      return;
    }

    void loadExam(savedExamId).finally(() => {
      setIsLoadingSavedExam(false);
    });
  }, []);

  useEffect(() => {
    if (!currentSection?.startedAt || !exam || exam.status === "completed") {
      return;
    }

    const updateTimer = () => {
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(currentSection.startedAt ?? "").getTime()) / 1000
      );
      setRemainingSeconds(
        Math.max(exam.sectionDurationSeconds - elapsedSeconds, 0)
      );
    };

    updateTimer();
    const intervalId = window.setInterval(updateTimer, 1000);

    return () => window.clearInterval(intervalId);
  }, [currentSection?.startedAt, exam]);

  useEffect(() => {
    if (
      !exam ||
      exam.status === "completed" ||
      remainingSeconds > 0 ||
      autoCompleteSectionRef.current
    ) {
      return;
    }

    autoCompleteSectionRef.current = true;
    void completeSection().finally(() => {
      autoCompleteSectionRef.current = false;
    });
  }, [exam, remainingSeconds]);

  const startExam = async () => {
    setIsStarting(true);
    setError("");
    setResult(null);
    setCurrentIndex(0);

    try {
      const response = await examService.startExam();
      setExam(response.exam);
      saveActiveExamId(response.exam.id);
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, "تعذر بدء الاختبار."));
    } finally {
      setIsStarting(false);
    }
  };

  const answerQuestion = async (answer: CorrectAnswer) => {
    if (!exam || !currentQuestion) {
      return;
    }

    setError("");
    setExam(updateQuestionInExam(exam, currentQuestion, { userAnswer: answer }));

    try {
      const response = await examService.answerQuestion({
        examId: exam.id,
        positionInSection: currentQuestion.positionInSection,
        sectionNumber: currentQuestion.sectionNumber,
        userAnswer: answer
      });
      setExam(response.exam);
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, "تعذر حفظ الإجابة."));
      await loadExam(exam.id);
    }
  };

  const toggleFlag = async () => {
    if (!exam || !currentQuestion) {
      return;
    }

    const flagged = !currentQuestion.flagged;
    setError("");
    setExam(updateQuestionInExam(exam, currentQuestion, { flagged }));

    try {
      const response = await examService.flagQuestion({
        examId: exam.id,
        flagged,
        positionInSection: currentQuestion.positionInSection,
        sectionNumber: currentQuestion.sectionNumber
      });
      setExam(response.exam);
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, "تعذر حفظ علامة المراجعة."));
      await loadExam(exam.id);
    }
  };

  const completeSection = async () => {
    if (!exam || !currentSection) {
      return;
    }

    setIsCompletingSection(true);
    setError("");

    try {
      const response = await examService.completeSection({
        examId: exam.id,
        sectionNumber: currentSection.sectionNumber
      });
      setExam(response.exam);
      setCurrentIndex(0);

      if (response.result ?? response.exam.result) {
        const nextResult = response.result ?? response.exam.result ?? null;
        setResult(nextResult);
        clearSavedActiveExamId();
      }
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, "تعذر إنهاء القسم."));
    } finally {
      setIsCompletingSection(false);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((value) => Math.max(value - 1, 0));
  };

  const goToNext = () => {
    if (!currentSection) {
      return;
    }

    setCurrentIndex((value) =>
      Math.min(value + 1, currentSection.questions.length - 1)
    );
  };

  const jumpToQuestion = (positionInSection: number) => {
    if (!currentSection) {
      return;
    }

    const nextIndex = currentSection.questions.findIndex(
      (question) => question.positionInSection === positionInSection
    );

    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex);
    }
  };

  const exitExam = () => {
    clearSavedActiveExamId();
    setExam(null);
    setResult(null);
    setCurrentIndex(0);
    setRemainingSeconds(30 * 60);
    setError("");
  };

  return {
    answerQuestion,
    completeSection,
    currentIndex,
    currentQuestion,
    currentSection,
    error,
    exam,
    goToNext,
    goToPrevious,
    isCompletingSection,
    isLoadingSavedExam,
    isStarting,
    exitExam,
    jumpToQuestion,
    remainingSeconds,
    result,
    startExam,
    toggleFlag
  };
}
