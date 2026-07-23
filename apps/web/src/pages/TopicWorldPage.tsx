import { findCareerWorld, findTopic } from "../features/career/careerData";
import type { CareerWorldId } from "../features/career/career.types";
import { TopicWorld } from "../features/topic-world/TopicWorld";
import { PlaceholderPage } from "./PlaceholderPage";

export function TopicWorldPage({
  subjectSlug,
  topicSlug
}: {
  subjectSlug: CareerWorldId;
  topicSlug: string | null;
}) {
  const world = findCareerWorld(subjectSlug);
  const topic = topicSlug ? findTopic(subjectSlug, topicSlug) : null;

  if (!world || (topicSlug && !topic)) {
    return (
      <PlaceholderPage
        description="هذا المسار غير معروف في هيكل المحاور الحالي."
        eyebrow="مسار غير متاح"
        title="لم يتم العثور على المحور"
      />
    );
  }

  return <TopicWorld topic={topic} world={world} />;
}
