import { Router, type Response } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  getStudentProfile,
  ProfileError,
  saveStudentProfile
} from "./profile.service.js";
import type { UpdateStudentProfileInput } from "./profile.types.js";

export const profileRouter = Router();

const handleProfileError = (error: unknown, response: Response) => {
  if (error instanceof ProfileError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  response.status(500).json({ message: "Profile request failed." });
};

profileRouter.get("/", requireAuth, (request, response) => {
  try {
    response.status(200).json({
      profile: getStudentProfile(request.user?.id ?? "")
    });
  } catch (error) {
    handleProfileError(error, response);
  }
});

profileRouter.put("/", requireAuth, (request, response) => {
  try {
    response.status(200).json({
      profile: saveStudentProfile(
        request.user?.id ?? "",
        (request.body ?? {}) as UpdateStudentProfileInput
      )
    });
  } catch (error) {
    handleProfileError(error, response);
  }
});
