import { formatPercent } from "../../utils/format";
import { navigateTo } from "../../utils/router";
import type { SubtopicPillar as SubtopicPillarData } from "../career/career.types";

export function SubtopicPillar({
  subtopic
}: {
  subtopic: SubtopicPillarData;
}) {
  return (
    <button
      className="subtopic-pillar"
      type="button"
      onClick={() => navigateTo(subtopic.route)}
    >
      <span className="subtopic-pill-content">
        <strong>{subtopic.name}</strong>
        <span>{formatPercent(subtopic.masteryPercent)}</span>
      </span>
    </button>
  );
}
