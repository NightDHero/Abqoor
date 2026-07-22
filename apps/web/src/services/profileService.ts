import type { StudentProfile, StudentProfileInput } from "../types/profile";
import { apiRequest } from "./http";

type ProfileResponse = {
  profile: StudentProfile;
};

export const profileService = {
  getProfile: () => apiRequest<ProfileResponse>("/profile"),
  saveProfile: (input: StudentProfileInput) =>
    apiRequest<ProfileResponse>("/profile", {
      body: JSON.stringify(input),
      method: "PUT"
    })
};
