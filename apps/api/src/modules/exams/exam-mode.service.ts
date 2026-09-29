import {
  getQuestions,
  isCorrectAnswer
} from "../questions/question.service.js";
import type { CorrectAnswer, Question } from "../questions/question.types.js";
import {
  completeOfficialExam,
  completeOfficialExamSection,
  createOfficialExam,
  createOfficialExamId,
  findOfficialExam,
  findOfficialExamQuestions,
  findOfficialExamResultByExamId,
  findOfficialExamResultByIdForUser,
  findOfficialExamResultsByUser,
  findOfficialExamSections,
  insertOfficialExamResult,
  runOfficialExamTransaction,
  updateOfficialExamAnswer,
  updateOfficialExamFlag
} from "./exam-mode.repository.js";
import {
  officialExamArabicPerSection,
  officialExamMathPerSection,
  officialExamQuestionsPerSection,
  officialExamSectionCount,
  officialExamSectionDurationSeconds,
  toOfficialExamQuestion,
  toOfficialExamResult,
  type OfficialExam,
  type OfficialExamCategory,
  type OfficialExamQuestionRecord,
  type OfficialExamRecord,
  type OfficialExamResult,
  type OfficialExamResultRecord,
  type OfficialExamTopicScore
} from "./exam-mode.types.js";
import { officialExamStructure } from "./exam-structure.js";

export class OfficialExamError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

const requiredMathQuestions = officialExamSectionCount * officialExamMathPerSection;
const requiredArabicQuestions =
  officialExamSectionCount * officialExamArabicPerSection;

const officialExamTopicDefinitions: Array<{
  subject: OfficialExamCategory;
  topicId: string;
  topicName: string;
}> = [
  { subject: "math", topicId: "arithmetic", topicName: "الحساب" },
  { subject: "math", topicId: "algebra", topicName: "الجبر" },
  { subject: "math", topicId: "geometry", topicName: "الهندسة" },
  {
    subject: "math",
    topicId: "statistics",
    topicName: "الإحصاء والاحتمالات"
  },
  {
    subject: "math",
    topicId: "visual-patterns",
    topicName: "الأنماط الشكلية"
  },
  {
    subject: "math",
    topicId: "quantitative-comparison",
    topicName: "المقارنة الكمية"
  },
  { subject: "math", topicId: "word-problems", topicName: "المسائل اللفظية" },
  {
    subject: "arabic",
    topicId: "verbal-analogy",
    topicName: "التناظر اللفظي"
  },
  {
    subject: "arabic",
    topicId: "sentence-completion",
    topicName: "إكمال الجمل"
  },
  {
    subject: "arabic",
    topicId: "contextual-error",
    topicName: "الخطأ السياقي"
  },
  { subject: "arabic", topicId: "odd-word", topicName: "المفردة الشاذة" },
  {
    subject: "arabic",
    topicId: "reading-comprehension",
    topicName: "استيعاب المقروء"
  }
];

const sortByQuestionId = (questions: Question[]) => {
  return [...questions].sort((left, right) => left.id.localeCompare(right.id));
};

const getOfficialQuestionPools = async () => {
  const allQuestions = sortByQuestionId(await getQuestions({}));
  const mathQuestions = sortByQuestionId(
    allQuestions.filter(
      (question) =>
        question.subjectId === "math" || question.subject === "quantitative"
    )
  );
  const arabicQuestions = sortByQuestionId(
    allQuestions.filter(
      (question) => question.subjectId === "arabic" || question.subject === "verbal"
    )
  );
  if (
    mathQuestions.length < requiredMathQuestions ||
    arabicQuestions.length < requiredArabicQuestions
  ) {
    throw new OfficialExamError(
      `لا يمكن بدء الاختبار: يلزم ${requiredMathQuestions} سؤالاً كمياً و${requiredArabicQuestions} سؤالاً لفظياً على الأقل.`,
      409
    );
  }

  return {
    arabicQuestions: arabicQuestions.slice(0, requiredArabicQuestions),
    mathQuestions: mathQuestions.slice(0, requiredMathQuestions)
  };
};

