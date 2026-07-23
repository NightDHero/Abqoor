import type { TopicPillar } from "../career/career.types";
import type { CareerWorld } from "../career/career.types";
import { CareerTopicIcon } from "../career/CareerTopicIcon";
import {
  formatWorldPercent,
  type WorldPoint
} from "./mathWorldLayout";

export function MathHub({
  onSelectTopic,
  position,
  topics,
  world
}: {
  onSelectTopic: (topic: TopicPillar) => void;
  position: WorldPoint;
  topics: TopicPillar[];
  world: CareerWorld;
}) {
  return (
    <section
      aria-label={`المحور المركزي للعالم ${world.label}`}
      className={`math-world-hub math-world-hub-${world.id}`}
      style={{
        left: position.x,
        top: position.y
      }}
    >
      <p>عالم عبقور</p>
      <h2>{world.id === "math" ? "الكمي" : "اللفظي"}</h2>
      <div className="math-world-hub-rows">
        {topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={(event) => {
              if (event.detail <= 1) {
                onSelectTopic(topic);
              }
            }}
          >
            <span className="math-world-hub-icon">
              <CareerTopicIcon subject={world.id} topicSlug={topic.routeSlug} />
            </span>
            <span>{topic.name}</span>
            <strong dir="ltr">
              {formatWorldPercent(topic.masteryPercent)}
            </strong>
          </button>
        ))}
      </div>
    </section>
  );
}
