import type {
  CareerWorld,
  CareerWorldId,
  PillarAccent,
  SubtopicPillar,
  TopicPillar
} from "./career.types";

const toTopicRoute = (worldId: CareerWorldId, topicSlug: string) => {
  return `/topic/${worldId}/${topicSlug}`;
};

const toBrowseRoute = (
  worldId: CareerWorldId,
  topicSlug: string,
  subtopicSlug?: string
) => {
  return subtopicSlug
    ? `/browse/${worldId}/${topicSlug}/${subtopicSlug}`
    : `/browse/${worldId}/${topicSlug}`;
};

const createSubtopic = ({
  accent,
  name,
  topicSlug,
  worldId,
  slug
}: {
  accent: PillarAccent;
  name: string;
  topicSlug: string;
  worldId: CareerWorldId;
  slug: string;
}): SubtopicPillar => {
  return {
    accent,
    id: slug,
    masteryPercent: 0,
    name,
    route: toBrowseRoute(worldId, topicSlug, slug),
    routeSlug: slug,
    type: "subtopic"
  };
};

const createTopic = ({
  accent,
  name,
  slug,
  subtopics,
  worldId
}: {
  accent: PillarAccent;
  name: string;
  slug: string;
  subtopics?: Array<{ accent: PillarAccent; name: string; slug: string }>;
  worldId: CareerWorldId;
}): TopicPillar => {
  const practiceRoute = toBrowseRoute(worldId, slug);

  return {
    accent,
    id: slug,
    masteryPercent: 0,
    name,
    practiceRoute,
    route: worldId === "math" ? toTopicRoute(worldId, slug) : practiceRoute,
    routeSlug: slug,
    subtopics: subtopics?.map((subtopic) =>
      createSubtopic({
        ...subtopic,
        topicSlug: slug,
        worldId
      })
    ),
    type: "topic"
  };
};