export const buildOfficialExamQuestionPlan = (
  mathQuestions: Question[],
  arabicQuestions: Question[]
) => {
  if (
    mathQuestions.length !== requiredMathQuestions ||
    arabicQuestions.length !== requiredArabicQuestions
  ) {
    throw new OfficialExamError(
      "تعذر إنشاء توزيع الاختبار الرسمي بالحجم المطلوب.",
      409
    );
  }
  const plannedQuestions: Array<{
    sectionNumber: number;
    positionInSection: number;
    globalPosition: number;
    category: OfficialExamCategory;
    questionId: string;
  }> = [];

  for (let sectionIndex = 0; sectionIndex < officialExamSectionCount; sectionIndex += 1) {
    const sectionNumber = sectionIndex + 1;
    const mathOffset = sectionIndex * officialExamMathPerSection;
    const arabicOffset = sectionIndex * officialExamArabicPerSection;

    for (let index = 0; index < officialExamMathPerSection; index += 1) {
      plannedQuestions.push({
        category: "math",
        globalPosition: sectionIndex * officialExamQuestionsPerSection + index + 1,
        positionInSection: index + 1,
        questionId: mathQuestions[mathOffset + index].id,
        sectionNumber
      });
    }

    for (let index = 0; index < officialExamArabicPerSection; index += 1) {
      plannedQuestions.push({
        category: "arabic",
        globalPosition:
          sectionIndex * officialExamQuestionsPerSection +
          officialExamMathPerSection +
          index +
          1,
        positionInSection: officialExamMathPerSection + index + 1,
        questionId: arabicQuestions[arabicOffset + index].id,
        sectionNumber
      });
    }
  }

  return plannedQuestions;
};

const assertCurrentOfficialExamStructure = (
  sections: Awaited<ReturnType<typeof findOfficialExamSections>>,
  questions: ReturnType<typeof toOfficialExamQuestion>[]
) => {
  const hasExpectedSections =
    sections.length === officialExamSectionCount &&
    sections.every((section, index) => section.section_number === index + 1);
  const hasExpectedQuestions =
    questions.length === officialExamStructure.totalQuestions &&
    new Set(questions.map((question) => question.questionId)).size ===
      officialExamStructure.totalQuestions &&
    questions.every((question, index) => question.globalPosition === index + 1);
  const sectionsAreValid = sections.every((section) => {
    const sectionQuestions = questions.filter(
      (question) => question.sectionNumber === section.section_number
    );
    return (
      sectionQuestions.length === officialExamQuestionsPerSection &&
      sectionQuestions.filter((question) => question.category === "math").length ===
        officialExamMathPerSection &&
      sectionQuestions.filter((question) => question.category === "arabic").length ===
        officialExamArabicPerSection &&
      sectionQuestions.every(
        (question, index) => question.positionInSection === index + 1
      )
    );
  });

  if (!hasExpectedSections || !hasExpectedQuestions || !sectionsAreValid) {
    throw new OfficialExamError(
      "هذا الاختبار محفوظ ببنية قديمة ولا يمكن استئنافه. ابدأ اختباراً جديداً.",
      409
    );
  }
};

const toOfficialExam = async (exam: OfficialExamRecord): Promise<OfficialExam> => {
  const sections = await findOfficialExamSections(exam.id);
  const questions = (await findOfficialExamQuestions(exam.id)).map(
    toOfficialExamQuestion
  );
  const result = await findOfficialExamResultByExamId(exam.id);
  const hasCategoryMismatch = questions.some((question) => {
    if (question.category === "math") {
      return (
        question.subjectId !== "math" &&
        question.subject !== "quantitative"
      );
    }

    return question.subjectId !== "arabic" && question.subject !== "verbal";
  });
  assertCurrentOfficialExamStructure(sections, questions);
  if (hasCategoryMismatch) {
    throw new OfficialExamError(
      "يحتوي الاختبار على تصنيف أسئلة غير متوافق مع بنيته.",
      409
    );
  }

  return {
    id: exam.id,
    isTestMode: false,
    status: exam.status,
    currentSection: exam.current_section,
    sectionDurationSeconds: officialExamSectionDurationSeconds,
    structure: officialExamStructure,
    startedAt: exam.started_at,
    completedAt: exam.completed_at ?? undefined,
    sections: sections.map((section) => ({
      sectionNumber: section.section_number,
      status: section.status,
      startedAt: section.started_at ?? undefined,
      completedAt: section.completed_at ?? undefined,
      questions: questions.filter(
        (question) => question.sectionNumber === section.section_number
      )
    })),
    result: result ? await toOfficialExamResultWithTopics(result) : undefined
  };
};

