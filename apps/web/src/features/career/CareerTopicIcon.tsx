import type { CareerWorldId } from "./career.types";

const iconBasePath = "/assets/career";

const quantitativeIcons: Record<string, string> = {
  algebra: "Algebra.png",
  arithmetic: "Arithmetic.png",
  geometry: "Geometry.png",
  statistics: "Probability.png",
  "visual-patterns": "Pattern Recognition.png",
  "quantitative-comparison": "Quantitative Comparison.png",
  "word-problems": "Word Problems.png"
};

const verbalImageIcons: Record<string, string> = {
  "odd-word": "Odd Word Out.png",
  "reading-comprehension": "Reading Comprehension.png"
};

export function CareerTopicIcon({
  subject,
  topicSlug
}: {
  subject: CareerWorldId;
  topicSlug: string;
}) {
  const imageFile =
    subject === "math"
      ? quantitativeIcons[topicSlug]
      : verbalImageIcons[topicSlug];

  if (imageFile) {
    return (
      <span
        aria-hidden="true"
        className={`career-topic-icon career-topic-icon-image career-topic-icon-${topicSlug}`}
      >
        <img alt="" src={`${iconBasePath}/${imageFile}`} />
      </span>
    );
  }

  if (topicSlug === "verbal-analogy") {
    return (
      <span
        aria-hidden="true"
        className="career-topic-icon career-icon-analogy career-topic-icon-verbal-analogy"
      >
        علم : عمل
      </span>
    );
  }

  if (topicSlug === "sentence-completion") {
    return (
      <span
        aria-hidden="true"
        className="career-topic-icon career-icon-sentence career-topic-icon-sentence-completion"
      >
        <span>اكمل</span>
        <span>الجملة</span>
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="career-topic-icon career-icon-error career-topic-icon-contextual-error"
    >
      الخطأ
    </span>
  );
}
