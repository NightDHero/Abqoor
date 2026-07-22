import type { NextFunction, Request, Response } from "express";
import { env } from "../../../config/env.js";
import { requireAuth } from "../../auth/auth.middleware.js";

export const requireImportAdmin = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  requireAuth(request, response, () => {
    const email = request.user?.email.toLowerCase();

    if (!email || !env.adminEmails.includes(email)) {
      response.status(403).json({ message: "Admin import access required." });
      return;
    }

    next();
  });
};
