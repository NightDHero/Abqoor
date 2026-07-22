import type { NextFunction, Request, Response } from "express";

export const requireCompletedProfile = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  if (!request.user?.profileCompleted) {
    response.status(403).json({
      message: "يجب إكمال إعداد الملف الدراسي قبل استخدام هذه الميزة."
    });
    return;
  }

  next();
};
