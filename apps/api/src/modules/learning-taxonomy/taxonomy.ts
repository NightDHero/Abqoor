export const learningSubjects = ["math", "arabic"] as const;
export type LearningSubject = (typeof learningSubjects)[number];

export type LegacyQuestionSubject = "quantitative" | "verbal";

export type DifficultyBand = {
  label: "Easy" | "Basic" | "Medium" | "Hard" | "Very Hard";
  max: number;
  min: number;
};

export type SubtopicDefinition = {
  displayNameAr: string;
  slug: string;
};

export type TopicDefinition = {
  displayNameAr: string;
  slug: string;
  subject: LearningSubject;
  subtopics: SubtopicDefinition[];
};

export const difficultyBands: DifficultyBand[] = [
  { label: "Easy", min: 1, max: 2 },
  { label: "Basic", min: 3, max: 4 },
  { label: "Medium", min: 5, max: 6 },
  { label: "Hard", min: 7, max: 8 },
  { label: "Very Hard", min: 9, max: 10 }
];

export const subjectToLegacySubject: Record<
  LearningSubject,
  LegacyQuestionSubject
> = {
  arabic: "verbal",
  math: "quantitative"
};

export const legacySubjectToSubject: Record<
  LegacyQuestionSubject,
  LearningSubject
> = {
  quantitative: "math",
  verbal: "arabic"
};

export const topicTaxonomy: TopicDefinition[] = [
  {
    displayNameAr: "الحساب",
    slug: "arithmetic",
    subject: "math",
    subtopics: [
      { displayNameAr: "العمليات الأساسية", slug: "basic-operations" },
      { displayNameAr: "الكسور والأعداد العشرية", slug: "fractions-decimals" },
      { displayNameAr: "النسب والتناسب", slug: "ratios-proportions" },
      { displayNameAr: "النسبة المئوية", slug: "percentages" },
      { displayNameAr: "القواسم والمضاعفات", slug: "factors-multiples" },
      { displayNameAr: "قابلية القسمة", slug: "divisibility" },
      { displayNameAr: "المتوسطات", slug: "averages" }
    ]
  },
  {
    displayNameAr: "الجبر",
    slug: "algebra",
    subject: "math",
    subtopics: [
      { displayNameAr: "المعادلات والمتباينات", slug: "equations-inequalities" },
      { displayNameAr: "الحدود الجبرية", slug: "algebraic-terms" },
      { displayNameAr: "التحليل", slug: "factoring" },
      { displayNameAr: "الأسس والجذور", slug: "exponents-roots" },
      {
        displayNameAr: "المتتابعات والأنماط العددية",
        slug: "sequences-number-patterns"
      }
    ]
  },
  {
    displayNameAr: "الهندسة",
    slug: "geometry",
    subject: "math",
    subtopics: [
      { displayNameAr: "الزوايا", slug: "angles" },
      { displayNameAr: "المثلثات", slug: "triangles" },
      { displayNameAr: "المضلعات", slug: "polygons" },
      { displayNameAr: "المساحة والمحيط", slug: "area-perimeter" }
    ]
  },
  {
    displayNameAr: "الإحصاء والاحتمالات",
    slug: "statistics",
    subject: "math",
    subtopics: [
      { displayNameAr: "المتوسط", slug: "mean" },
      { displayNameAr: "الوسيط والمنوال", slug: "median-mode" },
      { displayNameAr: "الاحتمالات", slug: "probability" },
      { displayNameAr: "قراءة البيانات", slug: "data-interpretation" }
    ]
  },
  {
    displayNameAr: "الأنماط الشكلية",
    slug: "visual-patterns",
    subject: "math",
    subtopics: [
      { displayNameAr: "الدوران", slug: "rotation" },
      { displayNameAr: "التتابع الشكلي", slug: "visual-sequences" },
      { displayNameAr: "العلاقات البصرية", slug: "visual-relations" }
    ]
  },
  {
    displayNameAr: "المقارنة الكمية",
    slug: "quantitative-comparison",
    subject: "math",
    subtopics: [
      { displayNameAr: "مقارنة القيم", slug: "value-comparison" },
      { displayNameAr: "الاستنتاج العددي", slug: "numerical-reasoning" },
      { displayNameAr: "المقارنة المركبة", slug: "compound-comparison" }
    ]
  },
  {
    displayNameAr: "المسائل اللفظية",
    slug: "word-problems",
    subject: "math",
    subtopics: [
      { displayNameAr: "السرعة والزمن", slug: "speed-time" },
      { displayNameAr: "العمل المشترك", slug: "work-rate" },
      { displayNameAr: "العمر", slug: "age-problems" },
      { displayNameAr: "التناسب", slug: "proportional-reasoning" }
    ]
  },
  {
    displayNameAr: "التناظر اللفظي",
    slug: "verbal-analogy",
    subject: "arabic",
    subtopics: []
  },
  {
    displayNameAr: "إكمال الجمل",
    slug: "sentence-completion",
    subject: "arabic",
    subtopics: []
  },
  {
    displayNameAr: "الخطأ السياقي",
    slug: "contextual-error",
    subject: "arabic",
    subtopics: []
  },
  {
    displayNameAr: "المفردة الشاذة",
    slug: "odd-word",
    subject: "arabic",
    subtopics: []
  },
  {
    displayNameAr: "استيعاب المقروء",
    slug: "reading-comprehension",
    subject: "arabic",
    subtopics: []
  }
];

