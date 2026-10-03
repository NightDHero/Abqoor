import { useEffect, useState } from "react";
import { profileService } from "../../services/profileService";
import type {
  StudyPlanPreview,
  StudyRestDay
} from "../../types/profile";

export function useStudyPlanPreview(input: {
  bankCount: number;
  restDay: StudyRestDay;
  reviewDay: StudyRestDay;
  startDate: string;
}) {
  const [plan, setPlan] = useState<StudyPlanPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (
      !input.startDate ||
      !Number.isInteger(input.bankCount) ||
      input.bankCount < 1 ||
      input.restDay === input.reviewDay
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
        weeklyRestDay: input.restDay,
        weeklyReviewDay: input.reviewDay
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
  }, [input.bankCount, input.restDay, input.reviewDay, input.startDate]);

  return { isLoading, plan };
}
