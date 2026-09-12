import { createReadStream, existsSync, statSync } from "node:fs";
import { Router } from "express";
import { findQuestionById } from "../questions/question.repository.js";
import {
  getLegacyQuestionImagePath,
  getQuestionImagePath,
  questionImagesPublicPath
} from "./media.service.js";
import {
  contentTypeForKey,
  objectStorage
} from "../storage/object-storage.service.js";

export const mediaRouter = Router();

const questionImagePattern = /^([A-Za-z0-9-]+)\.(png|webp)$/;

mediaRouter.get(`${questionImagesPublicPath}/:fileName`, async (request, response, next) => {
  try {
    const match = questionImagePattern.exec(request.params.fileName);
    if (!match) {
      response.status(404).json({ message: "Question image not found." });
      return;
    }

    const questionId = match[1];
    const question = findQuestionById(questionId);

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
        response.setHeader("cache-control", "public, max-age=31536000, immutable");
        storedImage.body.pipe(response);
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
    response.setHeader("cache-control", "public, max-age=86400");
    createReadStream(fallbackPath).pipe(response);
  } catch (error) {
    next(error);
  }
});
