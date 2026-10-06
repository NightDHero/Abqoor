import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { isUserAdministrator } from "./admin.service.js";
import { writeSecurityEvent } from "../security/security-audit.service.js";

export const requireAdmin = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  requireAuth(request, response, () => {
    const user = request.user;

    void (async () => {
      if (!user || !(await isUserAdministrator(user.id, user.email))) {
        writeSecurityEvent(request, "authorization.denied", {
          actorUserId: user?.id,
          detail: { area: "admin" },
          outcome: "blocked"
        });
        response.status(403).json({ message: "Admin access required." });
        return;
      }

      next();
    })().catch(() => {
      response.status(500).json({ message: "Admin request failed." });
    });
  });
};

const recentAuthenticationSeconds = 15 * 60;
export const requireRecentAuthentication = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const authenticatedAt = request.authenticatedAt ?? 0;
  if (Math.floor(Date.now() / 1000) - authenticatedAt > recentAuthenticationSeconds) {
    response.status(403).json({
      message: "أعد تسجيل الدخول قبل تنفيذ هذا الإجراء الإداري الحساس."
    });
    return;
  }
  next();
};
