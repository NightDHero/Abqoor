import type { NextFunction, Request, Response } from "express";
import { requireAdmin } from "../admin.middleware.js";

export const requireImportAdmin = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  requireAdmin(request, response, next);
};
