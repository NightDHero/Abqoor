import { formatPercent } from "../../utils/format";
import { CareerTopicIcon } from "../career/CareerTopicIcon";
import type { CareerWorldId, TopicPillar } from "../career/career.types";
import {
  formatWorldPercent,
  type WorldPoint
} from "./mathWorldLayout";

export function TopicStation({
  active,
  onEnterSubtopic,
  onResetGesture,
  onFocus,
  onHover,
  position,
  topic,
  worldId
}: {
  active: boolean;
  onEnterSubtopic: (route: string) => void;
  onResetGesture: () => void;
  onFocus: () => void;
  onHover: (isHovering: boolean) => void;
  position: WorldPoint;
  topic: TopicPillar;
  worldId: CareerWorldId;
}) {
  const subtopics = topic.subtopics ?? [];

  return (
    <section
      aria-current={active ? "page" : undefined}
      aria-label={`محطة ${topic.name}`}
      className={`math-topic-station math-topic-station-${worldId} ${active ? "is-active" : ""}`}
      data-topic-slug={topic.routeSlug}
      style={{
        left: position.x,
        top: position.y
      }}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
    >
      <header className="math-topic-station-header">
        <span className="math-topic-station-icon">
          <CareerTopicIcon subject={worldId} topicSlug={topic.routeSlug} />
        </span>
        <button
          className="math-topic-station-heading"
          type="button"
          onClick={(event) => {
            if (event.detail <= 1) {
              onFocus();
            } else {
              onResetGesture();
            }
          }}
        >
          {topic.name}
        </button>
        <strong dir="ltr">{formatWorldPercent(topic.masteryPercent)}</strong>
      </header>

      {subtopics.length > 0 ? (
        <div className="math-topic-station-bars">
          {subtopics.map((subtopic) => (
            <button
              aria-label={`فتح ${subtopic.name}، نسبة الإتقان ${formatPercent(
                subtopic.masteryPercent
              )}`}
              className="math-station-progress"
              key={subtopic.id}
              type="button"
              onClick={(event) => {
                if (event.detail <= 1) {
                  onEnterSubtopic(subtopic.route);
                } else {
                  onResetGesture();
                }
              }}
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
      ) : (
        <button
          className="math-station-direct-entry"
          type="button"
          onClick={(event) => {
            if (event.detail <= 1) {
              onEnterSubtopic(topic.practiceRoute);
            } else {
              onResetGesture();
            }
          }}
        >
          <span>ابدأ التدرّب على هذا المحور</span>
          <strong aria-hidden="true">←</strong>
        </button>
      )}
    </section>
  );
}
