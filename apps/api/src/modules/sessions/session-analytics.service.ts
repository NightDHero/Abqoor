import {
  findSessionAnswerAnalytics,
  insertExamResult
} from "./session-analytics.repository.js";
import type { SessionRecord } from "./session.repository.js";
import type { SessionResult } from "./session.types.js";

const toPercentage = (correct: number, total: number) => {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
};

export const recordExamResultAfterCompletion = (
  session: SessionRecord,
  result: SessionResult
) => {
  if (result.answeredQuestions !== result.totalQuestions) {
    return null;
  }

  const answers = findSessionAnswerAnalytics(session.session_id);
  const mathAnswers = answers.filter(
    (answer) => answer.subject === "quantitative"
  );
  const arabicAnswers = answers.filter((answer) => answer.subject === "verbal");
  const mathScore = toPercentage(
    mathAnswers.filter((answer) => answer.is_correct === 1).length,
    mathAnswers.length
  );
  const arabicScore = toPercentage(
    arabicAnswers.filter((answer) => answer.is_correct === 1).length,
    arabicAnswers.length
  );
  const finalScore = (mathScore + arabicScore) / 2;

  return insertExamResult({
    sessionId: session.session_id,
    userId: session.user_id,
    mathScore,
    arabicScore,
    finalScore
  });
};
