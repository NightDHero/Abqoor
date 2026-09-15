import { randomUUID } from "node:crypto";
import { getQuestions, isCorrectAnswer } from "../questions/question.service.js";
import type { CorrectAnswer, Question } from "../questions/question.types.js";
import { recordWrongAnswerReview } from "../review/review.service.js";
import {
  countSessionAnswers,
  createSession,
  findSessionAnswer,
  findUserAnswerHistory,
  findSession,
  markSessionCompleted,
  runSessionLifecycleTransaction,
  saveSessionAnswerAndThen
} from "./session.repository.js";
import type { SessionRecord } from "./session.repository.js";
import { recordExamResultAfterCompletion } from "./session-analytics.service.js";
import type {
  InternalSessionQuestion,
  SessionAnswer,
  SessionQuestion,
  SessionResult
} from "./session.types.js";

const bootstrapQuestionIds = Array.from({ length: 49 }, (_value, index) => {
  return `Q-${String(index + 1).padStart(3, "0")}`;
});
const adaptiveSessionQuestionLimit = 15;
const minimumSessionQuestionLimit = 1;
const maxActiveDurationSecondsPerAnswer = 24 * 60 * 60;

export class SessionError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

const toSessionQuestion = (question: Question): InternalSessionQuestion => ({
  id: question.id,
  questionImageUrl: question.questionImageUrl,
  correctAnswer: question.correctAnswer,
  subject: question.subject,
  subjectId: question.subjectId,
  topic: question.topic,
  topicId: question.topicId,
  subtopicId: question.subtopicId,
  difficulty: question.difficulty,
  difficultyScore: question.difficultyScore
});

const toPublicQuestion = (question: InternalSessionQuestion): SessionQuestion => ({
  id: question.id,
  questionImageUrl: question.questionImageUrl,
  subject: question.subject,
  subjectId: question.subjectId,
  topic: question.topic,
  topicId: question.topicId,
  subtopicId: question.subtopicId,
  difficulty: question.difficulty,
  difficultyScore: question.difficultyScore
});

const getBootstrapQuestions = async () => {
  const questionsById = new Map(
    (await getQuestions({}))
      .filter((question) => question.source === "pdf")
      .map((question) => [question.id, question] as const)
  );

  const questions = bootstrapQuestionIds
    .map((questionId) => questionsById.get(questionId))
    .filter((question): question is Question => question !== undefined);

  if (questions.length !== bootstrapQuestionIds.length) {
    throw new SessionError(
      "Learning sessions require the 49-question bootstrap dataset.",
      409
    );
  }

  return questions.map(toSessionQuestion);
};

const shuffle = <T>(items: T[]) => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

const groupByTopic = (questions: InternalSessionQuestion[]) => {
  return questions.reduce((groups, question) => {
    const existing = groups.get(question.topic) ?? [];
    existing.push(question);
    groups.set(question.topic, existing);
    return groups;
  }, new Map<string, InternalSessionQuestion[]>());
};

const parseQuestionOrder = (questionOrder: string) => {
  try {
    const parsed = JSON.parse(questionOrder) as unknown;
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
};

const normalizeActiveDurationSeconds = (value: unknown) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new SessionError("activeDurationSeconds must be a non-negative number.");
  }

  return Math.min(
    Math.round(value),
    maxActiveDurationSecondsPerAnswer
  );
};

const getSessionQuestionIds = (questionOrder: string) => {
  const selectedQuestionIds = parseQuestionOrder(questionOrder);
  return selectedQuestionIds.length > 0 ? selectedQuestionIds : bootstrapQuestionIds;
};

const buildQuestionHistory = async (userId: string) => {
  const history = new Map<string, { attempts: number; lastIsCorrect: boolean }>();

  for (const answer of await findUserAnswerHistory(userId)) {
    const existing = history.get(answer.question_id);

    history.set(answer.question_id, {
      attempts: (existing?.attempts ?? 0) + 1,
      lastIsCorrect: answer.is_correct === 1
    });
  }

  return history;
};

const selectAdaptiveQuestions = async (
  questions: InternalSessionQuestion[],
  userId: string,
  questionLimit = adaptiveSessionQuestionLimit
) => {
  const history = await buildQuestionHistory(userId);
  const hasHistory = history.size > 0;
  const groupedQuestions = groupByTopic(questions);
  const topicBuckets = [...groupedQuestions.values()].map((topicQuestions) => {
    if (!hasHistory) {
      return shuffle(topicQuestions);
    }

    return shuffle(topicQuestions).sort((left, right) => {
      const leftHistory = history.get(left.id);
      const rightHistory = history.get(right.id);
      const getPriority = (questionHistory: typeof leftHistory) => {
        if (!questionHistory) {
          return 4;
        }

        return questionHistory.lastIsCorrect ? 1 : 5;
      };

      return getPriority(rightHistory) - getPriority(leftHistory);
    });
  });
  const selectedQuestions: InternalSessionQuestion[] = [];

  while (
    selectedQuestions.length < questionLimit &&
    topicBuckets.some((bucket) => bucket.length > 0)
  ) {
    for (const bucket of topicBuckets) {
      const nextQuestion = bucket.shift();

      if (!nextQuestion) {
        continue;
      }

      if (!selectedQuestions.some((question) => question.id === nextQuestion.id)) {
        selectedQuestions.push(nextQuestion);
      }

      if (selectedQuestions.length >= questionLimit) {
        break;
      }
    }
  }

  return selectedQuestions;
};

const getBootstrapQuestionById = async (questionId: string) => {
  if (!bootstrapQuestionIds.includes(questionId)) {
    return null;
  }

  const question = (await getQuestions({})).find(
    (candidate) => candidate.id === questionId && candidate.source === "pdf"
  );

  return question ? toSessionQuestion(question) : null;
};

