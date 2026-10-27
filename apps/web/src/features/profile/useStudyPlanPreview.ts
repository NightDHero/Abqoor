import { useEffect, useState } from "react";
import {
  profileService,
  type SchedulePreviewInput
} from "../../services/profileService";
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
  const request: SchedulePreviewInput = {
    quantitativeStudyDays: input.quantitativeStudyDays,
    studyPlanBankCount: input.bankCount,
    studyPlanStartDate: input.startDate,
    verbalStudyDays: input.verbalStudyDays,
    weeklyRestDay: input.restDay,
    weeklyReviewDay: input.reviewDay
  };
  const initialCache = profileService.getCachedSchedulePreview(request);
  const [plan, setPlan] = useState<StudyPlanPreview | null>(
    initialCache?.data.plan ?? null
  );
  const [isLoading, setIsLoading] = useState(!initialCache);

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
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const cached = profileService.getCachedSchedulePreview(request);
    if (cached) setPlan(cached.data.plan);
    setIsLoading(!cached);
    void profileService
      .previewSchedule(request)
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