const getOwnedOfficialExamRecord = async (userId: string, examId: string) => {
  const exam = await findOfficialExam(examId);

  if (!exam || exam.user_id !== userId) {
    throw new OfficialExamError("Exam attempt not found.", 404);
  }

  return exam;
};

const assertWritableCurrentSection = (
  exam: OfficialExamRecord,
  sectionNumber: number,
  positionInSection?: number
) => {
  if (exam.status === "completed") {
    throw new OfficialExamError("Completed exams cannot be modified.", 409);
  }

  if (sectionNumber !== exam.current_section) {
    throw new OfficialExamError("Only the active section can be modified.", 409);
  }

  if (
    positionInSection !== undefined &&
    (!Number.isInteger(positionInSection) ||
      positionInSection < 1 ||
      positionInSection > officialExamQuestionsPerSection)
  ) {
    throw new OfficialExamError(
      `positionInSection must be from 1 to ${officialExamQuestionsPerSection}.`
    );
  }
};

const calculatePercentage = (questions: OfficialExamQuestionRecord[]) => {
  if (questions.length === 0) {
    return 0;
  }

  const correct = questions.filter(
    (question) =>
      question.user_answer !== null &&
      question.user_answer === question.correct_answer
  ).length;

  return Math.round((correct / questions.length) * 100);
};

const questionMatchesTopic = (
  question: OfficialExamQuestionRecord,
  topic: (typeof officialExamTopicDefinitions)[number]
) => {
  return (
    question.category === topic.subject &&
    (question.topic_id === topic.topicId || question.topic === topic.topicName)
  );
};

const calculateTopicScores = (
  questions: OfficialExamQuestionRecord[]
): OfficialExamTopicScore[] => {
  return officialExamTopicDefinitions.map((topic) => {
    const topicQuestions = questions.filter((question) =>
      questionMatchesTopic(question, topic)
    );
    const correctAnswers = topicQuestions.filter(
      (question) =>
        question.user_answer !== null &&
        question.user_answer === question.correct_answer
    ).length;

    return {
      correctAnswers,
      score:
        topicQuestions.length === 0
          ? 0
          : Math.round((correctAnswers / topicQuestions.length) * 100),
      subject: topic.subject,
      topicId: topic.topicId,
      topicName: topic.topicName,
      totalQuestions: topicQuestions.length
    };
  });
};

const toOfficialExamResultWithTopics = async (
  record: OfficialExamResultRecord
): Promise<OfficialExamResult> => {
  return {
    ...toOfficialExamResult(record),
    topicScores: calculateTopicScores(
      await findOfficialExamQuestions(record.exam_id)
    )
  };
};

const calculateOfficialExamResult = async (
  exam: OfficialExamRecord
): Promise<OfficialExamResult> => {
  const questions = await findOfficialExamQuestions(exam.id);
  const mathScore = calculatePercentage(
    questions.filter((question) => question.category === "math")
  );
  const arabicScore = calculatePercentage(
    questions.filter((question) => question.category === "arabic")
  );
  const finalScore = calculatePercentage(questions);
  const sectionScores = Array.from(
    { length: officialExamSectionCount },
    (_value, index) =>
      calculatePercentage(
        questions.filter((question) => question.section_number === index + 1)
      )
  );
  const savedResult = await insertOfficialExamResult({
    arabicScore,
    examId: exam.id,
    finalScore,
    mathScore,
    sectionScores,
    userId: exam.user_id
  });

  if (!savedResult) {
    throw new OfficialExamError("Exam result could not be saved.", 500);
  }

  return toOfficialExamResultWithTopics(savedResult);
};

