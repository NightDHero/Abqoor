import { Router } from "express";
import { requireImportAdmin } from "../importer/admin-import.middleware.js";
import {
  getValidationQuestions,
  getValidationSummary
} from "./validation.repository.js";

export const validationRouter = Router();

validationRouter.get("/summary", requireImportAdmin, (_request, response) => {
  response.status(200).json(getValidationSummary());
});

validationRouter.get("/questions", requireImportAdmin, (_request, response) => {
  response.status(200).json({ questions: getValidationQuestions() });
});
