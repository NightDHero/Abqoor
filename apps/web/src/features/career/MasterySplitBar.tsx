import type { CSSProperties } from "react";
import { formatPercent } from "../../utils/format";
import { navigateTo } from "../../utils/router";
import { CareerTopicIcon } from "./CareerTopicIcon";
import type { CareerWorldId, TopicPillar } from "./career.types";

const percentageFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

const clampPercentage = (value: number) => {
  return Math.min(Math.max(value, 0), 100);
};

export function MasterySplitBar({
  side,
  topic
}: {
  side: CareerWorldId;
  topic: TopicPillar;
}) {
  const mastery = clampPercentage(topic.masteryPercent);
  const fillStyle = {
    "--split-mastery-value": `${mastery}%`
  } as CSSProperties;
  const percentageLabel = `${percentageFormatter.format(mastery)}%`;

  return (
    <button
      aria-label={`فتح ${topic.name}، نسبة الإتقان ${formatPercent(mastery)}`}
      className={`split-mastery-entry split-mastery-entry-${side}`}
      style={fillStyle}
      type="button"
      onClick={() => navigateTo(topic.route)}
    >
      <span aria-hidden="true" className="split-mastery-fill" />
      <span className="split-mastery-primary">
        <span className="split-mastery-icon-area">
          <CareerTopicIcon subject={side} topicSlug={topic.routeSlug} />
        </span>
        <span className="split-mastery-name">{topic.name}</span>
      </span>
      <strong className="split-mastery-value" dir="ltr">
        {percentageLabel}
      </strong>
    </button>
  );
}