export const mathTopics: TopicPillar[] = [
  createTopic({
    accent: "turquoise",
    name: "الحساب",
    slug: "arithmetic",
    subtopics: [
      { accent: "turquoise", name: "العمليات الأساسية", slug: "basic-operations" },
      { accent: "cyan", name: "الكسور والأعداد العشرية", slug: "fractions-decimals" },
      { accent: "orange", name: "النسب والتناسب", slug: "ratios-proportions" },
      { accent: "gold", name: "النسبة المئوية", slug: "percentages" },
      { accent: "turquoise", name: "القواسم والمضاعفات", slug: "factors-multiples" },
      { accent: "cyan", name: "قابلية القسمة", slug: "divisibility" },
      { accent: "orange", name: "المتوسطات", slug: "averages" }
    ],
    worldId: "math"
  }),
  createTopic({
    accent: "cyan",
    name: "الجبر",
    slug: "algebra",
    subtopics: [
      { accent: "turquoise", name: "المعادلات والمتباينات", slug: "equations-inequalities" },
      { accent: "cyan", name: "الحدود الجبرية", slug: "algebraic-terms" },
      { accent: "orange", name: "التحليل", slug: "factoring" },
      { accent: "gold", name: "الأسس والجذور", slug: "exponents-roots" },
      { accent: "turquoise", name: "المتتابعات والأنماط العددية", slug: "sequences-number-patterns" }
    ],
    worldId: "math"
  }),
  createTopic({
    accent: "orange",
    name: "الهندسة",
    slug: "geometry",
    subtopics: [
      { accent: "turquoise", name: "المثلثات", slug: "triangles" },
      { accent: "cyan", name: "الزوايا", slug: "angles" },
      { accent: "orange", name: "الدوائر", slug: "circles" },
      { accent: "gold", name: "المضلعات", slug: "polygons" },
      { accent: "turquoise", name: "المحيط والمساحة", slug: "area-perimeter" },
      { accent: "cyan", name: "الحجم", slug: "volume" },
      { accent: "orange", name: "هندسة الإحداثيات", slug: "coordinate-geometry" },
      { accent: "gold", name: "نظرية فيثاغورس", slug: "pythagorean-theorem" }
    ],
    worldId: "math"
  }),
  createTopic({
    accent: "gold",
    name: "الإحصاء والاحتمالات",
    slug: "statistics",
    subtopics: [
      { accent: "turquoise", name: "المتوسط والوسيط والمنوال", slug: "mean-median-mode" },
      { accent: "cyan", name: "المدى", slug: "range" },
      { accent: "orange", name: "عدد المصافحات", slug: "handshakes-count" },
      { accent: "gold", name: "عدد الهدايا", slug: "gifts-count" },
      { accent: "turquoise", name: "عدد المباريات", slug: "matches-count" },
      { accent: "cyan", name: "قراءة الجداول والرسوم البيانية", slug: "tables-graphs" },
      { accent: "orange", name: "الاحتمال البسيط", slug: "simple-probability" },
      { accent: "gold", name: "مبدأ العد", slug: "counting-principle" },
      { accent: "turquoise", name: "التباديل والتوافيق الأساسية", slug: "basic-permutations-combinations" }
    ],
    worldId: "math"
  }),
  createTopic({
    accent: "turquoise",
    name: "الأنماط الشكلية",
    slug: "visual-patterns",
    subtopics: [
      { accent: "turquoise", name: "إكمال الأشكال", slug: "complete-shapes" },
      { accent: "cyan", name: "الدوران", slug: "rotation" },
      { accent: "orange", name: "الانعكاس", slug: "reflection" },
      { accent: "gold", name: "التظليل", slug: "shading" },
      { accent: "turquoise", name: "العلاقات بين الأشكال", slug: "shape-relations" }
    ],
    worldId: "math"
  }),
  createTopic({
    accent: "cyan",
    name: "المقارنة الكمية",
    slug: "quantitative-comparison",
    subtopics: [
      { accent: "turquoise", name: "مقارنة كميتين", slug: "quantity-comparison" },
      { accent: "cyan", name: "المقارنات الجبرية والهندسية", slug: "algebra-geometry-comparisons" }
    ],
    worldId: "math"
  }),
  createTopic({
    accent: "orange",
    name: "المسائل اللفظية",
    slug: "word-problems",
    subtopics: [
      { accent: "turquoise", name: "العمر", slug: "age-problems" },
      { accent: "cyan", name: "الحركة", slug: "motion" },
      { accent: "orange", name: "العمل المشترك", slug: "work-rate" },
      { accent: "gold", name: "الربح والخسارة", slug: "profit-loss" },
      { accent: "turquoise", name: "الخلط", slug: "mixtures" },
      { accent: "cyan", name: "الإرث", slug: "inheritance" },
      { accent: "orange", name: "الساعة والزمن", slug: "clock-time" },
      { accent: "gold", name: "النسبة والتناسب", slug: "ratios-proportions" }
    ],
    worldId: "math"
  })
];

export const arabicTopics: TopicPillar[] = [
  createTopic({
    accent: "turquoise",
    name: "التناظر اللفظي",
    slug: "verbal-analogy",
    worldId: "arabic"
  }),
  createTopic({
    accent: "cyan",
    name: "إكمال الجمل",
    slug: "sentence-completion",
    worldId: "arabic"
  }),
  createTopic({
    accent: "orange",
    name: "الخطأ السياقي",
    slug: "contextual-error",
    worldId: "arabic"
  }),
  createTopic({
    accent: "gold",
    name: "المفردة الشاذة",
    slug: "odd-word",
    worldId: "arabic"
  }),
  createTopic({
    accent: "turquoise",
    name: "استيعاب المقروء",
    slug: "reading-comprehension",
    worldId: "arabic"
  })
];

export const careerWorlds: CareerWorld[] = [
  {
    description:
      "ابدأ من الأساس، وابن مهارتك في كل محور كمي حتى يصبح التقدم واضحا ومقروءا.",
    id: "math",
    label: "الرياضيات",
    title: "عالم الرياضيات",
    topics: mathTopics
  },
  {
    description:
      "درّب لغتك في مسارات لفظية واضحة، وكل محور يبدأ من 0% حتى تتكون صورة الإتقان مع الوقت.",
    id: "arabic",
    label: "العربي",
    title: "عالم العربي",
    topics: arabicTopics
  }
];

export const findCareerWorld = (worldId: CareerWorldId) => {
  return careerWorlds.find((world) => world.id === worldId) ?? null;
};

export const findTopic = (worldId: CareerWorldId, topicSlug: string) => {
  return (
    findCareerWorld(worldId)?.topics.find(
      (topic) => topic.routeSlug === topicSlug
    ) ?? null
  );
};
