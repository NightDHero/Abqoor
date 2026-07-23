import { formatPercent } from "../../utils/format";
import type { TopicPillar } from "../career/career.types";
import {
  formatWorldPercent,
  type WorldPoint
} from "./mathWorldLayout";

export function TopicStation({
  active,
  onEnterSubtopic,
  onFocus,
  onHover,
  position,
  topic
}: {
  active: boolean;
  onEnterSubtopic: (route: string) => void;
  onFocus: () => void;
  onHover: (isHovering: boolean) => void;
  position: WorldPoint;
  topic: TopicPillar;
}) {
  const subtopics = topic.subtopics ?? [];

  return (
    <section
      aria-current={active ? "page" : undefined}
      aria-label={`محطة ${topic.name}`}
      className={`math-topic-station ${active ? "is-active" : ""}`}
      data-topic-slug={topic.routeSlug}
      style={{
        left: position.x,
        top: position.y
      }}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
    >
      <button
        className="math-topic-station-heading"
        type="button"
        onClick={onFocus}
      >
        {topic.name}
      </button>

      <div className="math-topic-station-bars">
        {subtopics.map((subtopic) => (
          <button
            aria-label={`فتح ${subtopic.name}، نسبة الإتقان ${formatPercent(
              subtopic.masteryPercent
            )}`}
            className="math-station-progress"
            key={subtopic.id}
            type="button"
            onClick={() => onEnterSubtopic(subtopic.route)}
          >
            <span
              aria-hidden="true"
              className="math-station-progress-fill"
              style={{ width: `${subtopic.masteryPercent}%` }}
            />
            <span className="math-station-progress-name">
              {subtopic.name}
            </span>
            <strong dir="ltr">
              {formatWorldPercent(subtopic.masteryPercent)}
            </strong>
          </button>
        ))}
      </div>
    </section>
  );
}
