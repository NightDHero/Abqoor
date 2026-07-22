import { Router, type Response } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  getSessionResult,
  SessionError,
  startLearningSession,
  submitSessionAnswer
} from "./session.service.js";

export const sessionRouter = Router();

const handleSessionError = (error: unknown, response: Response) => {
  if (error instanceof SessionError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  response.status(500).json({ message: "Session request failed." });
};

sessionRouter.post("/start", requireAuth, (request, response) => {
  try {
    const body = (request.body ?? {}) as {
      questionLimit?: unknown;
    };
    const questionLimit =
      typeof body.questionLimit === "number" ? body.questionLimit : undefined;
    const session = startLearningSession(request.user?.id ?? "", {
      questionLimit
    });
    response.status(201).json(session);
  } catch (error) {
    handleSessionError(error, response);
  }
});

sessionRouter.post("/submit", requireAuth, (request, response) => {
  try {
    const body = request.body as {
      sessionId?: unknown;
      questionId?: unknown;
      userAnswer?: unknown;
    };

    if (typeof body.sessionId !== "string") {
      throw new SessionError("sessionId is required.");
    }

    if (typeof body.questionId !== "string") {
      throw new SessionError("questionId is required.");
    }

    const result = submitSessionAnswer(request.user?.id ?? "", {
      sessionId: body.sessionId,
      questionId: body.questionId,
      userAnswer: body.userAnswer
    });

    response.status(200).json(result);
  } catch (error) {
    handleSessionError(error, response);
  }
});

sessionRouter.get("/:id/result", requireAuth, (request, response) => {
  try {
    const sessionId = request.params.id;

    if (typeof sessionId !== "string") {
      throw new SessionError("sessionId is required.");
    }

    response
      .status(200)
      .json(getSessionResult(request.user?.id ?? "", sessionId));
  } catch (error) {
    handleSessionError(error, response);
  }
});
