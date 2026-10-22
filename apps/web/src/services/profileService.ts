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

export const profileService = {
  getCachedProfile: () =>
    readQueryCache<ProfileResponse>(profileCacheKey, profileCacheMaxAgeMs),
  getProfile: () => loadQuery({
    key: profileCacheKey,
    loader: () => apiRequest<ProfileResponse>("/profile"),
    maxAgeMs: profileCacheMaxAgeMs
  }),
  previewSchedule: (input: {
    studyPlanBankCount: number;
    studyPlanStartDate: string;
    quantitativeStudyDays: StudyRestDay[];
    weeklyRestDay: StudyRestDay;
    weeklyReviewDay: StudyRestDay;
    verbalStudyDays: StudyRestDay[];
  }) =>
    apiRequest<{ plan: StudyPlanPreview }>("/profile/schedule-preview", {
      body: JSON.stringify(input),
      method: "POST"
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
