import { findCareerWorld, findTopic } from "../features/career/careerData";
import type { CareerWorldId } from "../features/career/career.types";
import { TopicWorld } from "../features/topic-world/TopicWorld";
import { PlaceholderPage } from "./PlaceholderPage";

export function TopicWorldPage({
  subjectSlug,
  topicSlug
}: {
  subjectSlug: CareerWorldId;
  topicSlug: string;
}) {
  const world = findCareerWorld(subjectSlug);
  const topic = findTopic(subjectSlug, topicSlug);

  if (!world || !topic) {
    return (
      <PlaceholderPage
        description="هذا المسار غير معروف في هيكل المحاور الحالي."
        eyebrow="مسار غير متاح"
        title="لم يتم العثور على العالم"
      />
    );
  }

  return <TopicWorld topic={topic} world={world} />;
}
