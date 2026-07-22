import { randomUUID } from "node:crypto";
import { db } from "../../database/client.js";
import type { CorrectAnswer } from "../questions/question.types.js";
import type {
  OfficialExamCategory,
  OfficialExamQuestionRecord,
  OfficialExamRecord,
  OfficialExamResultRecord,
  OfficialExamSectionRecord,
  OfficialExamSectionStatus,
  OfficialExamStatus
} from "./exam-mode.types.js";

const examQuestionSelect = `
  SELECT
    official_exam_questions.exam_id,
    official_exam_questions.section_number,
    official_exam_questions.position_in_section,
    official_exam_questions.global_position,
    official_exam_questions.category,
    official_exam_questions.question_id,
    official_exam_questions.user_answer,
    official_exam_questions.flagged,
    official_exam_questions.answered_at,
    official_exam_questions.updated_at,
    questions.question_image_url,
    questions.correct_answer,
    questions.subject,
    questions.subject_id,
    questions.topic,
    questions.topic_id,
    questions.subtopic,
    questions.subtopic_id,
    questions.difficulty,
    questions.difficulty_score
  FROM official_exam_questions
  INNER JOIN questions ON questions.id = official_exam_questions.question_id
`;

const createExamStatement = db.prepare(`
  INSERT INTO official_exams (
    id,
    user_id,
    status,
    current_section,
    started_at,
    completed_at,
    created_at,
    updated_at
  )
  VALUES (
    @id,
    @userId,
    @status,
    @currentSection,
    @startedAt,
    NULL,
    @createdAt,
    @updatedAt
  )
`);

const insertSectionStatement = db.prepare(`
  INSERT INTO official_exam_sections (
    exam_id,
    section_number,
    status,
    started_at,
    completed_at
  )
  VALUES (
    @examId,
    @sectionNumber,
    @status,
    @startedAt,
    NULL
  )
`);

const insertQuestionStatement = db.prepare(`
  INSERT INTO official_exam_questions (
    exam_id,
    section_number,
    position_in_section,
    global_position,
    category,
    question_id,
    user_answer,
    flagged,
    answered_at,
    updated_at
  )
  VALUES (
    @examId,
    @sectionNumber,
    @positionInSection,
    @globalPosition,
    @category,
    @questionId,
    NULL,
    0,
    NULL,
    @updatedAt
  )
`);

const findExamStatement = db.prepare<string, OfficialExamRecord>(`
  SELECT
    id,
    user_id,
    status,
    current_section,
    started_at,
    completed_at,
    created_at,
    updated_at
  FROM official_exams
  WHERE id = ?
`);

const findSectionsStatement = db.prepare<string, OfficialExamSectionRecord>(`
  SELECT
    exam_id,
    section_number,
    status,
    started_at,
    completed_at
  FROM official_exam_sections
  WHERE exam_id = ?
  ORDER BY section_number ASC
`);

const findQuestionsStatement = db.prepare<string, OfficialExamQuestionRecord>(`
  ${examQuestionSelect}
  WHERE official_exam_questions.exam_id = ?
  ORDER BY official_exam_questions.global_position ASC
`);

const updateAnswerStatement = db.prepare(`
  UPDATE official_exam_questions
  SET
    user_answer = @userAnswer,
    answered_at = @answeredAt,
    updated_at = @updatedAt
  WHERE exam_id = @examId
    AND section_number = @sectionNumber
    AND position_in_section = @positionInSection
`);

const updateFlagStatement = db.prepare(`
  UPDATE official_exam_questions
  SET
    flagged = @flagged,
    updated_at = @updatedAt
  WHERE exam_id = @examId
    AND section_number = @sectionNumber
    AND position_in_section = @positionInSection
`);

const updateExamStatement = db.prepare(`
  UPDATE official_exams
  SET
    status = @status,
    current_section = @currentSection,
    completed_at = @completedAt,
    updated_at = @updatedAt
  WHERE id = @examId
`);

const updateSectionStatement = db.prepare(`
  UPDATE official_exam_sections
  SET
    status = @status,
    started_at = COALESCE(started_at, @startedAt),
    completed_at = @completedAt
  WHERE exam_id = @examId
    AND section_number = @sectionNumber
`);

const insertResultStatement = db.prepare(`
  INSERT INTO official_exam_results (
    id,
    exam_id,
    user_id,
    math_score,
    arabic_score,
    final_score,
    section_1_score,
    section_2_score,
    section_3_score,
    section_4_score,
    section_5_score,
    created_at
  )
  VALUES (
    @id,
    @examId,
    @userId,
    @mathScore,
    @arabicScore,
    @finalScore,
    @section1Score,
    @section2Score,
    @section3Score,
    @section4Score,
    @section5Score,
    @createdAt
  )
  ON CONFLICT(exam_id) DO NOTHING
`);

const findResultByExamIdStatement = db.prepare<string, OfficialExamResultRecord>(`
  SELECT
    id,
    exam_id,
    user_id,
    math_score,
    arabic_score,
    final_score,
    section_1_score,
    section_2_score,
    section_3_score,
    section_4_score,
    section_5_score,
    created_at
  FROM official_exam_results
  WHERE exam_id = ?
`);

const findOfficialResultsByUserStatement = db.prepare<
  string,
  OfficialExamResultRecord
>(`
  SELECT
    id,
    exam_id,
    user_id,
    math_score,
    arabic_score,
    final_score,
    section_1_score,
    section_2_score,
    section_3_score,
    section_4_score,
    section_5_score,
    created_at
  FROM official_exam_results
  WHERE user_id = ?
  ORDER BY created_at DESC
`);

