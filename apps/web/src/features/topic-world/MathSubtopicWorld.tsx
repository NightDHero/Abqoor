import { mathTopics } from "../career/careerData";
import type { TopicPillar } from "../career/career.types";
import { MapCanvas } from "./MapCanvas";

export function MathSubtopicWorld({
  selectedTopic
}: {
  selectedTopic: TopicPillar;
}) {
  return <MapCanvas selectedTopic={selectedTopic} topics={mathTopics} />;
}