export const startOfficialExam = async (userId: string) => {
  const { mathQuestions, arabicQuestions } = await getOfficialQuestionPools();
  const examId = createOfficialExamId();
  const exam = await createOfficialExam({
    examId,
    questions: buildOfficialExamQuestionPlan(mathQuestions, arabicQuestions),
    userId
  });

  if (!exam) {
    throw new OfficialExamError("Exam attempt could not be created.", 500);
  }

  return toOfficialExam(exam);
};

export const getOfficialExamStructure = () => officialExamStructure;

export const getOfficialExam = async (userId: string, examId: string) => {
  if (!examId.trim()) {
    throw new OfficialExamError("Exam attempt id is required.");
  }

  return toOfficialExam(await getOwnedOfficialExamRecord(userId, examId));
};

export const answerOfficialExamQuestion = async (
  userId: string,
  input: {
    examId: string;
    sectionNumber: number;
    positionInSection: number;
    userAnswer: unknown;
  }
) => {
  if (!isCorrectAnswer(input.userAnswer)) {
    throw new OfficialExamError("userAnswer must be one of A, B, C, D.");
  }

  const exam = await getOwnedOfficialExamRecord(userId, input.examId);
  assertWritableCurrentSection(
    exam,
    input.sectionNumber,
    input.positionInSection
  );

  const changes = await updateOfficialExamAnswer({
    examId: exam.id,
    positionInSection: input.positionInSection,
    sectionNumber: input.sectionNumber,
    userAnswer: input.userAnswer as CorrectAnswer
  });

  if (changes === 0) {
    throw new OfficialExamError("Exam question not found.", 404);
  }

  return getOfficialExam(userId, exam.id);
};

export const flagOfficialExamQuestion = async (
  userId: string,
  input: {
    examId: string;
    sectionNumber: number;
    positionInSection: number;
    flagged: unknown;
  }
) => {
  if (typeof input.flagged !== "boolean") {
    throw new OfficialExamError("flagged must be true or false.");
  }

  const exam = await getOwnedOfficialExamRecord(userId, input.examId);
  assertWritableCurrentSection(
    exam,
    input.sectionNumber,
    input.positionInSection
  );

  const changes = await updateOfficialExamFlag({
    examId: exam.id,
    flagged: input.flagged,
    positionInSection: input.positionInSection,
    sectionNumber: input.sectionNumber
  });

  if (changes === 0) {
    throw new OfficialExamError("Exam question not found.", 404);
  }

  return getOfficialExam(userId, exam.id);
};

export const completeOfficialExamSectionFlow = async (
  userId: string,
  examId: string,
  sectionNumber: number
) => {
  const exam = await getOwnedOfficialExamRecord(userId, examId);
  assertWritableCurrentSection(exam, sectionNumber);

  return runOfficialExamTransaction(async () => {
    if (sectionNumber >= officialExamSectionCount) {
      await completeOfficialExam({
        currentSection: sectionNumber,
        examId: exam.id
      });
      const completedExam = await findOfficialExam(exam.id);

      if (!completedExam) {
        throw new OfficialExamError("Exam attempt not found.", 404);
      }

      const result = await calculateOfficialExamResult(completedExam);

      return {
        exam: await toOfficialExam(completedExam),
        result
      };
    }

    await completeOfficialExamSection({
      examId: exam.id,
      nextSectionNumber: sectionNumber + 1,
      sectionNumber
    });

    const updatedExam = await findOfficialExam(exam.id);

    if (!updatedExam) {
      throw new OfficialExamError("Exam attempt not found.", 404);
    }

    return {
      exam: await toOfficialExam(updatedExam)
    };
  });
};

export const getOfficialExamHistory = async (userId: string) => {
  return Promise.all(
    (await findOfficialExamResultsByUser(userId)).map(
      toOfficialExamResultWithTopics
    )
  );
};

export const getOfficialExamResult = async (userId: string, resultId: string) => {
  if (!resultId.trim()) {
    throw new OfficialExamError("Exam result id is required.");
  }

  const result = await findOfficialExamResultByIdForUser(resultId, userId);

  if (!result) {
    throw new OfficialExamError("Exam result not found.", 404);
  }

  return toOfficialExamResultWithTopics(result);
};
