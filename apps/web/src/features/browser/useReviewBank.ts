import { useEffect, useMemo, useState } from "react";
import {
  emptyReviewBank,
  reviewBankService,
  type ReviewBankResponse,
  type ReviewSource
} from "../../services/reviewBankService";

export function useReviewBank() {
  const [reviewBank, setReviewBank] =
    useState<ReviewBankResponse>(emptyReviewBank);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReviewBank = async () => {
    setIsLoading(true);
    setError("");

    try {
      setReviewBank(await reviewBankService.getReviewBank());
    } catch {
      setError("تعذر تحميل بنك المراجعة.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReviewBank();
  }, []);

  const questionIdsBySource = useMemo(
    () => ({
      manual: new Set(reviewBank.savedQuestions.map((item) => item.questionId)),
      wrong_answer: new Set(
        reviewBank.wrongQuestions.map((item) => item.questionId)
      )
    }),
    [reviewBank]
  );

  const addQuestion = async (
    questionId: string,
    source: ReviewSource = "manual"
  ) => {
    try {
      await reviewBankService.addQuestion(questionId, source);
      await loadReviewBank();
    } catch {
      setError("تعذر إضافة السؤال إلى بنك المراجعة.");
    }
  };

  const hasQuestion = (questionId: string, source: ReviewSource = "manual") => {
    return questionIdsBySource[source].has(questionId);
  };

  return {
    addQuestion,
    error,
    hasQuestion,
    isLoading,
    reviewBank
  };
}
