import type {
  StudentProfile,
  StudentProfileInput,
  StudyPlanPreview,
  StudyRestDay
} from "../types/profile";
import { apiRequest } from "./http";

type ProfileResponse = {
  profile: StudentProfile;
};

export const profileService = {
  getProfile: () => apiRequest<ProfileResponse>("/profile"),
  previewSchedule: (input: {
    studyPlanStartDate: string;
    weeklyRestDay: StudyRestDay;
    weeklyReviewDay: StudyRestDay;
  }) =>
    apiRequest<{ plan: StudyPlanPreview }>("/profile/schedule-preview", {
      body: JSON.stringify(input),
      method: "POST"
    }),
  saveProfile: (input: StudentProfileInput) =>
    apiRequest<ProfileResponse>("/profile", {
      body: JSON.stringify(input),
      method: "PUT"
    })
};
