import { useEffect, useState } from "react";
import { profileService } from "../../services/profileService";
import type {
  StudyPlanPreview,
  StudyRestDay
} from "../../types/profile";
import { isCompleteWeeklySchedule } from "./studyPlan";

export function useStudyPlanPreview(input: {
  bankCount: number;
  quantitativeStudyDays: StudyRestDay[];
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  startDate: string;
  verbalStudyDays: StudyRestDay[];
}) {
  const [plan, setPlan] = useState<StudyPlanPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (
      !input.startDate ||
      !Number.isInteger(input.bankCount) ||
      input.bankCount < 1 ||
      !isCompleteWeeklySchedule({
        quantitativeStudyDays: input.quantitativeStudyDays,
        restDay: input.restDay,
        reviewDay: input.reviewDay,
        verbalStudyDays: input.verbalStudyDays
      })
    ) {
      setPlan(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    void profileService
      .previewSchedule({
        studyPlanBankCount: input.bankCount,
        studyPlanStartDate: input.startDate,
        quantitativeStudyDays: input.quantitativeStudyDays,
        weeklyRestDay: input.restDay,
        weeklyReviewDay: input.reviewDay,
        verbalStudyDays: input.verbalStudyDays
      })
      .then((response) => {
        if (isMounted) setPlan(response.plan);
      })
      .catch(() => {
        if (isMounted) setPlan(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    input.bankCount,
    input.quantitativeStudyDays,
    input.restDay,
    input.reviewDay,
    input.startDate,
    input.verbalStudyDays
  ]);

  return { isLoading, plan };
}
