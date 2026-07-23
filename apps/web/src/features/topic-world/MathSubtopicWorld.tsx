import { findCareerWorld, mathTopics } from "../career/careerData";
import type { TopicPillar } from "../career/career.types";
import { MapCanvas } from "./MapCanvas";

export function MathSubtopicWorld({
  selectedTopic
}: {
  selectedTopic: TopicPillar;
}) {
  const world = findCareerWorld("math");

  return world ? (
    <MapCanvas selectedTopic={selectedTopic} topics={mathTopics} world={world} />
  ) : null;
}
