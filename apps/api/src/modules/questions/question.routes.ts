import { Router } from "express";
import {
  getQuestion,
  getQuestions,
  isQuestionSubjectId,
  isSubject,
  toDifficulty
} from "./question.service.js";

export const questionRouter = Router();

questionRouter.get("/", (request, response) => {
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

  const questions = getQuestions({
    subject: subject,
    subjectId: typeof subjectId === "string" ? subjectId : undefined,
    topic: typeof topic === "string" ? topic : undefined,
    topicId: typeof topicId === "string" ? topicId : undefined,
    subtopicId: typeof subtopicId === "string" ? subtopicId : undefined,
    difficulty: parsedDifficulty ?? undefined,
    difficultyScore: parsedDifficultyScore ?? undefined
  });

  response.status(200).json({ questions });
});

questionRouter.get("/:id", (request, response) => {
  const question = getQuestion(request.params.id);

  if (!question) {
    response.status(404).json({ message: "Question not found." });
    return;
  }

  response.status(200).json({ question });
});