const getOwnedSession = async (sessionId: string, userId: string) => {
  const session = await findSession(sessionId);

  if (!session || session.user_id !== userId) {
    throw new SessionError("Session not found.", 404);
  }

  return session;
};

const calculateResult = async (
  sessionId: string,
  totalQuestions: number
): Promise<SessionResult> => {
  const { answeredQuestions, correctAnswers } = await countSessionAnswers(sessionId);
  const incorrectAnswers = answeredQuestions - correctAnswers;
  const finalScorePercentage =
    answeredQuestions === 0
      ? 0
      : Math.round((correctAnswers / answeredQuestions) * 100);

  return {
    sessionId,
    totalQuestions,
    answeredQuestions,
    correctAnswers,
    incorrectAnswers,
    unansweredQuestions: Math.max(totalQuestions - answeredQuestions, 0),
    finalScorePercentage
  };
};

const completeSessionIfReady = (
  session: SessionRecord,
  totalQuestions: number
) => {
  return (async () => {
    const result = await calculateResult(session.session_id, totalQuestions);

    if (result.answeredQuestions !== result.totalQuestions) {
      return;
    }

    const examResult = await recordExamResultAfterCompletion(session, result);
    if (examResult) {
      await markSessionCompleted(session.session_id);
    }
  })();
};

export const startLearningSession = async (
  userId: string,
  options: { questionLimit?: number } = {}
) => {
  const questionLimit = options.questionLimit ?? adaptiveSessionQuestionLimit;

  if (
    !Number.isInteger(questionLimit) ||
    questionLimit < minimumSessionQuestionLimit ||
    questionLimit > adaptiveSessionQuestionLimit
  ) {
    throw new SessionError(
      `questionLimit must be an integer from ${minimumSessionQuestionLimit} to ${adaptiveSessionQuestionLimit}.`
    );
  }

  const questions = await getBootstrapQuestions();
  const selectedQuestions = await selectAdaptiveQuestions(
    questions,
    userId,
    questionLimit
  );
  const now = new Date().toISOString();
  const session = await createSession({
    sessionId: randomUUID(),
    userId,
    questionOrder: selectedQuestions.map((question) => question.id),
    createdAt: now,
    updatedAt: now,
    status: "active"
  });

  if (!session) {
    throw new SessionError("Session creation failed.", 500);
  }

  return {
    sessionId: session.session_id,
    questions: selectedQuestions.map(toPublicQuestion),
    totalQuestions: selectedQuestions.length
  };
};

export const submitSessionAnswer = async (
  userId: string,
  input: {
    sessionId: string;
    questionId: string;
    userAnswer: unknown;
    activeDurationSeconds?: unknown;
  }
) => {
  if (!input.sessionId.trim()) {
    throw new SessionError("sessionId is required.");
  }

  if (!input.questionId.trim()) {
    throw new SessionError("questionId is required.");
  }

  if (!isCorrectAnswer(input.userAnswer)) {
    throw new SessionError("userAnswer must be one of A, B, C, D.");
  }

  const session = await getOwnedSession(input.sessionId, userId);

  if (session.status === "completed") {
    throw new SessionError("Completed sessions cannot be modified.", 409);
  }

  const sessionQuestionIds = getSessionQuestionIds(session.question_order);
  const currentResult = await calculateResult(
    session.session_id,
    sessionQuestionIds.length
  );

  if (currentResult.answeredQuestions === currentResult.totalQuestions) {
    await runSessionLifecycleTransaction(() =>
      completeSessionIfReady(session, sessionQuestionIds.length)
    );
    throw new SessionError("Completed sessions cannot be modified.", 409);
  }

  if (!sessionQuestionIds.includes(input.questionId)) {
    throw new SessionError("Question is not part of this session.", 404);
  }

  if (await findSessionAnswer(session.session_id, input.questionId)) {
    throw new SessionError("Question has already been answered.", 409);
  }

  const question = await getBootstrapQuestionById(input.questionId);

  if (!question) {
    throw new SessionError("Question is not part of this session.", 404);
  }

  const userAnswer = input.userAnswer as CorrectAnswer;
  const activeDurationSeconds = normalizeActiveDurationSeconds(
    input.activeDurationSeconds
  );
  const answer: SessionAnswer = {
    questionId: input.questionId,
    userAnswer,
    correctAnswer: question.correctAnswer,
    isCorrect: userAnswer === question.correctAnswer,
    activeDurationSeconds,
    answeredAt: new Date().toISOString()
  };

  const saved = await saveSessionAnswerAndThen(
    {
      sessionId: session.session_id,
      questionId: answer.questionId,
      userAnswer: answer.userAnswer,
      isCorrect: answer.isCorrect,
      activeDurationSeconds: answer.activeDurationSeconds,
      createdAt: answer.answeredAt
    },
    async () => {
      if (!answer.isCorrect) {
        await recordWrongAnswerReview(userId, answer.questionId);
      }

      await completeSessionIfReady(session, sessionQuestionIds.length);
    }
  );

  if (!saved) {
    throw new SessionError("Question has already been answered.", 409);
  }

  return {
    sessionId: session.session_id,
    ...answer
  };
};

export const getSessionResult = async (userId: string, sessionId: string) => {
  if (!sessionId.trim()) {
    throw new SessionError("sessionId is required.");
  }

  const session = await getOwnedSession(sessionId, userId);
  const result = await calculateResult(
    session.session_id,
    getSessionQuestionIds(session.question_order).length
  );

  return result;
};
