import { createReadStream, existsSync, statSync } from "node:fs";
import { Router, type NextFunction, type Request, type Response } from "express";
import { env } from "../../config/env.js";
import { findQuestionById } from "../questions/question.repository.js";
import {
  getLegacyQuestionImagePath,
  getQuestionImagePath,
  isValidQuestionImageAccess,
  questionImagesPublicPath
} from "./media.service.js";
import {
  contentTypeForKey,
  objectStorage
} from "../storage/object-storage.service.js";
import { requireAuth } from "../auth/auth.middleware.js";

export const mediaRouter = Router();

const questionImagePattern = /^([A-Za-z0-9-]+)\.(png|webp)$/;
const publicPreviewQuestionIds = new Set(["Q-034"]);

const requireQuestionImageAccess = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const match = questionImagePattern.exec(String(request.params.fileName));
  if (match && publicPreviewQuestionIds.has(match[1])) {
    next();
    return;
  }
  requireAuth(request, response, next);
};

mediaRouter.get(`${questionImagesPublicPath}/:fileName`, requireQuestionImageAccess, async (request, response, next) => {
  try {
    const match = questionImagePattern.exec(String(request.params.fileName));
    if (!match) {
      response.status(404).json({ message: "Question image not found." });
      return;
    }

    const questionId = match[1];
    if (
      !publicPreviewQuestionIds.has(questionId) &&
      !isValidQuestionImageAccess(
        questionId,
        request.query.expires,
        request.query.signature
      )
    ) {
      response.status(403).json({ message: "Question image access is not valid." });
      return;
    }
    const question = await findQuestionById(questionId);
    if (!question && env.isProduction) {
      response.status(404).json({ message: "Question image not found." });
      return;
    }

    if (question?.image_storage_key) {
      const storedImage = await objectStorage.getObject(question.image_storage_key);
      if (storedImage) {
        response.setHeader(
          "content-type",
          storedImage.contentType ?? contentTypeForKey(question.image_storage_key)
        );
        if (storedImage.contentLength !== undefined) {
          response.setHeader("content-length", String(storedImage.contentLength));
        }
        response.setHeader(
          "cache-control",
          publicPreviewQuestionIds.has(questionId)
            ? "public, max-age=300"
            : "private, no-store"
        );
        storedImage.body.pipe(response);
        return;
      }

      if (env.isProduction) {
        response.status(404).json({ message: "Question image not found." });
        return;
      }
    }

    const requestedPath =
      match[2] === "png"
        ? getLegacyQuestionImagePath(questionId)
        : getQuestionImagePath(questionId);
    const fallbackPath = existsSync(requestedPath)
      ? requestedPath
      : existsSync(getQuestionImagePath(questionId))
        ? getQuestionImagePath(questionId)
        : getLegacyQuestionImagePath(questionId);

    if (!existsSync(fallbackPath)) {
      response.status(404).json({ message: "Question image not found." });
      return;
    }

    const stats = statSync(fallbackPath);
    response.setHeader("content-type", contentTypeForKey(fallbackPath));
    response.setHeader("content-length", String(stats.size));
    response.setHeader(
      "cache-control",
      publicPreviewQuestionIds.has(questionId)
        ? "public, max-age=300"
        : "private, no-store"
    );
    createReadStream(fallbackPath).pipe(response);
  } catch (error) {
    next(error);
  }
});
