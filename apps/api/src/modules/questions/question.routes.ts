import { Router } from "express";
import {
  evaluateStudentAnswer,
  getStudentQuestion,
  getStudentQuestions,
  isQuestionSubjectId,
  isSubject,
  toDifficulty
} from "./question.service.js";
import { asyncHandler } from "../security/async-handler.js";

export const questionRouter = Router();

questionRouter.get("/", asyncHandler(async (request, response) => {
  const subject = request.query.subject;
  const subjectId = request.query.subjectId;
  const topic = request.query.topic;
  const topicId = request.query.topicId;
  const subtopicId = request.query.subtopicId;
  const difficulty = request.query.difficulty;
  const difficultyScore = request.query.difficultyScore;

  const parsedDifficulty =
    difficulty === undefined ? undefined : toDifficulty(difficulty);
  const parsedDifficultyScore =
    difficultyScore === undefined ? undefined : toDifficulty(difficultyScore);

  if (subject !== undefined && !isSubject(subject)) {
    response.status(400).json({ message: "subject must be quantitative or verbal." });
    return;
  }

  if (subjectId !== undefined && !isQuestionSubjectId(subjectId)) {
    response.status(400).json({ message: "subjectId must be math or arabic." });
    return;
  }

  if (difficulty !== undefined && parsedDifficulty === null) {
    response.status(400).json({ message: "difficulty must be an integer from 1 to 10." });
    return;
  }

  if (difficultyScore !== undefined && parsedDifficultyScore === null) {
    response.status(400).json({ message: "difficultyScore must be an integer from 1 to 10." });
    return;
  }

  const questions = await getStudentQuestions({
    subject: subject,
    subjectId: typeof subjectId === "string" ? subjectId : undefined,
    topic: typeof topic === "string" ? topic : undefined,
    topicId: typeof topicId === "string" ? topicId : undefined,
    subtopicId: typeof subtopicId === "string" ? subtopicId : undefined,
    difficulty: parsedDifficulty ?? undefined,
    difficultyScore: parsedDifficultyScore ?? undefined
  });

  response.status(200).json({ questions });
}));

questionRouter.get("/:id", asyncHandler(async (request, response) => {
  const question = await getStudentQuestion(String(request.params.id));

  if (!question) {
    response.status(404).json({ message: "Question not found." });
    return;
  }

  response.status(200).json({ question });
}));

questionRouter.post("/:id/answer", asyncHandler(async (request, response) => {
  const result = await evaluateStudentAnswer(
    request.user?.id ?? "",
    String(request.params.id),
    (request.body as { answer?: unknown } | undefined)?.answer
  );
  response.status(200).json(result);
}));
