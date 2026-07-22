import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";
import { isStudentProfileCompleted } from "../profile/profile.repository.js";
import { getUserFromToken } from "./auth.service.js";
import type { PublicUser } from "./auth.types.js";
import { toPublicUser } from "./auth.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export const requireAuth = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const token = request.cookies?.[env.sessionCookieName];

  if (!token) {
    response.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const user = getUserFromToken(token);

    if (!user) {
      response.status(401).json({ message: "Authentication required." });
      return;
    }

    request.user = toPublicUser(user, isStudentProfileCompleted(user.id));
    next();
  } catch {
    response.status(401).json({ message: "Authentication required." });
  }
};
