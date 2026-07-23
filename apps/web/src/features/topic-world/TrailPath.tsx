import type { WorldPoint } from "./mathWorldLayout";
import { shortenTrail } from "./mathWorldLayout";

const curvedPath = (
  start: WorldPoint,
  end: WorldPoint,
  curveDirection: number
) => {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const distance = Math.max(Math.hypot(deltaX, deltaY), 1);
  const normalX = -deltaY / distance;
  const normalY = deltaX / distance;
  const curve = Math.min(distance * 0.24, 160) * curveDirection;
  const controlOne = {
    x: start.x + deltaX * 0.34 + normalX * curve,
    y: start.y + deltaY * 0.34 + normalY * curve
  };
  const controlTwo = {
    x: start.x + deltaX * 0.68 + normalX * curve,
    y: start.y + deltaY * 0.68 + normalY * curve
  };

  return [
    `M ${start.x} ${start.y}`,
    `C ${controlOne.x} ${controlOne.y}`,
    `${controlTwo.x} ${controlTwo.y}`,
    `${end.x} ${end.y}`
  ].join(" ");
};

export function TrailPath({
  active,
  curveDirection,
  end,
  endGap = 270,
  start,
  startGap = 270,
  variant
}: {
  active: boolean;
  curveDirection: number;
  end: WorldPoint;
  endGap?: number;
  start: WorldPoint;
  startGap?: number;
  variant: "hub" | "ring";
}) {
  const shortened = shortenTrail(start, end, startGap, endGap);
  const path = curvedPath(
    shortened.start,
    shortened.end,
    curveDirection
  );

  return (
    <g
      className={[
        "world-trail",
        `world-trail-${variant}`,
        active ? "is-active" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <path className="world-trail-glow" d={path} />
      <path className="world-trail-line" d={path} />
    </g>
  );
}