const findOfficialResultByIdForUserStatement = db.prepare<
  { id: string; userId: string },
  OfficialExamResultRecord
>(`
  SELECT
    id,
    exam_id,
    user_id,
    math_score,
    arabic_score,
    final_score,
    section_1_score,
    section_2_score,
    section_3_score,
    section_4_score,
    section_5_score,
    created_at
  FROM official_exam_results
  WHERE id = @id
    AND user_id = @userId
`);

export const createOfficialExam = (input: {
  examId: string;
  userId: string;
  questions: Array<{
    sectionNumber: number;
    positionInSection: number;
    globalPosition: number;
    category: OfficialExamCategory;
    questionId: string;
  }>;
}) => {
  const now = new Date().toISOString();
  const create = db.transaction(() => {
    createExamStatement.run({
      createdAt: now,
      currentSection: 1,
      id: input.examId,
      startedAt: now,
      status: "active" satisfies OfficialExamStatus,
      updatedAt: now,
      userId: input.userId
    });

    for (let sectionNumber = 1; sectionNumber <= 5; sectionNumber += 1) {
      insertSectionStatement.run({
        examId: input.examId,
        sectionNumber,
        startedAt: sectionNumber === 1 ? now : null,
        status:
          sectionNumber === 1
            ? ("active" satisfies OfficialExamSectionStatus)
            : ("pending" satisfies OfficialExamSectionStatus)
      });
    }

    for (const question of input.questions) {
      insertQuestionStatement.run({
        ...question,
        examId: input.examId,
        updatedAt: now
      });
    }
  });

  create();
  return findOfficialExam(input.examId);
};

export const createOfficialExamId = () => randomUUID();

export const findOfficialExam = (examId: string) => {
  return findExamStatement.get(examId) ?? null;
};

export const findOfficialExamSections = (examId: string) => {
  return findSectionsStatement.all(examId) as OfficialExamSectionRecord[];
};

export const findOfficialExamQuestions = (examId: string) => {
  return findQuestionsStatement.all(examId) as OfficialExamQuestionRecord[];
};

export const updateOfficialExamAnswer = (input: {
  examId: string;
  sectionNumber: number;
  positionInSection: number;
  userAnswer: CorrectAnswer;
}) => {
  const now = new Date().toISOString();
  return updateAnswerStatement.run({
    ...input,
    answeredAt: now,
    updatedAt: now
  }).changes;
};

export const updateOfficialExamFlag = (input: {
  examId: string;
  sectionNumber: number;
  positionInSection: number;
  flagged: boolean;
}) => {
  return updateFlagStatement.run({
    ...input,
    flagged: input.flagged ? 1 : 0,
    updatedAt: new Date().toISOString()
  }).changes;
};

export const runOfficialExamTransaction = <T>(operation: () => T) => {
  const transaction = db.transaction(operation);
  return transaction();
};

export const completeOfficialExamSection = (input: {
  examId: string;
  sectionNumber: number;
  nextSectionNumber?: number;
}) => {
  const now = new Date().toISOString();

  updateSectionStatement.run({
    completedAt: now,
    examId: input.examId,
    sectionNumber: input.sectionNumber,
    startedAt: null,
    status: "completed" satisfies OfficialExamSectionStatus
  });

  if (input.nextSectionNumber) {
    updateSectionStatement.run({
      completedAt: null,
      examId: input.examId,
      sectionNumber: input.nextSectionNumber,
      startedAt: now,
      status: "active" satisfies OfficialExamSectionStatus
    });
    updateExamStatement.run({
      completedAt: null,
      currentSection: input.nextSectionNumber,
      examId: input.examId,
      status: "active" satisfies OfficialExamStatus,
      updatedAt: now
    });
  }
};

export const completeOfficialExam = (input: {
  examId: string;
  currentSection: number;
}) => {
  const now = new Date().toISOString();

  updateSectionStatement.run({
    completedAt: now,
    examId: input.examId,
    sectionNumber: input.currentSection,
    startedAt: null,
    status: "completed" satisfies OfficialExamSectionStatus
  });
  updateExamStatement.run({
    completedAt: now,
    currentSection: input.currentSection,
    examId: input.examId,
    status: "completed" satisfies OfficialExamStatus,
    updatedAt: now
  });
};

export const insertOfficialExamResult = (input: {
  examId: string;
  userId: string;
  mathScore: number;
  arabicScore: number;
  finalScore: number;
  sectionScores: number[];
}) => {
  const existing = findResultByExamIdStatement.get(input.examId);

  if (existing) {
    return existing;
  }

  const record = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    examId: input.examId,
    userId: input.userId,
    mathScore: input.mathScore,
    arabicScore: input.arabicScore,
    finalScore: input.finalScore,
    section1Score: input.sectionScores[0] ?? 0,
    section2Score: input.sectionScores[1] ?? 0,
    section3Score: input.sectionScores[2] ?? 0,
    section4Score: input.sectionScores[3] ?? 0,
    section5Score: input.sectionScores[4] ?? 0
  };

  insertResultStatement.run(record);
  return findResultByExamIdStatement.get(input.examId) ?? null;
};

export const findOfficialExamResultByExamId = (examId: string) => {
  return findResultByExamIdStatement.get(examId) ?? null;
};

export const findOfficialExamResultsByUser = (userId: string) => {
  return findOfficialResultsByUserStatement.all(userId);
};

export const findOfficialExamResultByIdForUser = (
  resultId: string,
  userId: string
) => {
  return (
    findOfficialResultByIdForUserStatement.get({ id: resultId, userId }) ?? null
  );
};
