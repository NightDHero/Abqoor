import {
  MATH_WORLD_SIZE,
  VERBAL_WORLD_BOUNDARY,
  WORLD_DIVIDER_X
} from "./mathWorldLayout";

export function WorldBoundary() {
  const boundary = VERBAL_WORLD_BOUNDARY;

  return (
    <>
      <div aria-hidden="true" className="math-map-zone math-map-zone-verbal">
        <span>اللفظي</span>
      </div>
      <div aria-hidden="true" className="math-map-zone math-map-zone-math">
        <span>الكمي</span>
      </div>
      <svg
        aria-hidden="true"
        className="math-world-boundaries"
        height={MATH_WORLD_SIZE.height}
        viewBox={`0 0 ${MATH_WORLD_SIZE.width} ${MATH_WORLD_SIZE.height}`}
        width={MATH_WORLD_SIZE.width}
      >
        <path
          className="verbal-world-box"
          d={[
            `M ${boundary.x} 0`,
            `L ${boundary.x} ${boundary.y + boundary.height}`,
            `L ${WORLD_DIVIDER_X} ${boundary.y + boundary.height}`,
            `M ${boundary.x} ${boundary.y}`,
            `L ${WORLD_DIVIDER_X} ${boundary.y}`
          ].join(" ")}
        />
        <path
          className="world-center-divider"
          d={`M ${WORLD_DIVIDER_X} 0 L ${WORLD_DIVIDER_X} ${MATH_WORLD_SIZE.height}`}
        />
      </svg>
    </>
  );
}
