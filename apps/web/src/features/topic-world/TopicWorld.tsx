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
  const eyebrow = isTopicDirectory
    ? `الكمي / ${topic.name}`
    : "مسارات الإتقان";
  const title = isTopicDirectory
    ? topic.name
    : isMath
      ? "المحاور الكمية"
      : "المحاور اللفظية";
  const description = isTopicDirectory
    ? "اختر المهارة التي تريد تطويرها. تقدمك في كل مهارة يظهر هنا بصورة مستقلة."
    : isMath
      ? "ابدأ من المحور الأقرب إلى هدفك، ثم انتقل إلى مهاراته التفصيلية."
      : "اختر المحور اللفظي الذي تريد تدريبه وابدأ التصفح مباشرة.";

  const items = isTopicDirectory ? topic.subtopics ?? [] : world.topics;

  return (
    <section
      className={`topic-directory topic-directory-${world.id}`}
      aria-labelledby="topic-directory-title"
    >
      <header className="topic-directory-hero">
        <div>
          <p>{eyebrow}</p>
          <h1 id="topic-directory-title">{title}</h1>
          <span>{description}</span>
        </div>
        <dl className="topic-directory-summary">
          <div>
            <dt>{isTopicDirectory ? "المهارات" : "المحاور"}</dt>
            <dd>{items.length}</dd>
          </div>
          <div>
            <dt>الإتقان الحالي</dt>
            <dd>٠٪</dd>
          </div>
        </dl>
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
              index={index + 1}
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
