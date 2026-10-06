import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const testDirectory = mkdtempSync(join(tmpdir(), "abqoor-exam-mode-test-"));
process.env.DATABASE_PATH = join(testDirectory, "test.sqlite");
process.env.JWT_SECRET = "exam-mode-test-secret";
process.env.NODE_ENV = "test";

const authService = await import("../src/modules/auth/auth.service.js");
const database = await import("../src/database/client.js");
const examService = await import("../src/modules/exams/exam-mode.service.js");
const { officialExamStructure } = await import(
  "../src/modules/exams/exam-structure.js"
);
const questionService = await import(
  "../src/modules/questions/question.service.js"
);

const user = await authService.registerUser(
  "exam@example.com",
  "correct horse battery"
);

const seedQuestions = async () => {
  for (let index = 1; index <= officialExamStructure.totalMath; index += 1) {
    const id = `Q-EXAM-M-${String(index).padStart(3, "0")}`;
    await questionService.saveQuestion({
      id,
      questionImageUrl: `/question-images/${id}.png`,
      correctAnswer: "A",
      subject: "quantitative",
      subjectId: "math",
      topic: "الحساب",
      topicId: "arithmetic",
      difficulty: 1,
      difficultyScore: 1,
      source: "manual",
      version: 1
    });
  }

  for (let index = 1; index <= officialExamStructure.totalArabic; index += 1) {
    const id = `Q-EXAM-A-${String(index).padStart(3, "0")}`;
    await questionService.saveQuestion({
      id,
      questionImageUrl: `/question-images/${id}.png`,
      correctAnswer: "A",
      subject: "verbal",
      subjectId: "arabic",
      topic: "التناظر اللفظي",
      topicId: "verbal-analogy",
      difficulty: 1,
      difficultyScore: 1,
      source: "manual",
      version: 1
    });
  }
};

test("refuses to create an undersized official exam", async () => {
  await assert.rejects(
    examService.startOfficialExam(user.id),
    (error: unknown) =>
      error instanceof examService.OfficialExamError && error.statusCode === 409
  );
});

test("creates and restores the canonical 120-question distribution", async () => {
  await seedQuestions();
  const exam = await examService.startOfficialExam(user.id);

  assert.deepEqual(exam.structure, officialExamStructure);
  assert.equal(exam.sections.length, officialExamStructure.totalSections);
  assert.equal(
    exam.sections.flatMap((section) => section.questions).length,
    officialExamStructure.totalQuestions
  );
  assert.deepEqual(
    exam.sections.flatMap((section) => section.questions).map((question) => question.globalPosition),
    Array.from({ length: officialExamStructure.totalQuestions }, (_value, index) => index + 1)
  );

  for (const section of exam.sections) {
    assert.equal(section.questions.length, officialExamStructure.questionsPerSection);
    assert.equal(
      section.questions.filter((question) => question.category === "math").length,
      officialExamStructure.mathPerSection
    );
    assert.equal(
      section.questions.filter((question) => question.category === "arabic").length,
      officialExamStructure.arabicPerSection
    );
  }
  assert.ok(exam.sections[0]?.deadlineAt);
  assert.match(
    exam.sections[0]?.questions[0]?.questionImageUrl ?? "",
    /[?&]signature=/
  );
  assert.equal(JSON.stringify(exam).includes("correctAnswer"), false);

  await examService.answerOfficialExamQuestion(user.id, {
    examId: exam.id,
    sectionNumber: 1,
    positionInSection: 1,
    userAnswer: "A"
  });
  await examService.flagOfficialExamQuestion(user.id, {
    examId: exam.id,
    sectionNumber: 1,
    positionInSection: 2,
    flagged: true
  });
  const restored = await examService.getOfficialExam(user.id, exam.id);
  assert.equal(restored.sections[0]?.questions[0]?.userAnswer, "A");
  assert.equal(restored.sections[0]?.questions[1]?.flagged, true);

  await database.db.prepare(`
    UPDATE official_exam_questions
    SET user_answer = CASE WHEN category = 'math' THEN 'A' ELSE 'B' END
    WHERE exam_id = ?
  `).run(exam.id);

  let completion: Awaited<ReturnType<typeof examService.completeOfficialExamSectionFlow>> | null = null;
  for (let section = 1; section <= officialExamStructure.totalSections; section += 1) {
    completion = await examService.completeOfficialExamSectionFlow(
      user.id,
      exam.id,
      section
    );
  }

  assert.ok(completion?.result);
  assert.equal(completion.result.mathScore, 100);
  assert.equal(completion.result.arabicScore, 0);
  assert.equal(completion.result.finalScore, 46);
  assert.deepEqual(completion.result.sectionScores, [46, 46, 46, 46, 46]);
});

test("enforces server deadlines, ownership, active-exam grading isolation, and secure ordering", async () => {
  const exam = await examService.startOfficialExam(user.id);
  const secondExam = await examService.startOfficialExam(user.id);
  const questionIds = exam.sections.flatMap((section) =>
    section.questions.map((question) => question.questionId)
  );
  const secondQuestionIds = secondExam.sections.flatMap((section) =>
    section.questions.map((question) => question.questionId)
  );
  assert.notDeepEqual(secondQuestionIds, questionIds);

  const activeQuestionId = exam.sections[0]?.questions[0]?.questionId;
  assert.ok(activeQuestionId);
  await assert.rejects(
    questionService.evaluateStudentAnswer(user.id, activeQuestionId, "A"),
    (error: unknown) =>
      error instanceof questionService.QuestionError && error.statusCode === 409
  );

  const otherUser = await authService.registerUser(
    "other-exam-user@example.com",
    "correct horse battery"
  );
  await assert.rejects(
    examService.getOfficialExam(otherUser.id, exam.id),
    (error: unknown) =>
      error instanceof examService.OfficialExamError && error.statusCode === 404
  );
  await assert.rejects(
    examService.answerOfficialExamQuestion(user.id, {
      examId: exam.id,
      positionInSection: 999,
      sectionNumber: 1,
      userAnswer: "A"
    }),
    examService.OfficialExamError
  );

  await database.db.prepare(`
    UPDATE official_exam_sections
    SET deadline_at = ?
    WHERE exam_id = ? AND section_number = 1
  `).run("2000-01-01T00:00:00.000Z", exam.id);
  await assert.rejects(
    examService.answerOfficialExamQuestion(user.id, {
      examId: exam.id,
      positionInSection: 1,
      sectionNumber: 1,
      userAnswer: "A"
    }),
    (error: unknown) =>
      error instanceof examService.OfficialExamError && error.statusCode === 409
  );
  await assert.rejects(
    examService.flagOfficialExamQuestion(user.id, {
      examId: exam.id,
      flagged: true,
      positionInSection: 1,
      sectionNumber: 1
    }),
    (error: unknown) =>
      error instanceof examService.OfficialExamError && error.statusCode === 409
  );
});

test("rejects a persisted attempt that no longer matches the canonical structure", async () => {
  const exam = await examService.startOfficialExam(user.id);
  await database.db.prepare(`
    DELETE FROM official_exam_questions
    WHERE exam_id = ? AND global_position = ?
  `).run(exam.id, officialExamStructure.totalQuestions);

  await assert.rejects(
    examService.getOfficialExam(user.id, exam.id),
    (error: unknown) =>
      error instanceof examService.OfficialExamError && error.statusCode === 409
  );
});

after(async () => {
  await database.closeDatabase();
  rmSync(testDirectory, { force: true, recursive: true });
});