const normalizeText = (value: string) => value.trim().toLowerCase();

export const isLearningSubject = (value: unknown): value is LearningSubject => {
  return (
    typeof value === "string" &&
    learningSubjects.includes(value as LearningSubject)
  );
};

export const isLegacyQuestionSubject = (
  value: unknown
): value is LegacyQuestionSubject => {
  return value === "quantitative" || value === "verbal";
};

export const toLearningSubject = (
  value: unknown,
  fallbackLegacySubject?: LegacyQuestionSubject
): LearningSubject | null => {
  if (isLearningSubject(value)) {
    return value;
  }

  if (isLegacyQuestionSubject(value)) {
    return legacySubjectToSubject[value];
  }

  return fallbackLegacySubject
    ? legacySubjectToSubject[fallbackLegacySubject]
    : null;
};

export const toLegacyQuestionSubject = (
  subject: LearningSubject
): LegacyQuestionSubject => {
  return subjectToLegacySubject[subject];
};

export const findTopicDefinition = (
  subject: LearningSubject,
  value: string | null | undefined
) => {
  if (!value) {
    return null;
  }

  const normalizedValue = normalizeText(value);
  return (
    topicTaxonomy.find(
      (topic) =>
        topic.subject === subject &&
        (normalizeText(topic.slug) === normalizedValue ||
          normalizeText(topic.displayNameAr) === normalizedValue)
    ) ?? null
  );
};

export const findSubtopicDefinition = (
  topic: TopicDefinition,
  value: string | null | undefined
) => {
  if (!value) {
    return null;
  }

  const normalizedValue = normalizeText(value);
  return (
    topic.subtopics.find(
      (subtopic) =>
        normalizeText(subtopic.slug) === normalizedValue ||
        normalizeText(subtopic.displayNameAr) === normalizedValue
    ) ?? null
  );
};

export const toDifficultyScore = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10
    ? parsed
    : null;
};

export const getDifficultyBand = (difficultyScore: number) => {
  return (
    difficultyBands.find(
      (band) => difficultyScore >= band.min && difficultyScore <= band.max
    ) ?? null
  );
};

export const resolveQuestionClassification = (input: {
  difficulty?: unknown;
  difficultyScore?: unknown;
  legacySubject?: LegacyQuestionSubject;
  subject?: unknown;
  subtopic?: string | null;
  subtopicId?: string | null;
  topic?: string | null;
  topicId?: string | null;
}) => {
  const subjectId = toLearningSubject(input.subject, input.legacySubject);
  const topic = subjectId
    ? findTopicDefinition(subjectId, input.topicId ?? input.topic)
    : null;
  const subtopic = topic
    ? findSubtopicDefinition(topic, input.subtopicId ?? input.subtopic)
    : null;

  return {
    difficultyScore: toDifficultyScore(
      input.difficultyScore ?? input.difficulty
    ),
    subjectId,
    subtopicId: subtopic?.slug ?? null,
    topicId: topic?.slug ?? null
  };
};
