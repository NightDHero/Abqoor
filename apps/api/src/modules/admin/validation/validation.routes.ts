import { Router } from "express";
import { requireImportAdmin } from "../importer/admin-import.middleware.js";
import {
  getValidationQuestions,
  getValidationSummary
} from "./validation.repository.js";

export const validationRouter = Router();

validationRouter.get("/summary", requireImportAdmin, async (_request, response) => {
  response.status(200).json(await getValidationSummary());
});

validationRouter.get("/questions", requireImportAdmin, async (_request, response) => {
  response.status(200).json({ questions: await getValidationQuestions() });
});
