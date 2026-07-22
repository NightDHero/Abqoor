import { findCareerWorld, findTopic } from "../features/career/careerData";
import type { CareerWorldId } from "../features/career/career.types";
import { PracticeSession } from "../features/practice/PracticeSession";
import { PlaceholderPage } from "./PlaceholderPage";

export function PracticePage({
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

  if (!world || !topic || (subtopicSlug && !subtopic)) {
    return (
      <PlaceholderPage
        description="هذا المسار غير معروف في هيكل التدريب الحالي."
        eyebrow="مسار غير متاح"
        title="لم يتم العثور على التدريب"
      />
    );
  }

  return <PracticeSession subtopic={subtopic} topic={topic} world={world} />;
}
