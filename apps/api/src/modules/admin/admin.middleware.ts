import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { isUserAdministrator } from "./admin.service.js";

export const requireAdmin = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  requireAuth(request, response, () => {
    const user = request.user;

    if (!user || !isUserAdministrator(user.id, user.email)) {
      response.status(403).json({ message: "Admin access required." });
      return;
    }

    next();
  });
};
