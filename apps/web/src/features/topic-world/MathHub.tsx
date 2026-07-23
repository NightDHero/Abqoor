import type { TopicPillar } from "../career/career.types";
import {
  formatWorldPercent,
  type WorldPoint
} from "./mathWorldLayout";

export function MathHub({
  onSelectTopic,
  position,
  topics
}: {
  onSelectTopic: (topic: TopicPillar) => void;
  position: WorldPoint;
  topics: TopicPillar[];
}) {
  return (
    <section
      aria-label="المحور المركزي للعالم الكمي"
      className="math-world-hub"
      style={{
        left: position.x,
        top: position.y
      }}
    >
      <h2>الكمي</h2>
      <div className="math-world-hub-rows">
        {topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onSelectTopic(topic)}
          >
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
