import type { TopicPillar } from "../career/career.types";

export type WorldPoint = {
  x: number;
  y: number;
};

export type TopicStationLayout = {
  position: WorldPoint;
  topic: TopicPillar;
};

export const MATH_WORLD_SIZE = {
  height: 2500,
  width: 3600
} as const;

export const MATH_HUB_POSITION: WorldPoint = {
  x: 2080,
  y: 1260
};

export const WORLD_DIVIDER_X = 1030;

export const VERBAL_WORLD_BOUNDARY = {
  height: 2060,
  width: 940,
  x: 70,
  y: 190
} as const;

const FEATURED_DIRECTIONS = [-145, -100, -55, -10, 35, 100, 155];
const STATION_DISTANCE = 900;
const percentageFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

const degreesToRadians = (degrees: number) => {
  return (degrees * Math.PI) / 180;
};

export const createTopicStationLayout = (
  topics: TopicPillar[]
): TopicStationLayout[] => {
  return topics.map((topic, index) => {
    const fallbackStep = 360 / Math.max(topics.length, 1);
    const angle =
      FEATURED_DIRECTIONS[index] ?? -90 + fallbackStep * index;
    const radians = degreesToRadians(angle);

    return {
      position: {
        x: Math.round(MATH_HUB_POSITION.x + Math.cos(radians) * STATION_DISTANCE),
        y: Math.round(MATH_HUB_POSITION.y + Math.sin(radians) * STATION_DISTANCE)
      },
      topic
    };
  });
};

export const distanceBetween = (start: WorldPoint, end: WorldPoint) => {
  return Math.hypot(end.x - start.x, end.y - start.y);
};

export const trailGapForRectangle = (
  center: WorldPoint,
  toward: WorldPoint,
  halfWidth: number,
  halfHeight: number,
  clearance = 18
) => {
  const distance = Math.max(distanceBetween(center, toward), 1);
  const directionX = Math.abs((toward.x - center.x) / distance);
  const directionY = Math.abs((toward.y - center.y) / distance);
  const horizontalEdge =
    directionX > 0 ? halfWidth / directionX : Number.POSITIVE_INFINITY;
  const verticalEdge =
    directionY > 0 ? halfHeight / directionY : Number.POSITIVE_INFINITY;

  return Math.min(horizontalEdge, verticalEdge) + clearance;
};

export const formatWorldPercent = (value: number) => {
  const percentage = Math.min(Math.max(value, 0), 100);
  return `${percentageFormatter.format(percentage)}%`;
};

export const shortenTrail = (
  start: WorldPoint,
  end: WorldPoint,
  startGap: number,
  endGap: number
) => {
  const distance = Math.max(distanceBetween(start, end), 1);
  const directionX = (end.x - start.x) / distance;
  const directionY = (end.y - start.y) / distance;

  return {
    end: {
      x: end.x - directionX * endGap,
      y: end.y - directionY * endGap
    },
    start: {
      x: start.x + directionX * startGap,
      y: start.y + directionY * startGap
    }
  };
};
