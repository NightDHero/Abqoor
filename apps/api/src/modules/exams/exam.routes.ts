import { Router, type Response } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { ExamError, getExamHistory, getExamResult } from "./exam.service.js";
import {
  answerOfficialExamQuestion,
  completeOfficialExamSectionFlow,
  flagOfficialExamQuestion,
  getOfficialExam,
  startOfficialExam
} from "./exam-mode.service.js";

export const examRouter = Router();

const handleExamError = (error: unknown, response: Response) => {
  if (error instanceof ExamError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  response.status(500).json({ message: "Exam request failed." });
};

examRouter.get("/history", requireAuth, (request, response) => {
  try {
    response.status(200).json({
      examResults: getExamHistory(request.user?.id ?? "")
    });
  } catch (error) {
    handleExamError(error, response);
  }
});

examRouter.post("/start", requireAuth, (request, response) => {
  try {
    response.status(201).json({
      exam: startOfficialExam(request.user?.id ?? "")
    });
  } catch (error) {
    handleExamError(error, response);
  }
});

examRouter.get("/attempts/:id", requireAuth, (request, response) => {
  try {
    const examId = request.params.id;

    if (typeof examId !== "string") {
      throw new ExamError("Exam attempt id is required.");
    }

    response.status(200).json({
      exam: getOfficialExam(request.user?.id ?? "", examId)
    });
  } catch (error) {
    handleExamError(error, response);
  }
});

examRouter.patch("/attempts/:id/answers", requireAuth, (request, response) => {
  try {
    const examId = request.params.id;
    const body = (request.body ?? {}) as {
      positionInSection?: unknown;
      sectionNumber?: unknown;
      userAnswer?: unknown;
    };

    if (typeof examId !== "string") {
      throw new ExamError("Exam attempt id is required.");
    }

    response.status(200).json({
      exam: answerOfficialExamQuestion(request.user?.id ?? "", {
        examId,
        positionInSection: Number(body.positionInSection),
        sectionNumber: Number(body.sectionNumber),
        userAnswer: body.userAnswer
      })
    });
  } catch (error) {
    handleExamError(error, response);
  }
});

examRouter.patch("/attempts/:id/flags", requireAuth, (request, response) => {
  try {
    const examId = request.params.id;
    const body = (request.body ?? {}) as {
      flagged?: unknown;
      positionInSection?: unknown;
      sectionNumber?: unknown;
    };

    if (typeof examId !== "string") {
      throw new ExamError("Exam attempt id is required.");
    }

    response.status(200).json({
      exam: flagOfficialExamQuestion(request.user?.id ?? "", {
        examId,
        flagged: body.flagged,
        positionInSection: Number(body.positionInSection),
        sectionNumber: Number(body.sectionNumber)
      })
    });
  } catch (error) {
    handleExamError(error, response);
  }
});

examRouter.post(
  "/attempts/:id/sections/:sectionNumber/complete",
  requireAuth,
  (request, response) => {
    try {
      const examId = request.params.id;
      const sectionNumber = Number(request.params.sectionNumber);

      if (typeof examId !== "string") {
        throw new ExamError("Exam attempt id is required.");
      }

      response.status(200).json(
        completeOfficialExamSectionFlow(
          request.user?.id ?? "",
          examId,
          sectionNumber
        )
      );
    } catch (error) {
      handleExamError(error, response);
    }
  }
);

examRouter.get("/:id", requireAuth, (request, response) => {
  try {
    const examId = request.params.id;

    if (typeof examId !== "string") {
      throw new ExamError("Exam result id is required.");
    }

    response.status(200).json({
      examResult: getExamResult(request.user?.id ?? "", examId)
    });
  } catch (error) {
    handleExamError(error, response);
  }
});
