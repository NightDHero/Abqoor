import { Router, type Response } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  addReviewQuestion,
  getReviewBank,
  removeReviewQuestion,
  ReviewError
} from "./review.service.js";
import { isReviewSource } from "./review.types.js";

export const reviewRouter = Router();

const handleReviewError = (error: unknown, response: Response) => {
  if (error instanceof ReviewError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  response.status(500).json({ message: "Review Bank request failed." });
};

reviewRouter.get("/", requireAuth, (request, response) => {
  try {
    response.status(200).json(getReviewBank(request.user?.id ?? ""));
  } catch (error) {
    handleReviewError(error, response);
  }
});

reviewRouter.post("/", requireAuth, (request, response) => {
  try {
    const body = (request.body ?? {}) as {
      questionId?: unknown;
      source?: unknown;
    };

    if (typeof body.questionId !== "string") {
      throw new ReviewError("questionId is required.");
    }

    if (!isReviewSource(body.source)) {
      throw new ReviewError("source must be manual or wrong_answer.");
    }

    response
      .status(201)
      .json(addReviewQuestion(request.user?.id ?? "", body.questionId, body.source));
  } catch (error) {
    handleReviewError(error, response);
  }
});

reviewRouter.delete("/:id", requireAuth, (request, response) => {
  try {
    const reviewItemId = request.params.id;

    if (typeof reviewItemId !== "string") {
      throw new ReviewError("reviewItemId is required.");
    }

    removeReviewQuestion(request.user?.id ?? "", reviewItemId);
    response.status(204).send();
  } catch (error) {
    handleReviewError(error, response);
  }
});
