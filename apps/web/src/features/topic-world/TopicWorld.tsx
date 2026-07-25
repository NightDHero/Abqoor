import type { CareerWorld, TopicPillar } from "../career/career.types";
import { CareerTopicIcon } from "../career/CareerTopicIcon";
import { navigateTo } from "../../utils/router";
import { MasteryProgressRow } from "./MasteryProgressRow";

export function TopicWorld({
  topic,
  world
}: {
  topic: TopicPillar | null;
  world: CareerWorld;
}) {
  const isMath = world.id === "math";
  const isTopicDirectory = isMath && topic;
  const eyebrow = isTopicDirectory ? `الكمي / ${topic.name}` : null;
  const title = isTopicDirectory
    ? topic.name
    : world.label;

  const items = isTopicDirectory ? topic.subtopics ?? [] : world.topics;

  return (
    <section
      className={`topic-directory topic-directory-${world.id}`}
      aria-labelledby="topic-directory-title"
    >
      <header className="topic-directory-hero">
        <div>
          {eyebrow ? <p>{eyebrow}</p> : null}
          <h1 id="topic-directory-title">{title}</h1>
          <span className="topic-directory-mastery">٠٪ إتقان</span>
        </div>
      </header>

      <div className="topic-directory-list">
        {items.map((item, index) => {
          const isSubtopic = item.type === "subtopic";
          const destination = isSubtopic
            ? item.route
            : world.id === "arabic"
              ? item.practiceRoute
              : item.route;

          return (
            <MasteryProgressRow
              animationIndex={index}
              key={item.id}
              masteryPercent={item.masteryPercent}
              name={item.name}
              onActivate={() => navigateTo(destination)}
              icon={
                isSubtopic ? null : (
                  <CareerTopicIcon
                    subject={world.id}
                    topicSlug={item.routeSlug}
                  />
                )
              }
              variant={isSubtopic ? "subtopic" : "topic"}
            />
          );
        })}
      </div>
    </section>
  );
}
