import type {
  StudentProfile,
  StudentProfileInput,
  StudyPlanPreview,
  StudyRestDay
} from "../types/profile";
import { apiRequest } from "./http";
import { invalidateStudyProgressCache } from "../features/career/studyProgressCache";
import { loadQuery, readQueryCache, writeQueryCache } from "./queryCache";

type ProfileResponse = {
  profile: StudentProfile;
};

const profileCacheKey = "profile:current";
const profileCacheMaxAgeMs = 60_000;

export type SchedulePreviewInput = {
  studyPlanBankCount: number;
  studyPlanStartDate: string;
  quantitativeStudyDays: StudyRestDay[];
  weeklyRestDay: StudyRestDay;
  weeklyReviewDay: StudyRestDay;
  verbalStudyDays: StudyRestDay[];
};

const schedulePreviewCacheKey = (input: SchedulePreviewInput) =>
  `profile:schedule-preview:${JSON.stringify({
    quantitativeStudyDays: input.quantitativeStudyDays,
    studyPlanBankCount: input.studyPlanBankCount,
    studyPlanStartDate: input.studyPlanStartDate,
    verbalStudyDays: input.verbalStudyDays,
    weeklyRestDay: input.weeklyRestDay,
    weeklyReviewDay: input.weeklyReviewDay
  })}`;

export const profileService = {
  getCachedProfile: () =>
    readQueryCache<ProfileResponse>(profileCacheKey, profileCacheMaxAgeMs),
  getProfile: () => loadQuery({
    key: profileCacheKey,
    loader: () => apiRequest<ProfileResponse>("/profile"),
    maxAgeMs: profileCacheMaxAgeMs
  }),
  getCachedSchedulePreview: (input: SchedulePreviewInput) =>
    readQueryCache<{ plan: StudyPlanPreview }>(
      schedulePreviewCacheKey(input),
      30_000
    ),
  previewSchedule: (input: SchedulePreviewInput) => loadQuery({
    key: schedulePreviewCacheKey(input),
    loader: () => apiRequest<{ plan: StudyPlanPreview }>("/profile/schedule-preview", {
      body: JSON.stringify(input),
      method: "POST"
    }),
    maxAgeMs: 30_000
  }),
  saveProfile: async (input: StudentProfileInput) => {
    const response = await apiRequest<ProfileResponse>("/profile", {
      body: JSON.stringify(input),
      method: "PUT"
    });
    writeQueryCache(profileCacheKey, response);
    invalidateStudyProgressCache();
    return response;
  }
};
