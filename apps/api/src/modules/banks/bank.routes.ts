import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { bankConfig } from "./bank-config.js";

export const bankRouter = Router();

bankRouter.get("/config", requireAuth, (_request, response) => {
  response.status(200).json({ config: bankConfig });
});
