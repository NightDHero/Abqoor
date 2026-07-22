import { findCareerWorld, findTopic } from "../features/career/careerData";
import type { CareerWorldId } from "../features/career/career.types";
import { QuestionBrowser } from "../features/browser/QuestionBrowser";
import { PlaceholderPage } from "./PlaceholderPage";

export function BrowsePage({
  subjectSlug,
  subtopicSlug,
  topicSlug
}: {
  subjectSlug: CareerWorldId;
  subtopicSlug?: string;
  topicSlug: string;
}) {
  const world = findCareerWorld(subjectSlug);
  const topic = findTopic(subjectSlug, topicSlug);
  const subtopic = topic?.subtopics?.find(
    (candidate) => candidate.routeSlug === subtopicSlug
  );

  if (!world || !topic || (subjectSlug === "math" && !subtopic)) {
    return (
      <PlaceholderPage
        description="هذا المسار غير معروف في نظام التصفح الحالي."
        eyebrow="مسار غير متاح"
        title="لم يتم العثور على المتصفح"
      />
    );
  }

  const initialQuestionId =
    new URLSearchParams(window.location.search).get("question") ?? undefined;

  return (
    <QuestionBrowser
      initialQuestionId={initialQuestionId}
      subtopic={subtopic}
      topic={topic}
      world={world}
    />
  );
}
