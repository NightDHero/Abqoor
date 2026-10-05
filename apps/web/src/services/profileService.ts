import type {
  StudentProfile,
  StudentProfileInput,
  StudyPlanPreview,
  StudyRestDay
} from "../types/profile";
import { apiRequest } from "./http";
import { invalidateStudyProgressCache } from "../features/career/studyProgressCache";

type ProfileResponse = {
  profile: StudentProfile;
};

export const profileService = {
  getProfile: () => apiRequest<ProfileResponse>("/profile"),
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
    invalidateStudyProgressCache();
    return response;
  }
};
