import type { CareerWorldId } from "../career/career.types";

export function WorldBoundary({ worldId }: { worldId: CareerWorldId }) {
  return (
    <div
      aria-hidden="true"
      className={`learning-world-boundary learning-world-boundary-${worldId}`}
    >
      <span>{worldId === "math" ? "الكمي" : "اللفظي"}</span>
      <i />
      <i />
      <i />
    </div>
  );
}
