import type { CareerWorld, TopicPillar } from "../career/career.types";
import { MapCanvas } from "./MapCanvas";

export function TopicWorld({
  topic,
  world
}: {
  topic: TopicPillar;
  world: CareerWorld;
}) {
  return (
    <MapCanvas
      selectedTopic={topic}
      topics={world.topics}
      world={world}
    />
  );
}
