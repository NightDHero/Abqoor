import cookieParser from "cookie-parser";
import cors from "cors";
import type { ErrorRequestHandler } from "express";
import express from "express";
import { env } from "./config/env.js";
import { importerRouter } from "./modules/admin/importer/importer.routes.js";
import { validationRouter } from "./modules/admin/validation/validation.routes.js";
import { requireAuth } from "./modules/auth/auth.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { coreRouter } from "./modules/core/core.routes.js";
import { examRouter } from "./modules/exams/exam.routes.js";
import {
  ensureQuestionMediaDirectory,
  questionImagesPublicPath,
  questionMediaDirectory
} from "./modules/media/media.service.js";
import { profileRouter } from "./modules/profile/profile.routes.js";
import { requireCompletedProfile } from "./modules/profile/profile.middleware.js";
import { questionRouter } from "./modules/questions/question.routes.js";
import { reviewRouter } from "./modules/review/review.routes.js";
import { sessionRouter } from "./modules/sessions/session.routes.js";

const jsonErrorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ message: "Invalid JSON request body." });
    return;
  }

  next(error);
};

export const createApp = () => {
  const app = express();

  if (env.isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.frontendOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin is not allowed by CORS."));
      },
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  ensureQuestionMediaDirectory();
  app.use(questionImagesPublicPath, express.static(questionMediaDirectory));

  app.use(coreRouter);
  app.use("/auth", authRouter);
  app.use("/profile", profileRouter);
  app.use("/questions", requireAuth, requireCompletedProfile, questionRouter);
  app.use("/review", requireAuth, requireCompletedProfile, reviewRouter);
  app.use("/sessions", requireAuth, requireCompletedProfile, sessionRouter);
  app.use("/exams", requireAuth, requireCompletedProfile, examRouter);
  app.use("/admin/import", importerRouter);
  app.use("/admin/validation", validationRouter);
  app.use(jsonErrorHandler);

  return app;
};
